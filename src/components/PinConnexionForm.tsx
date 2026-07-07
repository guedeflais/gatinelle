"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function PinConnexionForm() {
  const router = useRouter();
  const [memberNumber, setMemberNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("member-pin", {
      memberNumber: memberNumber.toUpperCase(),
      pin,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError(
        "Numéro d'adhérent ou code PIN incorrect. Après 3 erreurs, l'accès est bloqué : contactez l'association pour le débloquer."
      );
      return;
    }
    router.push("/compte");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        Numéro d&apos;adhérent
        <input
          required
          placeholder="A00042"
          value={memberNumber}
          onChange={(e) => setMemberNumber(e.target.value.toUpperCase())}
          className="rounded border border-neutral-300 px-3 py-2 font-mono uppercase"
        />
      </label>
      <label className="flex flex-col gap-1">
        Code PIN
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
