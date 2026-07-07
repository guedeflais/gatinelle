import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalanceCents } from "@/lib/wallet";
import { formatGatinelles } from "@/lib/money";
import { PinChangeForm } from "@/components/PinChangeForm";

const TRANSACTION_LABELS: Record<string, string> = {
  PURCHASE: "Achat",
  PAYMENT: "Paiement",
  CONVERSION: "Reconversion",
  EXPIRY: "Péremption",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  COMPLETED: "Complété",
  REJECTED: "Rejeté",
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

  const [balanceCents, lots, transactions, user] = await Promise.all([
    getBalanceCents(prisma, wallet.id),
    prisma.gatinelleLot.findMany({
      where: { walletId: wallet.id, status: "ACTIVE", remainingCents: { gt: 0 } },
      orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }],
    }),
    prisma.transaction.findMany({
      where: { OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }] },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { memberNumber: true },
    }),
  ]);

  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = lots.filter((l) => l.expiresAt && l.expiresAt <= thirtyDaysFromNow);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mon compte</h1>
        <p className="text-neutral-500">{session.user.fullName}</p>
        <p className="text-sm text-neutral-500">
          Numéro d&apos;adhérent :{" "}
          <span className="font-mono font-medium text-neutral-800">{user.memberNumber}</span>
        </p>
      </div>

      <div className="rounded-lg bg-leaf-700 p-6 text-white">
        <p className="text-sm uppercase tracking-wide text-leaf-100">Solde disponible</p>
        <p className="text-4xl font-semibold">{formatGatinelles(balanceCents)}</p>
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

      {session.user.accountType === "PARTICULIER" && expiringSoon.length > 0 && (
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const isOutgoing = t.fromUserId === session.user.id;
              return (
                <tr key={t.id} className="border-b border-neutral-100">
                  <td className="py-2">{t.createdAt.toLocaleDateString("fr-FR")}</td>
                  <td>{TRANSACTION_LABELS[t.type] ?? t.type}</td>
                  <td className={isOutgoing ? "text-red-600" : "text-leaf-700"}>
                    {isOutgoing ? "-" : "+"}
                    {formatGatinelles(t.amountCents)}
                  </td>
                  <td>{STATUS_LABELS[t.status] ?? t.status}</td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-neutral-400">
                  Aucune transaction pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Sécurité</h2>
        <p className="mb-3 max-w-md text-sm text-neutral-600">
          Changez votre code PIN de connexion rapide en caisse (numéro d&apos;adhérent + PIN).
        </p>
        <PinChangeForm />
      </div>
    </div>
  );
}
