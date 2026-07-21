"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GatineBoxCredentials {
  boxNumber: string;
  activationCode: string;
}

export function GatineBoxCreateForm() {
  const router = useRouter();
  const [nfcTagUid, setNfcTagUid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<GatineBoxCredentials | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/gatine-box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nfcTagUid }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Impossible de confectionner cette Gâtine Box.");
      return;
    }
    const data = await res.json();
    setCreated(data);
    setNfcTagUid("");
    router.refresh();
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          Numéro de série de la carte NFC
          <input
            type="text"
            required
            minLength={1}
            value={nfcTagUid}
            onChange={(e) => setNfcTagUid(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "..." : "Confectionner la box"}
        </button>
      </form>

      {created && (
        <div className="rounded border border-leaf-300 bg-leaf-50 p-4 text-sm">
          <p className="mb-2 font-medium text-leaf-900">
            Gâtine Box créée — notez ces informations, elles ne seront plus jamais affichées :
          </p>
          <ul className="flex flex-col gap-1 text-leaf-800">
            <li>Numéro de box (à imprimer à l&apos;extérieur) : <span className="font-mono">{created.boxNumber}</span></li>
            <li>Code d&apos;activation (à glisser scellé à l&apos;intérieur) : <span className="font-mono">{created.activationCode}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
