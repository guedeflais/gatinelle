"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SignOutButton } from "./SignOutButton";

export function NavBar() {
  const { data: session } = useSession();
  const user = session?.user;
  const isStaff = user?.staffRole === "AGENT" || user?.staffRole === "ADMIN";
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Referme le menu mobile à chaque changement de page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = user ? (
    <>
      <Link href="/compte">Portefeuille</Link>
      <Link href="/acheter">Acheter</Link>
      <Link href="/payer">Payer un commerçant</Link>
      <Link href="/annuaire">Annuaire</Link>
      {user.accountType === "COMMERCANT" && <Link href="/commercant">Espace commerçant</Link>}
      {isStaff && <Link href="/admin">Administration</Link>}
      <Link href="/compte/profil">Mon compte</Link>
    </>
  ) : null;

  const authLinks = user ? (
    <>
      <span className="text-neutral-500">{user.fullName}</span>
      <SignOutButton className="text-left text-brand-700" />
    </>
  ) : (
    <>
      <Link
        href="/connexion"
        className="rounded bg-brand-700 px-3 py-1.5 text-center text-white hover:bg-brand-800"
      >
        Connexion
      </Link>
      <Link
        href="/inscription"
        className="rounded border border-brand-700 px-3 py-1.5 text-center text-brand-700 hover:bg-brand-50"
      >
        Créer un compte
      </Link>
    </>
  );

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-heading text-lg font-semibold text-foreground">
          La Gâtinelle
        </Link>
        <nav className="hidden flex-1 items-center gap-4 md:flex">
          {links}
          <span className="flex-1" />
          {authLinks}
        </nav>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          className="ml-auto flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span className="block h-0.5 w-5 bg-neutral-700" />
          <span className="block h-0.5 w-5 bg-neutral-700" />
          <span className="block h-0.5 w-5 bg-neutral-700" />
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 text-sm md:hidden">
          {links}
          {authLinks}
        </nav>
      )}
    </header>
  );
}
