import { PaymentMethod, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createHostedCheckout, type CardOutcome } from "@/lib/cawl";
import { createPurchaseLot } from "@/lib/wallet";

/**
 * Démarre un achat par carte : crée la transaction PENDING, ouvre la session
 * de paiement CAWL et mémorise son identifiant (providerReference) pour
 * retrouver la transaction au retour du client. Si CAWL refuse la création,
 * la transaction est marquée REJECTED plutôt que laissée en attente.
 */
export async function startCardPurchase(params: {
  userId: string;
  email: string;
  amountCents: number;
  origin: string;
}): Promise<{ redirectUrl: string }> {
  const transaction = await prisma.transaction.create({
    data: {
      type: TransactionType.PURCHASE,
      fromUserId: null,
      toUserId: params.userId,
      amountCents: params.amountCents,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.PENDING,
    },
  });

  try {
    const session = await createHostedCheckout({
      transactionId: transaction.id,
      amountCents: params.amountCents,
      buyerEmail: params.email,
      origin: params.origin,
    });
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { providerReference: session.hostedCheckoutId },
    });
    return { redirectUrl: session.redirectUrl };
  } catch (err) {
    await prisma.transaction.updateMany({
      where: { id: transaction.id, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.REJECTED },
    });
    throw err;
  }
}

export type SettleResult = "credited" | "already_done" | "ignored";

/**
 * Applique le résultat d'un paiement par carte à la transaction. Appelée à la
 * fois au retour du client et par le webhook : les deux peuvent arriver en
 * même temps, donc le passage PENDING → COMPLETED est un UPDATE gardé
 * (même idiome que payMerchant) — un seul des deux appels crédite le compte.
 */
export async function settleCardPurchase(
  transactionId: string,
  outcome: CardOutcome
): Promise<SettleResult> {
  if (outcome.kind === "pending") return "ignored";

  if (outcome.kind === "refused" || outcome.kind === "cancelled") {
    await prisma.transaction.updateMany({
      where: {
        id: transactionId,
        status: TransactionStatus.PENDING,
        type: TransactionType.PURCHASE,
        paymentMethod: PaymentMethod.CARD,
      },
      data: { status: TransactionStatus.REJECTED },
    });
    return "ignored";
  }

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { toUser: { include: { wallet: true } } },
    });
    if (
      !transaction ||
      transaction.type !== TransactionType.PURCHASE ||
      transaction.paymentMethod !== PaymentMethod.CARD ||
      !transaction.toUser?.wallet
    ) {
      return "ignored";
    }
    if (transaction.status === TransactionStatus.COMPLETED) return "already_done";
    if (transaction.status !== TransactionStatus.PENDING) return "ignored";

    // Ne jamais créditer un montant ou une devise différents de ceux demandés.
    if (outcome.amountCents !== undefined && outcome.amountCents !== transaction.amountCents) {
      console.error(
        `CAWL : montant payé (${outcome.amountCents}) différent du montant attendu (${transaction.amountCents}) pour ${transactionId}.`
      );
      return "ignored";
    }
    if (outcome.currencyCode !== undefined && outcome.currencyCode !== "EUR") {
      console.error(`CAWL : devise inattendue (${outcome.currencyCode}) pour ${transactionId}.`);
      return "ignored";
    }

    const now = new Date();
    const claimed = await tx.transaction.updateMany({
      where: { id: transactionId, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.COMPLETED, validatedAt: now },
    });
    if (claimed.count === 0) return "already_done";

    await createPurchaseLot(
      tx,
      transaction.toUser.wallet.id,
      transaction.toUser.accountType,
      transaction.amountCents,
      transaction.id,
      now
    );
    return "credited";
  });
}
