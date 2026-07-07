"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PinChangeForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d{4}$/.test(pin)) {
      setError("Le code PIN doit comporter exactement 4 chiffres.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("Les deux codes PIN ne correspondent pas.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);

    if (!res.ok) {
      setError("Impossible de changer le code PIN.");
      return;
    }
    setSuccess("Code PIN mis à jour.");
    setPin("");
    setPinConfirm("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          Nouveau PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          Confirmer
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            value={pinConfirm}
            onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-leaf-700">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "..." : "Changer mon PIN"}
      </button>
    </form>
  );
}
