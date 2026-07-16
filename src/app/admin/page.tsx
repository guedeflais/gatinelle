import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isStaff, isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCirculationStats } from "@/lib/wallet";
import { formatGatinelles } from "@/lib/money";
import { ActionButton } from "@/components/ActionButton";
import { StandCreateForm } from "@/components/StandCreateForm";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  TRANSFER: "Virement",
  CARD: "Carte bancaire",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || !isStaff(session)) redirect("/");

  const staffIsAdmin = isAdmin(session);

  const pendingPurchases = await prisma.transaction.findMany({
    where: {
      type: "PURCHASE",
      status: "PENDING",
      paymentMethod: staffIsAdmin ? { in: ["CASH", "TRANSFER"] } : "CASH",
    },
    include: { toUser: true },
    orderBy: { createdAt: "asc" },
  });

  const pendingConversions = staffIsAdmin
    ? await prisma.transaction.findMany({
        where: { type: "CONVERSION", status: "PENDING" },
        include: { fromUser: { include: { merchantProfile: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const pendingMerchants = staffIsAdmin
    ? await prisma.merchantProfile.findMany({
        where: { validated: false },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // Les stands d'événement se reconnaissent à leur adresse fixe ("Stand
  // d'événement", voir /api/admin/stands) — permet de les lister à part sans
  // toucher aux vrais commerçants validés dans l'annuaire.
  const activeStands = staffIsAdmin
    ? await prisma.merchantProfile.findMany({
        where: { validated: true, address: "Stand d'événement" },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const circulation = staffIsAdmin ? await getCirculationStats() : null;

  const blockedUsers = staffIsAdmin
    ? await prisma.user.findMany({
        where: { pinBlocked: true },
        orderBy: { fullName: "asc" },
      })
    : [];

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Administration</h1>

      {circulation && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Masse en circulation</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-xs uppercase text-neutral-500">Total émis</p>
              <p className="text-xl font-semibold">
                {formatGatinelles(circulation.totalPurchasedCents)}
              </p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-xs uppercase text-neutral-500">Périmé</p>
              <p className="text-xl font-semibold">
                {formatGatinelles(circulation.totalExpiredCents)}
              </p>
            </div>
            <div className="rounded border border-neutral-200 p-4">
              <p className="text-xs uppercase text-neutral-500">Reconverti</p>
              <p className="text-xl font-semibold">
                {formatGatinelles(circulation.totalConvertedCents)}
              </p>
            </div>
            <div className="rounded border border-leaf-300 bg-leaf-50 p-4">
              <p className="text-xs uppercase text-leaf-700">En circulation</p>
              <p className="text-xl font-semibold text-leaf-800">
                {formatGatinelles(circulation.totalCirculatingCents)}
              </p>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">
          Achats en attente de validation
        </h2>
        {pendingPurchases.length === 0 ? (
          <p className="text-neutral-500">Aucun achat en attente.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="py-2">Date</th>
                <th>Membre</th>
                <th>Montant</th>
                <th>Moyen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingPurchases.map((t) => (
                <tr key={t.id} className="border-b border-neutral-100">
                  <td className="py-2">{t.createdAt.toLocaleDateString("fr-FR")}</td>
                  <td>
                    {t.toUser?.fullName} ({t.toUser?.email})
                  </td>
                  <td>{formatGatinelles(t.amountCents)}</td>
                  <td>{METHOD_LABELS[t.paymentMethod ?? ""] ?? t.paymentMethod}</td>
                  <td>
                    <ActionButton
                      url="/api/admin/purchases/validate"
                      body={{ transactionId: t.id }}
                      label="Valider"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {staffIsAdmin && (
        <section>
          <h2 className="mb-3 text-lg font-medium">
            Demandes de reconversion en attente
          </h2>
          {pendingConversions.length === 0 ? (
            <p className="text-neutral-500">Aucune demande en attente.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="py-2">Date</th>
                  <th>Commerçant</th>
                  <th>IBAN</th>
                  <th>Montant</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingConversions.map((t) => (
                  <tr key={t.id} className="border-b border-neutral-100">
                    <td className="py-2">{t.createdAt.toLocaleDateString("fr-FR")}</td>
                    <td>{t.fromUser?.merchantProfile?.businessName ?? t.fromUser?.fullName}</td>
                    <td>{t.fromUser?.merchantProfile?.iban ?? "non renseigné"}</td>
                    <td>{formatGatinelles(t.amountCents)}</td>
                    <td>
                      <ActionButton
                        url="/api/admin/conversions/complete"
                        body={{ transactionId: t.id }}
                        label="Marquer payée"
                        confirmMessage="Confirmez-vous avoir effectué le virement bancaire correspondant ?"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {staffIsAdmin && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Commerçants en attente de validation</h2>
          {pendingMerchants.length === 0 ? (
            <p className="text-neutral-500">Aucun commerçant en attente.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="py-2">Commerce</th>
                  <th>Contact</th>
                  <th>Adresse</th>
                  <th>Catégorie</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingMerchants.map((m) => (
                  <tr key={m.id} className="border-b border-neutral-100">
                    <td className="py-2">{m.businessName}</td>
                    <td>{m.user.email}</td>
                    <td>{m.address}</td>
                    <td>{m.category}</td>
                    <td className="flex gap-2 py-2">
                      <ActionButton
                        url="/api/admin/merchants/validate"
                        body={{ merchantProfileId: m.id, approve: true }}
                        label="Valider"
                      />
                      <ActionButton
                        url="/api/admin/merchants/validate"
                        body={{ merchantProfileId: m.id, approve: false }}
                        label="Rejeter"
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {staffIsAdmin && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Mode festival — créer un stand</h2>
          <p className="mb-3 max-w-md text-sm text-neutral-600">
            Crée un compte commerçant immédiatement validé pour un stand d&apos;événement,
            sans passer par la file de validation habituelle.
          </p>
          <StandCreateForm />

          {activeStands.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-neutral-700">
                Stands actifs (retirer après l&apos;événement)
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="py-2">Stand</th>
                    <th>Catégorie</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activeStands.map((m) => (
                    <tr key={m.id} className="border-b border-neutral-100">
                      <td className="py-2">{m.businessName}</td>
                      <td>{m.category}</td>
                      <td>
                        <ActionButton
                          url="/api/admin/merchants/validate"
                          body={{ merchantProfileId: m.id, approve: false }}
                          label="Retirer"
                          confirmMessage="Retirer ce stand de l'annuaire ? L'historique de ses transactions reste conservé."
                          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {staffIsAdmin && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Accès PIN bloqués</h2>
          {blockedUsers.length === 0 ? (
            <p className="text-neutral-500">Aucun accès bloqué.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="py-2">Membre</th>
                  <th>Numéro d&apos;adhérent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-100">
                    <td className="py-2">
                      {u.fullName} ({u.email})
                    </td>
                    <td className="font-mono">{u.memberNumber}</td>
                    <td>
                      <ActionButton
                        url="/api/admin/users/unblock-pin"
                        body={{ userId: u.id }}
                        label="Débloquer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
