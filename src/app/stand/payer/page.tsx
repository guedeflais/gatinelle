import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StandPaymentForm } from "@/components/StandPaymentForm";
import { MAX_WRISTBAND_PAYMENT_CENTS } from "@/lib/wallet";
import { formatGatinelles } from "@/lib/money";

export default async function StandPayerPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  if (session.user.accountType !== "COMMERCANT") redirect("/compte");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Encaisser (stand)</h1>
      <p className="max-w-md text-neutral-600">
        Saisissez le montant, puis faites approcher le bracelet ou la carte du
        participant. Aucun code n&apos;est demandé — les paiements par bracelet sont
        plafonnés à {formatGatinelles(MAX_WRISTBAND_PAYMENT_CENTS)} par transaction.
      </p>
      <StandPaymentForm />
    </div>
  );
}
