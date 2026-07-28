"use client";

import { useState } from "react";
import { isNfcSupported, scanNfcTag } from "@/lib/nfc";

interface ConvertResult {
  fullName: string;
  memberNumber: string;
  pin: string;
}

export function ConvertAccountForm() {
  const [memberNumber, setMemberNumber] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);

  const nfcSupported = isNfcSupported();

  async function doConvert(body: { tagUid: string } | { memberNumber: string }) {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/convert-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible de transformer ce compte.");
      return;
    }
    setResult(await res.json());
    setMemberNumber("");
  }

  async function handleScan() {
    setError(null);
    setResult(null);
    setScanning(true);
    try {
      const tagUid = await scanNfcTag();
      await doConvert({ tagUid });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de lecture NFC.");
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberNumber) return;
    await doConvert({ memberNumber });
  }

  return (
    <div className="flex max-w-sm flex-col gap-4">
      {nfcSupported && (
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning}
          className="self-start rounded border border-brand-700 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          {scanning ? "Approchez la carte…" : "Scanner la carte"}
        </button>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          Numéro d&apos;adhérent {nfcSupported && "(si pas de carte scannée)"}
          <input
            type="text"
            value={memberNumber}
            onChange={(e) => setMemberNumber(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !memberNumber}
          className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "..." : "Transformer en compte permanent"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded border border-leaf-300 bg-leaf-50 p-4 text-sm text-leaf-900">
          <p className="mb-2">
            Compte de {result.fullName} activé — notez ces identifiants, ils ne seront plus jamais
            affichés :
          </p>
          <ul className="flex flex-col gap-1">
            <li>
              Numéro d&apos;adhérent : <span className="font-mono">{result.memberNumber}</span>
            </li>
            <li>
              Code PIN : <span className="font-mono">{result.pin}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
