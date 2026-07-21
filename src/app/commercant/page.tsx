import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalanceCents } from "@/lib/wallet";
import { formatGatinelles } from "@/lib/money";
import { ConversionForm } from "@/components/ConversionForm";
import { GatineBoxSellForm } from "@/components/GatineBoxSellForm";

export default async function CommercantPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  if (session.user.accountType !== "COMMERCANT") redirect("/compte");

  const merchantProfile = await prisma.merchantProfile.findUnique({
    where: { userId: session.user.id },
  });
  const wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
  if (!merchantProfile || !wallet) redirect("/compte");

  const [balanceCents, qrDataUrl, receivedPayments, conversions] = await Promise.all([
    getBalanceCents(prisma, wallet.id),
    QRCode.toDataURL(merchantProfile.merchantCode),
    prisma.transaction.findMany({
      where: { toUserId: session.user.id, type: "PAYMENT" },
      include: { fromUser: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.transaction.findMany({
      where: { fromUserId: session.user.id, type: "CONVERSION" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Espace commerçant — {merchantProfile.businessName}</h1>

      {!merchantProfile.validated && (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Votre compte commerçant est en attente de validation par l&apos;association. Vous ne
          pourrez pas recevoir de paiements tant qu&apos;il n&apos;est pas validé.
        </p>
      )}

      <div className="rounded-lg bg-brand-700 p-6 text-white">
        <p className="text-sm uppercase tracking-wide text-brand-100">Solde disponible</p>
        <p className="text-4xl font-semibold">{formatGatinelles(balanceCents)}</p>
        <p className="mt-2 text-sm text-brand-100">
          Les gâtinelles détenues par un commerçant n&apos;expirent jamais.
        </p>
      </div>

      <div className="flex flex-col items-start gap-3">
        <h2 className="text-lg font-medium">Votre code de paiement</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code ${merchantProfile.merchantCode}`} width={160} height={160} />
        <p className="font-mono text-xl tracking-widest">{merchantProfile.merchantCode}</p>
        <p className="text-sm text-neutral-500">
          Affichez ce code à votre comptoir : vos clients le saisissent pour vous payer en
          gâtinelles.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Paiements reçus</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="py-2">Date</th>
              <th>Client</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {receivedPayments.map((t) => (
              <tr key={t.id} className="border-b border-neutral-100">
                <td className="py-2">{t.createdAt.toLocaleDateString("fr-FR")}</td>
                <td>{t.fromUser?.fullName ?? "—"}</td>
                <td className="text-leaf-700">+{formatGatinelles(t.amountCents)}</td>
              </tr>
            ))}
            {receivedPayments.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-neutral-400">
                  Aucun paiement reçu pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Reconvertir des gâtinelles en euros</h2>
        <p className="max-w-md text-sm text-neutral-600">
          Une fois la demande envoyée, l&apos;association effectue le virement bancaire puis
          valide la demande. Le montant demandé sort immédiatement de votre solde disponible.
        </p>
        <p className="max-w-md text-sm text-neutral-600">
          Commission fixe de 0.50 G, plus commission variable de 0.1% du montant reconverti.
          Optez de préférence pour une utilisation de vos gâtinelles chez un autre commerçant.
        </p>
        <ConversionForm />

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="py-2">Date</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {conversions.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100">
                <td className="py-2">{c.createdAt.toLocaleDateString("fr-FR")}</td>
                <td>{formatGatinelles(c.amountCents)}</td>
                <td>{c.status === "COMPLETED" ? "Payée" : "En attente"}</td>
              </tr>
            ))}
            {conversions.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-neutral-400">
                  Aucune demande de reconversion.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {merchantProfile.validated && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Vendre une Gâtine Box</h2>
          <p className="max-w-md text-sm text-neutral-600">
            Après avoir vérifié que le sceau de garantie de la box est intact, saisissez le
            numéro de box (visible à l&apos;extérieur de l&apos;emballage) et le prix reçu du
            client. Vous n&apos;avez à aucun moment accès au code d&apos;activation : seul le
            bénéficiaire pourra activer la box depuis son propre compte.
          </p>
          <GatineBoxSellForm />
        </div>
      )}
    </div>
  );
}
