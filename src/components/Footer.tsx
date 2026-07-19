import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white pb-32 md:pb-0">
      <div className="mx-auto flex max-w-4xl flex-wrap gap-4 px-4 py-4 text-xs text-neutral-500">
        <Link href="/mentions-legales" className="hover:text-neutral-700">
          Mentions légales
        </Link>
        <Link href="/cgu" className="hover:text-neutral-700">
          Conditions générales d&apos;utilisation
        </Link>
        <Link href="/confidentialite" className="hover:text-neutral-700">
          Politique de confidentialité
        </Link>
        <Link href="/suppression-compte" className="hover:text-neutral-700">
          Suppression de compte
        </Link>
      </div>
    </footer>
  );
}
