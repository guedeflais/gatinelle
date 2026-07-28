"use client";

import { useState } from "react";
import { isNfcSupported, scanNfcTag } from "@/lib/nfc";
import { formatGatinelles } from "@/lib/money";

interface BalanceResult {
  fullName: string;
  balanceCents: number;
}

export function CheckBalanceForm() {
  const [memberNumber, setMemberNumber] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BalanceResult | null>(null);

  const nfcSupported = isNfcSupported();

  async function checkBalance(body: { tagUid: string } | { memberNumber: string }) {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/check-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible de consulter ce compte.");
      return;
    }
    setResult(await res.json());
  }

  async function handleScan() {
    setError(null);
    setResult(null);
    setScanning(true);
    try {
      const tagUid = await scanNfcTag();
      await checkBalance({ tagUid });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de lecture NFC.");
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberNumber) return;
    await checkBalance({ memberNumber });
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
          {loading ? "..." : "Consulter"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className="text-sm text-leaf-700">
          Solde de {result.fullName} :{" "}
          <span className="font-medium">{formatGatinelles(result.balanceCents)}</span>
        </p>
      )}
    </div>
  );
}
