"use client";

import { useEffect, useState } from "react";

interface CreditAccountFormProps {
  initialMemberNumber?: string;
}

export function CreditAccountForm({ initialMemberNumber }: CreditAccountFormProps = {}) {
  const [memberNumber, setMemberNumber] = useState(initialMemberNumber ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMemberNumber) setMemberNumber(initialMemberNumber);
  }, [initialMemberNumber]);

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
    const res = await fetch("/api/admin/credit-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberNumber, amountEuros }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible de créditer ce compte.");
      return;
    }

    const data = await res.json();
    setSuccess(`${amountEuros} G créditées sur le compte de ${data.fullName}.`);
    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        Numéro d&apos;adhérent
        <input
          type="text"
          required
          value={memberNumber}
          onChange={(e) => setMemberNumber(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Montant reçu en espèces (en euros)
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
        className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "..." : "Créditer le compte"}
      </button>
    </form>
  );
}
