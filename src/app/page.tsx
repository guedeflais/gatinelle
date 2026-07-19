import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Butterfly } from "@/components/Butterfly";

export default async function Home() {
  const session = await auth();
  const seenOnboarding = (await cookies()).get("gatinelle_onboarding_seen");
  if (!session?.user && !seenOnboarding) redirect("/bienvenue");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 rounded-2xl bg-gradient-to-br from-brand-700 to-leaf-700 px-6 py-16 text-center text-white">
      <Butterfly flying={false} />
      <div>
        <h1 className="text-3xl font-semibold">
          Bienvenue sur
          <br />
          La Gâtinelle
        </h1>
        <p className="mt-3 max-w-xs text-brand-100">
          La monnaie locale numérique de la Gâtine Poitevine
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        {!session?.user && (
          <>
            <Link
              href="/connexion"
              className="rounded-full bg-white px-6 py-3 font-medium text-brand-700"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="rounded-full border border-white px-6 py-3 font-medium text-white"
            >
              Créer un compte
            </Link>
          </>
        )}
        <Link
          href="/annuaire"
          className="rounded-full border border-white px-6 py-3 font-medium text-white"
        >
          Annuaire des commerçants
        </Link>
      </div>
    </div>
  );
}
