import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StandPaymentForm } from "@/components/StandPaymentForm";
import { MAX_WRISTBAND_PAYMENT_CENTS } from "@/lib/wallet";
import { formatGatinelles } from "@/lib/money";

export default async function StandPayerPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  if (session.user.accountType !== "COMMERCANT") redirect("/compte");

  const products = session.user.merchantId
    ? await prisma.standProduct.findMany({
        where: { merchantProfileId: session.user.merchantId },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Encaisser (stand)</h1>
      <p className="max-w-md text-neutral-600">
        Cliquez sur un produit ou saisissez le montant, puis faites approcher le
        bracelet ou la carte du participant. Aucun code n&apos;est demandé — les
        paiements par bracelet sont plafonnés à{" "}
        {formatGatinelles(MAX_WRISTBAND_PAYMENT_CENTS)} par transaction.
      </p>
      <StandPaymentForm
        products={products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents }))}
      />
    </div>
  );
}
