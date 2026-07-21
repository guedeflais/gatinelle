import crypto from "crypto";
import bcrypt from "bcryptjs";
import { AccountType, GatineBoxStatus, Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "./prisma";
import { generateMerchantCode } from "./merchantCode";
import { createPurchaseLot, InsufficientBalanceError, InvalidStateError, NotFoundError } from "./wallet";

// Même seuil que MAX_PIN_ATTEMPTS (voir lib/pin.ts) : même rigueur exigée
// par le cahier des charges pour le code d'activation d'une Gâtine Box.
export const MAX_ACTIVATION_ATTEMPTS = 3;

const ACTIVATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I)

export interface GatineBoxCreationResult {
  boxNumber: string;
  activationCode: string;
}

/** Numéro de box : public, imprimé à l'extérieur — pas un secret. */
function generateBoxNumber(): string {
  return generateMerchantCode(8);
}

/**
 * Code d'activation : le vrai secret de la Gâtine Box, jamais stocké en
 * clair. Généré via crypto.randomInt (CSPRNG), jamais Math.random(), sur le
 * même principe que randomPassword()/randomPin() dans prisma/seed.mjs.
 */
function generateActivationCode(length = 12): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ACTIVATION_CODE_ALPHABET[crypto.randomInt(0, ACTIVATION_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Confection d'une Gâtine Box (réservée à l'administration) : associe une
 * carte NFC neuve à un numéro de box et un code d'activation. Seul le hash
 * du code est stocké ; le code en clair n'est retourné qu'une seule fois,
 * ici, jamais retrouvable ensuite.
 */
export async function manufactureGatineBox(
  adminUserId: string,
  nfcTagUid: string
): Promise<GatineBoxCreationResult> {
  const uid = nfcTagUid.trim().toUpperCase();
  if (!uid) throw new InvalidStateError("Numéro de série de la carte NFC requis.");

  // Vérification préalable (en plus de la contrainte unique en base) : une
  // carte déjà liée à un compte (mode festival) ou déjà utilisée pour une
  // autre box ne doit jamais être réutilisée silencieusement.
  const [existingTag, existingBox] = await Promise.all([
    prisma.nfcTag.findUnique({ where: { tagUid: uid } }),
    prisma.gatineBox.findUnique({ where: { nfcTagUid: uid } }),
  ]);
  if (existingTag || existingBox) {
    throw new InvalidStateError("Cette carte NFC est déjà utilisée.");
  }

  let attempts = 0;
  for (;;) {
    const boxNumber = generateBoxNumber();
    const activationCode = generateActivationCode();
    const activationCodeHash = await bcrypt.hash(activationCode, 10);

    try {
      await prisma.gatineBox.create({
        data: {
          boxNumber,
          nfcTagUid: uid,
          activationCodeHash,
          manufacturedById: adminUserId,
        },
      });
      return { boxNumber, activationCode };
    } catch (err) {
      attempts += 1;
      const isUniqueClash = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempts >= 5) throw err;
    }
  }
}

/**
 * Vente d'une Gâtine Box chez un commerçant agréé : enregistre le prix reçu
 * une seule fois, de façon définitive, et fait passer la box au statut
 * "vendue". Le commerçant n'a à aucun moment accès au code d'activation.
 */
export async function sellGatineBox(
  merchantProfileId: string,
  boxNumber: string,
  priceCents: number
) {
  if (priceCents <= 0) {
    throw new InvalidStateError("Le prix doit être positif.");
  }

  const box = await prisma.gatineBox.findUnique({ where: { boxNumber: boxNumber.trim().toUpperCase() } });
  if (!box) throw new NotFoundError("Gâtine Box");

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // Même idiome que payMerchant/requestConversion (voir lib/wallet.ts) :
    // la transition n'est appliquée que si le statut n'a pas déjà changé
    // entre-temps — empêche deux ventes concurrentes de la même box.
    const guard = await tx.gatineBox.updateMany({
      where: { id: box.id, status: GatineBoxStatus.MANUFACTURED },
      data: {
        status: GatineBoxStatus.SOLD,
        priceCents,
        soldByMerchantProfileId: merchantProfileId,
        soldAt: now,
      },
    });
    if (guard.count === 0) {
      throw new InvalidStateError("Cette Gâtine Box a déjà été vendue.");
    }

    return tx.gatineBox.findUniqueOrThrow({ where: { id: box.id } });
  });
}

/**
 * Activation d'une Gâtine Box par son bénéficiaire : vérifie le code
 * d'activation (hash comparé en temps constant via bcrypt.compare), puis
 * crédite atomiquement le compte, lie la carte NFC, et passe la box au
 * statut "activée" — protégé contre l'activation en double par le même
 * verrou de concurrence que la vente. Un compte Commerçant ne peut jamais
 * activer de box (règle 7.9).
 */
export async function activateGatineBox(
  beneficiaryUserId: string,
  boxNumber: string,
  activationCode: string
) {
  const beneficiary = await prisma.user.findUnique({
    where: { id: beneficiaryUserId },
    include: { wallet: true },
  });
  if (!beneficiary?.wallet) throw new NotFoundError("Portefeuille");
  if (beneficiary.accountType === AccountType.COMMERCANT) {
    throw new InvalidStateError("Un compte commerçant ne peut pas activer de Gâtine Box.");
  }

  const box = await prisma.gatineBox.findUnique({
    where: { boxNumber: boxNumber.trim().toUpperCase() },
  });
  // Même principe que attemptPinLogin (voir lib/pin.ts) : numéro inconnu ou
  // box bloquée renvoient la même erreur générique que "code invalide", pour
  // ne jamais indiquer si le numéro existe.
  if (!box || box.activationBlocked) {
    throw new InvalidStateError("Numéro de box ou code d'activation incorrect.");
  }
  if (box.status === GatineBoxStatus.MANUFACTURED) {
    throw new InvalidStateError("Cette Gâtine Box n'a pas encore été vendue.");
  }
  if (box.status === GatineBoxStatus.ACTIVATED) {
    throw new InvalidStateError("Cette Gâtine Box a déjà été activée.");
  }

  const valid = await bcrypt.compare(activationCode, box.activationCodeHash);
  if (!valid) {
    // Incrément atomique côté base, puis blocage si le seuil est franchi —
    // même mécanique en deux temps que attemptPinLogin (voir lib/pin.ts).
    const updated = await prisma.gatineBox.update({
      where: { id: box.id },
      data: { activationFailedAttempts: { increment: 1 } },
    });
    if (updated.activationFailedAttempts >= MAX_ACTIVATION_ATTEMPTS) {
      await prisma.gatineBox.update({ where: { id: box.id }, data: { activationBlocked: true } });
    }
    throw new InvalidStateError("Numéro de box ou code d'activation incorrect.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const guard = await tx.gatineBox.updateMany({
      where: { id: box.id, status: GatineBoxStatus.SOLD },
      data: {
        status: GatineBoxStatus.ACTIVATED,
        activatedByUserId: beneficiaryUserId,
        activatedAt: now,
        activationFailedAttempts: 0,
      },
    });
    if (guard.count === 0) {
      throw new InvalidStateError("Cette Gâtine Box a déjà été activée.");
    }

    const transaction = await tx.transaction.create({
      data: {
        type: TransactionType.PURCHASE,
        fromUserId: null,
        toUserId: beneficiaryUserId,
        amountCents: box.priceCents!,
        status: TransactionStatus.COMPLETED,
        validatedAt: now,
      },
    });

    await createPurchaseLot(
      tx,
      beneficiary.wallet!.id,
      beneficiary.accountType,
      box.priceCents!,
      transaction.id,
      now
    );

    await tx.nfcTag.create({ data: { userId: beneficiaryUserId, tagUid: box.nfcTagUid } });

    await tx.gatineBox.update({
      where: { id: box.id },
      data: { creditTransactionId: transaction.id },
    });

    return transaction;
  });
}

export { InsufficientBalanceError, InvalidStateError, NotFoundError };
