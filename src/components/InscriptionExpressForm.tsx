"use client";

import { useState } from "react";
import { isNfcSupported, scanNfcTag } from "@/lib/nfc";

type Step = "form" | "link-nfc" | "done";

export function InscriptionExpressForm() {
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [memberNumber, setMemberNumber] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register-express", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Impossible de créer le compte.");
      return;
    }
    const data = await res.json();
    setUserId(data.id);
    setMemberNumber(data.memberNumber);
    setStep(isNfcSupported() ? "link-nfc" : "done");
  }

  async function handleScan() {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      const tagUid = await scanNfcTag();
      const res = await fetch("/api/register-express/link-nfc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, nfcTagUid: tagUid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "Impossible de lier le bracelet.");
        return;
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de lecture NFC.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "form") {
    return (
      <form onSubmit={handleCreate} className="flex max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1">
          Nom complet
          <input
            type="text"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "..." : "Créer le compte"}
        </button>
      </form>
    );
  }

  if (step === "link-nfc") {
    return (
      <div className="flex max-w-sm flex-col gap-3">
        <p className="text-leaf-700">
          Compte créé — numéro d&apos;adhérent <span className="font-mono">{memberNumber}</span>.
        </p>
        <p className="text-neutral-700">Approchez le bracelet ou la carte du participant.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleScan}
          disabled={loading}
          className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "Lecture en cours…" : "Lier le bracelet"}
        </button>
        <button
          type="button"
          onClick={() => setStep("done")}
          className="self-start text-sm text-neutral-500 underline"
        >
          Passer cette étape
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-3">
      <p className="text-leaf-700">
        Compte créé — numéro d&apos;adhérent <span className="font-mono">{memberNumber}</span>.
      </p>
      <button
        type="button"
        onClick={() => {
          setStep("form");
          setFullName("");
          setEmail("");
          setMemberNumber(null);
          setUserId(null);
          setError(null);
        }}
        className="self-start rounded border border-brand-700 px-4 py-2 text-brand-700 hover:bg-brand-50"
      >
        Inscrire un autre participant
      </button>
    </div>
  );
}
