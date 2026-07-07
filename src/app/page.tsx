import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <Image
        src="/gatinelle-logo.png"
        alt="La Gâtinelle — monnaie locale"
        width={267}
        height={126}
        priority
      />
      <h1 className="sr-only">La Gâtinelle</h1>
      <p className="max-w-xl text-neutral-700">
        La monnaie locale complémentaire de la Gâtine Poitevine.
        <br />
        Achetez des gâtinelles, payez chez les commerçants agréés, et suivez
        votre compte en un coup d&apos;œil.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/connexion"
          className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800"
        >
          Se connecter
        </Link>
        <Link
          href="/inscription"
          className="rounded border border-brand-700 px-4 py-2 text-brand-700 hover:bg-brand-50"
        >
          Créer un compte
        </Link>
        <Link
          href="/annuaire"
          className="rounded border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-50"
        >
          Voir l&apos;annuaire des commerçants
        </Link>
      </div>
    </div>
  );
}
