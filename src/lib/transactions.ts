import { prisma } from "./prisma";
import type { TransactionStatus, TransactionType } from "@prisma/client";

export const TRANSACTIONS_PAGE_SIZE = 30;

export interface TransactionListItem {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amountCents: number;
  isOutgoing: boolean;
  counterpartyLabel: string | null;
  createdAt: Date;
  // Un crédit issu de l'activation d'une Gâtine Box est un simple
  // Transaction de type PURCHASE (voir lib/gatineBox.ts) — ce indicateur
  // permet de l'afficher distinctement sans ajouter de valeur d'enum
  // dédiée (qui casserait l'exhaustivité de TRANSACTION_ICONS et fausserait
  // getCirculationStats, voir lib/wallet.ts).
  isGatineBox: boolean;
}

/**
 * Historique paginé d'un utilisateur, triée du plus récent au plus ancien.
 * `hasMore` est déduit en demandant une ligne de plus que la taille de page
 * (pas de requête COUNT séparée) plutôt qu'annoncé via un nombre total de pages.
 */
export async function getTransactionPage(
  userId: string,
  page: number
): Promise<{ transactions: TransactionListItem[]; page: number; hasMore: boolean }> {
  const safePage = Math.max(1, Math.floor(page) || 1);

  const rows = await prisma.transaction.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * TRANSACTIONS_PAGE_SIZE,
    take: TRANSACTIONS_PAGE_SIZE + 1,
    include: {
      fromUser: { select: { fullName: true, merchantProfile: { select: { businessName: true } } } },
      toUser: { select: { fullName: true, merchantProfile: { select: { businessName: true } } } },
    },
  });

  const hasMore = rows.length > TRANSACTIONS_PAGE_SIZE;
  const pageRows = rows.slice(0, TRANSACTIONS_PAGE_SIZE);

  const gatineBoxCredits = await prisma.gatineBox.findMany({
    where: { creditTransactionId: { in: pageRows.map((t) => t.id) } },
    select: { creditTransactionId: true },
  });
  const gatineBoxTransactionIds = new Set(gatineBoxCredits.map((b) => b.creditTransactionId));

  const transactions = pageRows.map((t) => {
    const isOutgoing = t.fromUserId === userId;
    // Seul le type PAYMENT a un interlocuteur humain identifiable des deux
    // côtés (achat/reconversion/péremption se font face à l'association).
    const counterpartyUser = isOutgoing ? t.toUser : t.fromUser;
    const counterpartyLabel =
      t.type === "PAYMENT" && counterpartyUser
        ? (counterpartyUser.merchantProfile?.businessName ?? counterpartyUser.fullName)
        : null;
    return {
      id: t.id,
      type: t.type,
      status: t.status,
      amountCents: t.amountCents,
      isOutgoing,
      counterpartyLabel,
      createdAt: t.createdAt,
      isGatineBox: gatineBoxTransactionIds.has(t.id),
    };
  });

  return { transactions, page: safePage, hasMore };
}
