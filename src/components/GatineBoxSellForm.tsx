"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GatineBoxSellForm() {
  const router = useRouter();
  const [boxNumber, setBoxNumber] = useState("");
  const [price, setPrice] = useState("");
  const [sealIntact, setSealIntact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const priceEuros = Number(price);
    if (!Number.isFinite(priceEuros) || priceEuros <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (!sealIntact) {
      setError("Vérifiez que le sceau de garantie est intact avant de vendre cette box.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/gatine-box/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boxNumber, priceEuros, sealIntact }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible d'enregistrer la vente.");
      return;
    }

    setSuccess(`Gâtine Box ${boxNumber} vendue pour ${priceEuros} €.`);
    setBoxNumber("");
    setPrice("");
    setSealIntact(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        Numéro de box (imprimé à l&apos;extérieur de l&apos;emballage)
        <input
          type="text"
          required
          value={boxNumber}
          onChange={(e) => setBoxNumber(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Prix reçu du client (en euros)
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={sealIntact}
          onChange={(e) => setSealIntact(e.target.checked)}
        />
        Je certifie que le sceau de garantie est intact
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-leaf-700">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "Envoi..." : "Enregistrer la vente"}
      </button>
    </form>
  );
}
