import { prisma } from "@/lib/prisma";
import { settleCardPurchase } from "@/lib/cardPurchase";
import { getBalanceCents } from "@/lib/wallet";
import { AccountType, PaymentMethod, TransactionStatus, TransactionType } from "@prisma/client";

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

async function createBuyerWithPendingCardPurchase(amountCents: number) {
  const user = await prisma.user.create({
    data: {
      email: `${unique("card-buyer")}@test.local`,
      passwordHash: "x",
      pinHash: "x",
      memberNumber: `Y${(Date.now() + counter).toString().slice(-5)}`,
      fullName: "Test Card Buyer",
      accountType: AccountType.PARTICULIER,
    },
  });
  const wallet = await prisma.wallet.create({ data: { userId: user.id } });
  const transaction = await prisma.transaction.create({
    data: {
      type: TransactionType.PURCHASE,
      toUserId: user.id,
      amountCents,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.PENDING,
      providerReference: unique("hc"),
    },
  });
  return { user, wallet, transaction };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("settleCardPurchase", () => {
  it("credits the wallet and completes the transaction on a captured payment", async () => {
    const { wallet, transaction } = await createBuyerWithPendingCardPurchase(2500);

    const result = await settleCardPurchase(transaction.id, { kind: "paid", amountCents: 2500, currencyCode: "EUR" });

    expect(result).toBe("credited");
    expect(await getBalanceCents(prisma, wallet.id)).toBe(2500);
    const updated = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(updated.status).toBe(TransactionStatus.COMPLETED);
    expect(updated.validatedAt).not.toBeNull();
  });

  it("credits only once when the return and the webhook arrive at the same time", async () => {
    const { wallet, transaction } = await createBuyerWithPendingCardPurchase(1000);

    const results = await Promise.all([
      settleCardPurchase(transaction.id, { kind: "paid", amountCents: 1000 }),
      settleCardPurchase(transaction.id, { kind: "paid", amountCents: 1000 }),
      settleCardPurchase(transaction.id, { kind: "paid", amountCents: 1000 }),
    ]);

    expect(results.filter((r) => r === "credited")).toHaveLength(1);
    expect(await getBalanceCents(prisma, wallet.id)).toBe(1000);
  });

  it("does not credit again an already completed purchase (webhook retry)", async () => {
    const { wallet, transaction } = await createBuyerWithPendingCardPurchase(700);

    await settleCardPurchase(transaction.id, { kind: "paid" });
    const second = await settleCardPurchase(transaction.id, { kind: "paid" });

    expect(second).toBe("already_done");
    expect(await getBalanceCents(prisma, wallet.id)).toBe(700);
  });

  it("refuses to credit when the paid amount differs from the requested one", async () => {
    const { wallet, transaction } = await createBuyerWithPendingCardPurchase(5000);

    const result = await settleCardPurchase(transaction.id, { kind: "paid", amountCents: 100 });

    expect(result).toBe("ignored");
    expect(await getBalanceCents(prisma, wallet.id)).toBe(0);
    const unchanged = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(unchanged.status).toBe(TransactionStatus.PENDING);
  });

  it("refuses to credit a payment in another currency", async () => {
    const { wallet, transaction } = await createBuyerWithPendingCardPurchase(5000);

    const result = await settleCardPurchase(transaction.id, { kind: "paid", amountCents: 5000, currencyCode: "USD" });

    expect(result).toBe("ignored");
    expect(await getBalanceCents(prisma, wallet.id)).toBe(0);
  });

  it("marks the purchase REJECTED on a refusal, and never credits it afterwards", async () => {
    const { wallet, transaction } = await createBuyerWithPendingCardPurchase(900);

    await settleCardPurchase(transaction.id, { kind: "refused" });
    const afterRefusal = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(afterRefusal.status).toBe(TransactionStatus.REJECTED);

    const late = await settleCardPurchase(transaction.id, { kind: "paid", amountCents: 900 });
    expect(late).toBe("ignored");
    expect(await getBalanceCents(prisma, wallet.id)).toBe(0);
  });

  it("marks the purchase REJECTED when the customer cancels", async () => {
    const { transaction } = await createBuyerWithPendingCardPurchase(900);
    await settleCardPurchase(transaction.id, { kind: "cancelled" });
    const updated = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(updated.status).toBe(TransactionStatus.REJECTED);
  });

  it("leaves the purchase PENDING while the payment is still pending", async () => {
    const { wallet, transaction } = await createBuyerWithPendingCardPurchase(900);
    const result = await settleCardPurchase(transaction.id, { kind: "pending" });
    expect(result).toBe("ignored");
    const updated = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(updated.status).toBe(TransactionStatus.PENDING);
    expect(await getBalanceCents(prisma, wallet.id)).toBe(0);
  });

  it("never touches a transaction that is not a card purchase", async () => {
    const { user, wallet } = await createBuyerWithPendingCardPurchase(100);
    const cash = await prisma.transaction.create({
      data: {
        type: TransactionType.PURCHASE,
        toUserId: user.id,
        amountCents: 300,
        paymentMethod: PaymentMethod.CASH,
        status: TransactionStatus.PENDING,
      },
    });

    const result = await settleCardPurchase(cash.id, { kind: "paid" });

    expect(result).toBe("ignored");
    expect(await getBalanceCents(prisma, wallet.id)).toBe(0);
  });

  it("ignores an unknown transaction id", async () => {
    expect(await settleCardPurchase("does-not-exist", { kind: "paid" })).toBe("ignored");
  });
});
