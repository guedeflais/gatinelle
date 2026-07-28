"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StandProductForm({ merchantProfileId }: { merchantProfileId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceEuros = Number(price);
    if (!Number.isFinite(priceEuros) || priceEuros <= 0) {
      setError("Prix invalide.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/stand-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantProfileId, name, priceEuros }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Impossible d'ajouter le produit.");
      return;
    }
    setName("");
    setPrice("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Produit
        <input
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bière"
          className="rounded border border-neutral-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Prix (€)
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="4"
          className="w-20 rounded border border-neutral-300 px-2 py-1"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-700 px-3 py-1 text-sm text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "..." : "Ajouter"}
      </button>
    </form>
  );
}
