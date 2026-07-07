import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature } from "@/lib/up2pay";
import { createPurchaseLot } from "@/lib/wallet";
import { TransactionStatus, TransactionType } from "@prisma/client";

// Notification de Paiement Instantanée (IPN) Up2Pay : appelée de serveur à
// serveur par Crédit Agricole à chaque tentative de paiement, quel que soit
// le résultat. C'est la SEULE source fiable pour créditer le compte — les
// URL de retour navigateur (PBX_EFFECTUE...) ne sont qu'un confort d'affichage
// pour le client et peuvent ne jamais être appelées (fermeture du navigateur).
// Doit répondre par un corps vide sans redirection (imposé par Up2Pay).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = url.search.startsWith("?") ? url.search.slice(1) : url.search;

  if (!verifySignature(rawQuery)) {
    return new NextResponse(null, { status: 400 });
  }

  const params = url.searchParams;
  const transactionId = params.get("ref");
  const errorCode = params.get("erreur");
  if (!transactionId || !errorCode) {
    return new NextResponse(null, { status: 400 });
  }

  if (errorCode === "00000") {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { toUser: { include: { wallet: true } } },
      });
      if (!transaction || transaction.status !== TransactionStatus.PENDING) return;
      if (transaction.type !== TransactionType.PURCHASE) return;
      if (!transaction.toUser?.wallet) return;

      const now = new Date();
      await createPurchaseLot(
        tx,
        transaction.toUser.wallet.id,
        transaction.toUser.accountType,
        transaction.amountCents,
        transaction.id,
        now
      );

      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          validatedAt: now,
          providerReference: params.get("trans"),
        },
      });
    });
  } else if (errorCode !== "99999") {
    // Code définitif de refus (99999 = paiement encore en attente de décision).
    await prisma.transaction.updateMany({
      where: { id: transactionId, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.REJECTED },
    });
  }

  return new NextResponse(null, { status: 200 });
}
