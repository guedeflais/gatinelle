"use client";

import { useState } from "react";
import { isNfcSupported, scanNfcTag } from "@/lib/nfc";
import { formatGatinelles } from "@/lib/money";

interface StandProductOption {
  id: string;
  name: string;
  priceCents: number;
}

export function StandPaymentForm({ products = [] }: { products?: StandProductOption[] }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nfcSupported = isNfcSupported();

  async function handleEncaisser() {
    setError(null);
    setSuccess(null);

    const amountEuros = Number(amount);
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      setError("Montant invalide.");
      return;
    }

    setLoading(true);
    try {
      const tagUid = await scanNfcTag();
      const res = await fetch("/api/payments/wristband", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagUid, amountEuros }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "Paiement refusé.");
        return;
      }
      setSuccess(`Paiement de ${amountEuros.toFixed(2)} € accepté.`);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de lecture NFC.");
    } finally {
      setLoading(false);
    }
  }

  if (!nfcSupported) {
    return (
      <div className="max-w-sm rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        La lecture NFC n&apos;est pas disponible sur cet appareil ou ce navigateur
        (nécessite Chrome sur Android). Utilisez la page{" "}
        <a href="/payer" className="underline">
          Payer un commerçant
        </a>{" "}
        si le participant connaît son code d&apos;adhérent.
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-3">
      {products.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-neutral-700">Produits</span>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAmount((p.priceCents / 100).toString())}
                className="rounded border border-brand-700 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50"
              >
                {p.name} — {formatGatinelles(p.priceCents)}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="flex flex-col gap-1">
        Montant (en euros)
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-leaf-700">{success}</p>}
      <button
        type="button"
        onClick={handleEncaisser}
        disabled={loading || !amount}
        className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "Approchez le bracelet…" : "Encaisser"}
      </button>
    </div>
  );
}
