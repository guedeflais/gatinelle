"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GatineBoxActivateForm() {
  const router = useRouter();
  const [boxNumber, setBoxNumber] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/gatine-box/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boxNumber, activationCode }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible d'activer cette Gâtine Box.");
      return;
    }

    setSuccess("Gâtine Box activée ! Votre solde a été crédité.");
    setBoxNumber("");
    setActivationCode("");
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
        Code d&apos;activation (sur le papier scellé à l&apos;intérieur)
        <input
          type="text"
          required
          value={activationCode}
          onChange={(e) => setActivationCode(e.target.value)}
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
        {loading ? "Envoi..." : "Activer ma Gâtine Box"}
      </button>
    </form>
  );
}
