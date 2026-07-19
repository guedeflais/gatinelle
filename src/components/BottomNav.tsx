"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Wallet, Send, QrCode, Store, User } from "lucide-react";

export function BottomNav() {
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();

  if (!user) return null;

  const isCommercant = user.accountType === "COMMERCANT";

  const items = [
    { href: "/compte", label: "Portefeuille", icon: Wallet },
    isCommercant
      ? { href: "/commercant", label: "Recevoir", icon: QrCode }
      : { href: "/payer", label: "Payer", icon: Send },
    { href: "/annuaire", label: "Commerçants", icon: Store },
    { href: "/compte/profil", label: "Mon compte", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              active ? "text-brand-700" : "text-neutral-500"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
