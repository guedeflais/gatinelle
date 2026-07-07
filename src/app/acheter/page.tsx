import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AcheterForm } from "@/components/AcheterForm";

export default async function AcheterPage({
  searchParams,
}: {
  searchParams: Promise<{ achat?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const associationIban = process.env.ASSOCIATION_IBAN ?? "IBAN de l'association non configuré";
  const { achat } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Acheter des gâtinelles</h1>
      <p className="max-w-md text-neutral-600">
        1 gâtinelle = 1 euro. Les gâtinelles achetées sont valables 1 an à
        compter de leur achat.
      </p>
      {achat === "refuse" && (
        <p className="rounded border border-red-300 bg-red-50 p-4 text-red-900">
          Le paiement par carte a été refusé. Vous pouvez réessayer ou choisir un autre moyen de
          paiement.
        </p>
      )}
      {achat === "annule" && (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Paiement annulé.
        </p>
      )}
      <AcheterForm associationIban={associationIban} />
    </div>
  );
}
