import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GatineBoxActivateForm } from "@/components/GatineBoxActivateForm";

export default async function ActiverGatineBoxPage() {
  const session = await auth();
  if (session?.user?.accountType === "COMMERCANT") redirect("/commercant");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Activer une Gâtine Box</h1>
      <p className="max-w-md text-neutral-600">
        Ouvrez la box, munissez-vous du numéro de box (imprimé à l&apos;extérieur) et du
        code d&apos;activation (sur le papier scellé à l&apos;intérieur), puis renseignez-les
        ci-dessous pour créditer votre compte.
      </p>

      {session?.user ? (
        <GatineBoxActivateForm />
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <p className="text-sm text-neutral-600">
            Connectez-vous, ou créez un compte, puis revenez sur cette page pour activer
            votre Gâtine Box.
          </p>
          <Link
            href="/connexion"
            className="rounded-full bg-brand-700 px-6 py-3 text-center font-medium text-white"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="rounded-full border border-brand-700 px-6 py-3 text-center font-medium text-brand-700"
          >
            Créer un compte
          </Link>
        </div>
      )}
    </div>
  );
}
