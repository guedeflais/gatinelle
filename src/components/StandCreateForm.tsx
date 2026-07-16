"use client";

import { useState } from "react";

interface StandCredentials {
  email: string;
  password: string;
  memberNumber: string;
  merchantCode: string;
}

export function StandCreateForm() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<StandCredentials | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/stands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, category }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Impossible de créer le stand.");
      return;
    }
    const data = await res.json();
    setCreated(data);
    setBusinessName("");
    setCategory("");
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          Nom du stand
          <input
            type="text"
            required
            minLength={2}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Catégorie
          <input
            type="text"
            required
            minLength={2}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
            placeholder="Buvette, restauration, artisanat..."
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "..." : "Créer le stand"}
        </button>
      </form>

      {created && (
        <div className="rounded border border-leaf-300 bg-leaf-50 p-4 text-sm">
          <p className="mb-2 font-medium text-leaf-900">
            Stand créé — notez ces identifiants, ils ne seront plus jamais affichés :
          </p>
          <ul className="flex flex-col gap-1 text-leaf-800">
            <li>Email : <span className="font-mono">{created.email}</span></li>
            <li>Mot de passe : <span className="font-mono">{created.password}</span></li>
            <li>Numéro d&apos;adhérent : <span className="font-mono">{created.memberNumber}</span></li>
            <li>Code commerçant : <span className="font-mono">{created.merchantCode}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
