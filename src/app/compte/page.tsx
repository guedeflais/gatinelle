import { redirect } from "next/navigation";
import { Clock, PiggyBank, TrendingDown, Undo2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalanceCents } from "@/lib/wallet";
import { formatGatinelles } from "@/lib/money";
import { startOfMonthParis } from "@/lib/dateRanges";
import {
  TRANSACTION_ICONS,
  TRANSACTION_ICON_STYLES,
  STATUS_BADGE,
  getCounterpartyLabel,
} from "@/lib/transactionDisplay";

const TRANSACTION_LABELS: Record<string, string> = {
  PURCHASE: "Achat",
  PAYMENT: "Paiement",
  CONVERSION: "Reconversion",
  EXPIRY: "Péremption",
};

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ achat?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
  if (!wallet) redirect("/connexion");

  const { achat } = await searchParams;
  const isCommercant = session.user.accountType === "COMMERCANT";

  const [balanceCents, lots, transactions, user, spentThisMonth, totalPurchased, pendingConversions] =
    await Promise.all([
      getBalanceCents(prisma, wallet.id),
      prisma.gatinelleLot.findMany({
        where: { walletId: wallet.id, status: "ACTIVE", remainingCents: { gt: 0 } },
        orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }],
      }),
      prisma.transaction.findMany({
        where: { OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }] },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          fromUser: { select: { fullName: true, merchantProfile: { select: { businessName: true } } } },
          toUser: { select: { fullName: true, merchantProfile: { select: { businessName: true } } } },
        },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { memberNumber: true, fullName: true },
      }),
      prisma.transaction.aggregate({
        where: {
          fromUserId: session.user.id,
          type: "PAYMENT",
          status: "COMPLETED",
          createdAt: { gte: startOfMonthParis() },
        },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: { toUserId: session.user.id, type: "PURCHASE", status: "COMPLETED" },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: { fromUserId: session.user.id, type: "CONVERSION", status: "PENDING" },
        _sum: { amountCents: true },
      }),
    ]);

  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = lots.filter((l) => l.expiresAt && l.expiresAt <= thirtyDaysFromNow);
  const expiringSoonCents = expiringSoon.reduce((sum, l) => sum + l.remainingCents, 0);

  const thirdTile = isCommercant
    ? {
        icon: Undo2,
        label: "Reconversions en attente",
        cents: pendingConversions._sum.amountCents ?? 0,
      }
    : {
        icon: Clock,
        label: "Bientôt périmées",
        cents: expiringSoonCents,
      };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Portefeuille</h1>
        <p className="text-neutral-500">{user.fullName}</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-leaf-700 p-6 text-white">
        <p className="text-sm uppercase tracking-wide text-brand-100">Solde disponible</p>
        <p className="text-4xl font-semibold">{formatGatinelles(balanceCents)}</p>
        <p className="mt-1 text-sm text-brand-100">
          Numéro d&apos;adhérent : <span className="font-mono">{user.memberNumber}</span>
        </p>
      </div>

      {achat === "succes" && (
        <p className="rounded border border-leaf-300 bg-leaf-50 p-4 text-leaf-900">
          Paiement reçu, en cours de validation par Up2Pay. Votre solde sera mis à jour
          automatiquement dans quelques instants.
        </p>
      )}
      {achat === "attente" && (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Votre paiement est en attente de validation par votre banque. Votre solde sera mis à jour
          dès que la décision sera connue.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white p-4 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <TrendingDown size={18} />
          </span>
          <p className="text-lg font-semibold">{formatGatinelles(spentThisMonth._sum.amountCents ?? 0)}</p>
          <p className="text-xs text-neutral-500">Ce mois</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white p-4 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-50 text-leaf-700">
            <PiggyBank size={18} />
          </span>
          <p className="text-lg font-semibold">{formatGatinelles(totalPurchased._sum.amountCents ?? 0)}</p>
          <p className="text-xs text-neutral-500">Total</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white p-4 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <thirdTile.icon size={18} />
          </span>
          <p className="text-lg font-semibold">{formatGatinelles(thirdTile.cents)}</p>
          <p className="text-xs text-neutral-500">{thirdTile.label}</p>
        </div>
      </div>

      {!isCommercant && expiringSoon.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Gâtinelles bientôt périmées (sous 30 jours) :</p>
          <ul className="mt-2 list-inside list-disc text-sm">
            {expiringSoon.map((lot) => (
              <li key={lot.id}>
                {formatGatinelles(lot.remainingCents)} — expire le{" "}
                {lot.expiresAt?.toLocaleDateString("fr-FR")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-medium">Historique</h2>
        <div className="flex flex-col">
          {transactions.map((t) => {
            const isOutgoing = t.fromUserId === session.user.id;
            const Icon = TRANSACTION_ICONS[t.type];
            const status = STATUS_BADGE[t.status];
            const counterparty = getCounterpartyLabel(t, session.user.id);
            return (
              <div key={t.id} className="flex items-center gap-3 border-b border-neutral-100 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TRANSACTION_ICON_STYLES[t.type]}`}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{TRANSACTION_LABELS[t.type] ?? t.type}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {counterparty ?? t.createdAt.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className={isOutgoing ? "text-red-600" : "text-leaf-700"}>
                    {isOutgoing ? "-" : "+"}
                    {formatGatinelles(t.amountCents)}
                  </p>
                  <p className={`flex items-center gap-1 text-xs ${status.className}`}>
                    <status.icon size={12} />
                    {status.label}
                  </p>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <p className="py-4 text-center text-neutral-400">Aucune transaction pour l&apos;instant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
