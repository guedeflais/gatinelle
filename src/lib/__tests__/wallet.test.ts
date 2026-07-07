import { prisma } from "@/lib/prisma";
import {
  createPurchaseLot,
  getBalanceCents,
  payMerchant,
  requestConversion,
  completeConversion,
  expireLots,
  InsufficientBalanceError,
} from "@/lib/wallet";
import { generateMerchantCode } from "@/lib/merchantCode";
import { AccountType } from "@prisma/client";

let counter = 0;
function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.local`;
}
function uniqueMemberNumber() {
  counter += 1;
  return `Z${(Date.now() + counter).toString().slice(-5)}`;
}

async function createParticulier() {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail("particulier"),
      passwordHash: "x",
      pinHash: "x",
      memberNumber: uniqueMemberNumber(),
      fullName: "Test Particulier",
      accountType: AccountType.PARTICULIER,
    },
  });
  const wallet = await prisma.wallet.create({ data: { userId: user.id } });
  return { user, wallet };
}

async function createMerchant(validated = true) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail("commercant"),
      passwordHash: "x",
      pinHash: "x",
      memberNumber: uniqueMemberNumber(),
      fullName: "Test Commerçant",
      accountType: AccountType.COMMERCANT,
    },
  });
  const wallet = await prisma.wallet.create({ data: { userId: user.id } });
  const merchantProfile = await prisma.merchantProfile.create({
    data: {
      userId: user.id,
      businessName: "Boutique Test",
      address: "1 rue du Test",
      category: "Test",
      merchantCode: generateMerchantCode(),
      validated,
    },
  });
  return { user, wallet, merchantProfile };
}

async function createPurchaseTransaction(toUserId: string, amountCents: number) {
  return prisma.transaction.create({
    data: {
      type: "PURCHASE",
      toUserId,
      amountCents,
      paymentMethod: "CASH",
      status: "COMPLETED",
    },
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createPurchaseLot — règles de péremption", () => {
  it("fixe une expiration à 1 an pour un portefeuille PARTICULIER", async () => {
    const { wallet } = await createParticulier();
    const tx = await createPurchaseTransaction(wallet.userId, 1000);
    const now = new Date("2026-01-01T00:00:00Z");
    const lot = await createPurchaseLot(prisma, wallet.id, AccountType.PARTICULIER, 1000, tx.id, now);
    expect(lot.expiresAt).toEqual(new Date("2027-01-01T00:00:00Z"));
  });

  it("ne fixe aucune expiration pour un portefeuille COMMERCANT", async () => {
    const { wallet, user } = await createMerchant();
    const tx = await createPurchaseTransaction(user.id, 1000);
    const lot = await createPurchaseLot(prisma, wallet.id, AccountType.COMMERCANT, 1000, tx.id);
    expect(lot.expiresAt).toBeNull();
  });
});

describe("getBalanceCents", () => {
  it("ne compte que les lots actifs et non expirés", async () => {
    const { wallet, user } = await createParticulier();
    const tx = await createPurchaseTransaction(user.id, 500);
    await createPurchaseLot(prisma, wallet.id, AccountType.PARTICULIER, 500, tx.id);
    // Lot déjà expiré (ne doit pas compter dans le solde)
    await prisma.gatinelleLot.create({
      data: {
        walletId: wallet.id,
        amountCents: 300,
        remainingCents: 300,
        expiresAt: new Date(Date.now() - 1000),
        status: "ACTIVE",
      },
    });

    const balance = await getBalanceCents(prisma, wallet.id);
    expect(balance).toBe(500);
  });
});

describe("payMerchant — dépense FIFO par date d'expiration", () => {
  it("consomme d'abord les lots qui expirent le plus tôt et crédite un lot sans expiration chez le commerçant", async () => {
    const { wallet: buyerWallet, user: buyer } = await createParticulier();
    const { merchantProfile, wallet: merchantWallet } = await createMerchant();

    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const later = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000);

    const tx1 = await createPurchaseTransaction(buyer.id, 300);
    const tx2 = await createPurchaseTransaction(buyer.id, 300);
    const lotSoon = await prisma.gatinelleLot.create({
      data: {
        walletId: buyerWallet.id,
        amountCents: 300,
        remainingCents: 300,
        expiresAt: soon,
        status: "ACTIVE",
        sourceTransactionId: tx1.id,
      },
    });
    const lotLater = await prisma.gatinelleLot.create({
      data: {
        walletId: buyerWallet.id,
        amountCents: 300,
        remainingCents: 300,
        expiresAt: later,
        status: "ACTIVE",
        sourceTransactionId: tx2.id,
      },
    });

    // Paiement de 400 : doit vider entièrement le lot "soon" (300) puis
    // prélever 100 sur le lot "later".
    await payMerchant(buyer.id, merchantProfile.merchantCode, 400);

    const refreshedSoon = await prisma.gatinelleLot.findUniqueOrThrow({ where: { id: lotSoon.id } });
    const refreshedLater = await prisma.gatinelleLot.findUniqueOrThrow({ where: { id: lotLater.id } });
    expect(refreshedSoon.remainingCents).toBe(0);
    expect(refreshedLater.remainingCents).toBe(200);

    const merchantBalance = await getBalanceCents(prisma, merchantWallet.id);
    expect(merchantBalance).toBe(400);

    const merchantLots = await prisma.gatinelleLot.findMany({ where: { walletId: merchantWallet.id } });
    expect(merchantLots.every((l) => l.expiresAt === null)).toBe(true);
  });

  it("rejette le paiement et ne modifie rien si le solde est insuffisant", async () => {
    const { wallet: buyerWallet, user: buyer } = await createParticulier();
    const { merchantProfile } = await createMerchant();
    const tx = await createPurchaseTransaction(buyer.id, 100);
    await createPurchaseLot(prisma, buyerWallet.id, AccountType.PARTICULIER, 100, tx.id);

    await expect(payMerchant(buyer.id, merchantProfile.merchantCode, 500)).rejects.toThrow(
      InsufficientBalanceError
    );

    const balance = await getBalanceCents(prisma, buyerWallet.id);
    expect(balance).toBe(100); // inchangé
  });

  it("refuse un paiement vers un commerçant non validé", async () => {
    const { wallet: buyerWallet, user: buyer } = await createParticulier();
    const { merchantProfile } = await createMerchant(false);
    const tx = await createPurchaseTransaction(buyer.id, 500);
    await createPurchaseLot(prisma, buyerWallet.id, AccountType.PARTICULIER, 500, tx.id);

    await expect(payMerchant(buyer.id, merchantProfile.merchantCode, 100)).rejects.toThrow();
  });
});

describe("requestConversion / completeConversion", () => {
  it("sort les gâtinelles de la circulation dès la demande, puis marque la transaction complétée", async () => {
    const { merchantProfile, wallet: merchantWallet, user: merchant } = await createMerchant();
    const tx = await createPurchaseTransaction(merchant.id, 1000);
    await createPurchaseLot(prisma, merchantWallet.id, AccountType.COMMERCANT, 1000, tx.id);

    const conversion = await requestConversion(merchant.id, 400);
    expect(conversion.status).toBe("PENDING");

    const balanceAfterRequest = await getBalanceCents(prisma, merchantWallet.id);
    expect(balanceAfterRequest).toBe(600);

    const admin = await prisma.user.create({
      data: {
        email: uniqueEmail("admin"),
        passwordHash: "x",
        pinHash: "x",
        memberNumber: uniqueMemberNumber(),
        fullName: "Admin",
        accountType: AccountType.PARTICULIER,
        staffRole: "ADMIN",
      },
    });
    const completed = await completeConversion(conversion.id, admin.id);
    expect(completed.status).toBe("COMPLETED");
    void merchantProfile;
  });
});

describe("expireLots", () => {
  it("passe en EXPIRED les lots de particuliers dont la date est dépassée et journalise une transaction", async () => {
    const { wallet, user } = await createParticulier();
    const tx = await createPurchaseTransaction(user.id, 700);
    const expiredLot = await prisma.gatinelleLot.create({
      data: {
        walletId: wallet.id,
        amountCents: 700,
        remainingCents: 700,
        expiresAt: new Date(Date.now() - 1000),
        status: "ACTIVE",
        sourceTransactionId: tx.id,
      },
    });

    const result = await expireLots(new Date());
    expect(result.totalExpiredCents).toBeGreaterThanOrEqual(700);

    const refreshed = await prisma.gatinelleLot.findUniqueOrThrow({ where: { id: expiredLot.id } });
    expect(refreshed.status).toBe("EXPIRED");

    const balance = await getBalanceCents(prisma, wallet.id);
    expect(balance).toBe(0);

    const expiryTx = await prisma.transaction.findFirst({
      where: { type: "EXPIRY", fromUserId: user.id },
    });
    expect(expiryTx).not.toBeNull();
  });

  it("ne touche jamais les lots de commerçants (expiresAt = null)", async () => {
    const { wallet, user } = await createMerchant();
    const tx = await createPurchaseTransaction(user.id, 500);
    await createPurchaseLot(prisma, wallet.id, AccountType.COMMERCANT, 500, tx.id);

    await expireLots(new Date());

    const balance = await getBalanceCents(prisma, wallet.id);
    expect(balance).toBe(500);
  });
});
