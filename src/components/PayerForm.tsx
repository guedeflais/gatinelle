"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "./QrScanner";

export function PayerForm() {
  const router = useRouter();
  const [merchantCode, setMerchantCode] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amountEuros = Number(amount);
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      setError("Montant invalide.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantCode, amountEuros }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible d'effectuer le paiement.");
      return;
    }

    setSuccess(`Paiement de ${amountEuros} G effectué avec succès.`);
    setAmount("");
    router.refresh();
  }

  if (scanning) {
    return (
      <QrScanner
        onScan={(data) => {
          setMerchantCode(data.trim().toUpperCase());
          setScanning(false);
        }}
        onClose={() => setScanning(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        Code du commerçant
        <input
          required
          value={merchantCode}
          onChange={(e) => setMerchantCode(e.target.value)}
          placeholder="Ex. 7QK4RT"
          className="rounded border border-neutral-300 px-3 py-2 uppercase"
        />
      </label>
      <button
        type="button"
        onClick={() => setScanning(true)}
        className="self-start rounded border border-brand-700 px-4 py-2 text-brand-700 hover:bg-brand-50"
      >
        Scanner un QR code
      </button>
      <label className="flex flex-col gap-1">
        Montant (en gâtinelles)
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-leaf-700">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "Paiement..." : "Payer"}
      </button>
    </form>
  );
}
