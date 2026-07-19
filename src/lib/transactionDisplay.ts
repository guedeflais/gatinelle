import { ArrowLeftRight, CheckCircle2, Clock, Hourglass, ShoppingBag, Store, XCircle } from "lucide-react";
import type { TransactionStatus, TransactionType } from "@prisma/client";

export const TRANSACTION_ICONS: Record<TransactionType, typeof ShoppingBag> = {
  PURCHASE: ShoppingBag,
  PAYMENT: Store,
  CONVERSION: ArrowLeftRight,
  EXPIRY: Clock,
};

export const TRANSACTION_ICON_STYLES: Record<TransactionType, string> = {
  PURCHASE: "bg-leaf-100 text-leaf-800",
  PAYMENT: "bg-brand-100 text-brand-800",
  CONVERSION: "bg-brand-100 text-brand-800",
  EXPIRY: "bg-neutral-200 text-neutral-600",
};

export const STATUS_BADGE: Record<
  TransactionStatus,
  { label: string; icon: typeof Hourglass; className: string }
> = {
  PENDING: { label: "En attente", icon: Hourglass, className: "text-amber-700" },
  COMPLETED: { label: "Complété", icon: CheckCircle2, className: "text-leaf-700" },
  REJECTED: { label: "Rejeté", icon: XCircle, className: "text-red-600" },
};

interface CounterpartyUser {
  fullName: string;
  merchantProfile: { businessName: string } | null;
}

interface TransactionForDisplay {
  type: TransactionType;
  fromUserId: string | null;
  toUserId: string | null;
  fromUser: CounterpartyUser | null;
  toUser: CounterpartyUser | null;
}

// Seul le type PAYMENT a un interlocuteur humain identifiable des deux côtés
// (achat/reconversion/péremption se font face à "l'association"/le système).
export function getCounterpartyLabel(
  transaction: TransactionForDisplay,
  currentUserId: string
): string | null {
  if (transaction.type !== "PAYMENT") return null;
  const counterparty = transaction.fromUserId === currentUserId ? transaction.toUser : transaction.fromUser;
  if (!counterparty) return null;
  return counterparty.merchantProfile?.businessName ?? counterparty.fullName;
}
