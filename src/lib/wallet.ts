import {
  AccountType,
  LotStatus,
  PaymentMethod,
  Prisma,
  PrismaClient,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { prisma } from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Solde insuffisant pour effectuer ce paiement.");
    this.name = "InsufficientBalanceError";
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} introuvable.`);
    this.name = "NotFoundError";
  }
}

export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateError";
  }
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Mode festival : sans PIN pour payer, le seul rempart est un plafond par
// transaction (comme le sans-contact bancaire), pas un contrôle par code.
export const MAX_WRISTBAND_PAYMENT_CENTS = 5000;

/** Solde actif d'un portefeuille : somme des lots ACTIFS et non expirés. */
export async function getBalanceCents(db: Db, walletId: string): Promise<number> {
  const result = await db.gatinelleLot.aggregate({
    where: {
      walletId,
      status: LotStatus.ACTIVE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    _sum: { remainingCents: true },
  });
  return result._sum.remainingCents ?? 0;
}

/**
 * Crée un lot de gâtinelles suite à un achat complété.
 * La péremption à 1 an ne s'applique qu'aux portefeuilles PARTICULIER.
 */
export async function createPurchaseLot(
  db: Db,
  walletId: string,
  ownerAccountType: AccountType,
  amountCents: number,
  sourceTransactionId: string,
  now: Date = new Date()
) {
  const expiresAt =
    ownerAccountType === AccountType.PARTICULIER
      ? new Date(now.getTime() + ONE_YEAR_MS)
      : null;

  return db.gatinelleLot.create({
    data: {
      walletId,
      amountCents,
      remainingCents: amountCents,
      acquiredAt: now,
      expiresAt,
      status: LotStatus.ACTIVE,
      sourceTransactionId,
    },
  });
}

/**
 * Valide un achat en attente (espèces ou virement) et crédite le portefeuille
 * de l'acheteur. Réservé aux comptes AGENT/ADMIN pour les espèces, ADMIN pour
 * les virements (vérifié par l'appelant).
 */
export async function validatePurchase(transactionId: string, validatorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { toUser: { include: { wallet: true } } },
    });
    if (!transaction) throw new NotFoundError("Transaction");
    if (transaction.type !== TransactionType.PURCHASE) {
      throw new InvalidStateError("Cette transaction n'est pas un achat.");
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new InvalidStateError("Cet achat a déjà été traité.");
    }
    if (!transaction.toUser?.wallet) {
      throw new NotFoundError("Portefeuille de l'acheteur");
    }

    const now = new Date();
    await createPurchaseLot(
      tx,
      transaction.toUser.wallet.id,
      transaction.toUser.accountType,
      transaction.amountCents,
      transaction.id,
      now
    );

    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.COMPLETED,
        validatedById: validatorUserId,
        validatedAt: now,
      },
    });
  });
}

/**
 * Consomme les lots du payeur les plus proches de l'expiration en premier,
 * puis crédite un lot sans expiration côté destinataire (les gâtinelles
 * détenues par un commerçant n'expirent jamais). Partagé par payMerchant
 * (paiement par code) et payMerchantByWristband (paiement par bracelet NFC).
 */
async function transferGatinelles(
  tx: Db,
  buyerUserId: string,
  buyerWalletId: string,
  recipientUserId: string,
  recipientWalletId: string,
  amountCents: number
) {
  const now = new Date();
  const activeLots = await tx.gatinelleLot.findMany({
    where: {
      walletId: buyerWalletId,
      status: LotStatus.ACTIVE,
      remainingCents: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }],
  });

  let remainingToSpend = amountCents;
  for (const lot of activeLots) {
    if (remainingToSpend <= 0) break;
    const draw = Math.min(lot.remainingCents, remainingToSpend);
    // Décrément gardé : la clause remainingCents >= draw est réévaluée par
    // Postgres sur la valeur réelle au moment de l'écriture (pas sur notre
    // lecture initiale), ce qui empêche deux paiements concurrents de vider
    // le même lot en double (double dépense).
    const result = await tx.gatinelleLot.updateMany({
      where: { id: lot.id, remainingCents: { gte: draw } },
      data: { remainingCents: { decrement: draw } },
    });
    if (result.count === 0) {
      throw new InsufficientBalanceError();
    }
    remainingToSpend -= draw;
  }

  if (remainingToSpend > 0) {
    throw new InsufficientBalanceError();
  }

  const transaction = await tx.transaction.create({
    data: {
      type: TransactionType.PAYMENT,
      fromUserId: buyerUserId,
      toUserId: recipientUserId,
      amountCents,
      status: TransactionStatus.COMPLETED,
      validatedAt: now,
    },
  });

  await tx.gatinelleLot.create({
    data: {
      walletId: recipientWalletId,
      amountCents,
      remainingCents: amountCents,
      acquiredAt: now,
      expiresAt: null,
      status: LotStatus.ACTIVE,
      sourceTransactionId: transaction.id,
    },
  });

  return transaction;
}

/** Paiement d'un particulier (ou tout portefeuille) vers un commerçant, identifié par son code. */
export async function payMerchant(
  buyerUserId: string,
  merchantCode: string,
  amountCents: number
) {
  if (amountCents <= 0) {
    throw new InvalidStateError("Le montant doit être positif.");
  }

  return prisma.$transaction(async (tx) => {
    const buyer = await tx.user.findUnique({
      where: { id: buyerUserId },
      include: { wallet: true },
    });
    if (!buyer?.wallet) throw new NotFoundError("Portefeuille de l'acheteur");

    const merchantProfile = await tx.merchantProfile.findUnique({
      where: { merchantCode },
      include: { user: { include: { wallet: true } } },
    });
    if (!merchantProfile || !merchantProfile.validated) {
      throw new NotFoundError("Commerçant agréé");
    }
    if (!merchantProfile.user.wallet) {
      throw new NotFoundError("Portefeuille du commerçant");
    }
    if (merchantProfile.userId === buyerUserId) {
      throw new InvalidStateError("Impossible de se payer soi-même.");
    }

    return transferGatinelles(
      tx,
      buyerUserId,
      buyer.wallet.id,
      merchantProfile.userId,
      merchantProfile.user.wallet.id,
      amountCents
    );
  });
}

/**
 * Paiement au stand en mode festival : l'acheteur est identifié par le
 * numéro de série de son bracelet/carte NFC (pas par sa session), le
 * destinataire est le stand authentifié. Sans PIN, plafonné par transaction
 * (MAX_WRISTBAND_PAYMENT_CENTS) pour compenser l'absence de contrôle par code.
 */
export async function payMerchantByWristband(
  standUserId: string,
  tagUid: string,
  amountCents: number
) {
  if (amountCents <= 0) {
    throw new InvalidStateError("Le montant doit être positif.");
  }
  if (amountCents > MAX_WRISTBAND_PAYMENT_CENTS) {
    throw new InvalidStateError(
      `Le paiement par bracelet est limité à ${(MAX_WRISTBAND_PAYMENT_CENTS / 100).toFixed(2)} € par transaction.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const nfcTag = await tx.nfcTag.findUnique({
      where: { tagUid },
      include: { user: { include: { wallet: true } } },
    });
    const buyer = nfcTag?.user;
    if (!buyer?.wallet) throw new NotFoundError("Bracelet");

    const stand = await tx.user.findUnique({
      where: { id: standUserId },
      include: { wallet: true, merchantProfile: true },
    });
    if (!stand?.merchantProfile?.validated) {
      throw new NotFoundError("Stand agréé");
    }
    if (!stand.wallet) throw new NotFoundError("Portefeuille du stand");
    if (buyer.id === standUserId) {
      throw new InvalidStateError("Impossible de se payer soi-même.");
    }

    return transferGatinelles(
      tx,
      buyer.id,
      buyer.wallet.id,
      standUserId,
      stand.wallet.id,
      amountCents
    );
  });
}

/** Un commerçant demande la reconversion de gâtinelles en euros. */
export async function requestConversion(merchantUserId: string, amountCents: number) {
  if (amountCents <= 0) {
    throw new InvalidStateError("Le montant doit être positif.");
  }

  return prisma.$transaction(async (tx) => {
    const merchant = await tx.user.findUnique({
      where: { id: merchantUserId },
      include: { wallet: true, merchantProfile: true },
    });
    if (!merchant?.wallet || !merchant.merchantProfile) {
      throw new NotFoundError("Profil commerçant");
    }

    const now = new Date();
    const activeLots = await tx.gatinelleLot.findMany({
      where: {
        walletId: merchant.wallet.id,
        status: LotStatus.ACTIVE,
        remainingCents: { gt: 0 },
      },
      orderBy: { acquiredAt: "asc" },
    });

    let remainingToConvert = amountCents;
    for (const lot of activeLots) {
      if (remainingToConvert <= 0) break;
      const draw = Math.min(lot.remainingCents, remainingToConvert);
      // Décrément gardé (voir payMerchant) : empêche deux demandes de
      // reconversion concurrentes de vider le même lot en double.
      const result = await tx.gatinelleLot.updateMany({
        where: { id: lot.id, remainingCents: { gte: draw } },
        data: { remainingCents: { decrement: draw } },
      });
      if (result.count === 0) {
        throw new InsufficientBalanceError();
      }
      // Relit la valeur réelle (pas notre lecture initiale, potentiellement
      // périmée) pour décider si le lot est entièrement converti.
      const refreshed = await tx.gatinelleLot.findUniqueOrThrow({ where: { id: lot.id } });
      if (refreshed.remainingCents === 0) {
        await tx.gatinelleLot.update({
          where: { id: lot.id },
          data: { status: LotStatus.CONVERTED },
        });
      }
      remainingToConvert -= draw;
    }

    if (remainingToConvert > 0) {
      throw new InsufficientBalanceError();
    }

    return tx.transaction.create({
      data: {
        type: TransactionType.CONVERSION,
        fromUserId: merchantUserId,
        toUserId: null,
        amountCents,
        status: TransactionStatus.PENDING,
      },
    });
  });
}

/** L'admin marque une demande de reconversion comme payée (virement effectué). */
export async function completeConversion(transactionId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundError("Transaction");
    if (transaction.type !== TransactionType.CONVERSION) {
      throw new InvalidStateError("Cette transaction n'est pas une reconversion.");
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new InvalidStateError("Cette reconversion a déjà été traitée.");
    }

    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.COMPLETED,
        validatedById: adminUserId,
        validatedAt: new Date(),
      },
    });
  });
}

export interface ExpireLotsResult {
  walletsAffected: number;
  totalExpiredCents: number;
}

/**
 * Fait passer en EXPIRED tous les lots ACTIFS dont la date d'expiration est
 * dépassée (uniquement des lots de particuliers, les lots commerçants ayant
 * expiresAt = null). Journalise une Transaction EXPIRY par portefeuille
 * concerné.
 */
export async function expireLots(now: Date = new Date()): Promise<ExpireLotsResult> {
  const expiredLots = await prisma.gatinelleLot.findMany({
    where: {
      status: LotStatus.ACTIVE,
      expiresAt: { not: null, lte: now },
    },
    include: { wallet: true },
  });

  const byWallet = new Map<string, { userId: string; totalCents: number; lotIds: string[] }>();
  for (const lot of expiredLots) {
    const entry = byWallet.get(lot.walletId) ?? {
      userId: lot.wallet.userId,
      totalCents: 0,
      lotIds: [],
    };
    entry.totalCents += lot.remainingCents;
    entry.lotIds.push(lot.id);
    byWallet.set(lot.walletId, entry);
  }

  let totalExpiredCents = 0;
  for (const [, entry] of byWallet) {
    await prisma.$transaction(async (tx) => {
      await tx.gatinelleLot.updateMany({
        where: { id: { in: entry.lotIds } },
        data: { status: LotStatus.EXPIRED },
      });
      await tx.transaction.create({
        data: {
          type: TransactionType.EXPIRY,
          fromUserId: entry.userId,
          toUserId: null,
          amountCents: entry.totalCents,
          status: TransactionStatus.COMPLETED,
          validatedAt: now,
        },
      });
    });
    totalExpiredCents += entry.totalCents;
  }

  return { walletsAffected: byWallet.size, totalExpiredCents };
}

export interface CirculationStats {
  totalPurchasedCents: number;
  totalExpiredCents: number;
  totalConvertedCents: number;
  totalCirculatingCents: number;
}

/** Masse en circulation = total émis - total expiré - total converti. */
export async function getCirculationStats(): Promise<CirculationStats> {
  const [purchased, expired, converted] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: TransactionType.PURCHASE, status: TransactionStatus.COMPLETED },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.EXPIRY },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.CONVERSION, status: TransactionStatus.COMPLETED },
      _sum: { amountCents: true },
    }),
  ]);

  const totalPurchasedCents = purchased._sum.amountCents ?? 0;
  const totalExpiredCents = expired._sum.amountCents ?? 0;
  const totalConvertedCents = converted._sum.amountCents ?? 0;

  return {
    totalPurchasedCents,
    totalExpiredCents,
    totalConvertedCents,
    totalCirculatingCents: totalPurchasedCents - totalExpiredCents - totalConvertedCents,
  };
}

export { PaymentMethod, TransactionStatus, TransactionType };
