"use client";

import dynamic from "next/dynamic";
import type { MappedMerchant } from "./MerchantMap";

// `ssr: false` n'est autorisé que depuis un composant client — Leaflet a
// besoin du DOM du navigateur (window/document), inutilisable côté serveur.
const MerchantMap = dynamic(() => import("./MerchantMap").then((m) => m.MerchantMap), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-xl bg-neutral-100" />,
});

export function MerchantMapLoader({ merchants }: { merchants: MappedMerchant[] }) {
  return <MerchantMap merchants={merchants} />;
}
