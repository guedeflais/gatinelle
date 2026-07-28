"use client";

import { useEffect, useState } from "react";
import { isNfcSupported, scanNfcTag } from "@/lib/nfc";

interface CreditAccountFormProps {
  initialMemberNumber?: string;
}

export function CreditAccountForm({ initialMemberNumber }: CreditAccountFormProps = {}) {
  const [memberNumber, setMemberNumber] = useState(initialMemberNumber ?? "");
  const [scannedTagUid, setScannedTagUid] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nfcSupported = isNfcSupported();

  useEffect(() => {
    if (initialMemberNumber) {
      setMemberNumber(initialMemberNumber);
      setScannedTagUid(null);
    }
  }, [initialMemberNumber]);

  async function handleScan() {
    setError(null);
    setSuccess(null);
    setScanning(true);
    try {
      const tagUid = await scanNfcTag();
      setScannedTagUid(tagUid);
      setMemberNumber("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de lecture NFC.");
    } finally {
      setScanning(false);
    }
  }

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
      body: JSON.stringify(
        scannedTagUid ? { tagUid: scannedTagUid, amountEuros } : { memberNumber, amountEuros }
      ),
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
    setScannedTagUid(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      {nfcSupported && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="self-start rounded border border-brand-700 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {scanning ? "Approchez la carte…" : "Scanner la carte"}
          </button>
          {scannedTagUid && <p className="text-sm text-leaf-700">Carte détectée ✓</p>}
        </div>
      )}
      <label className="flex flex-col gap-1">
        Numéro d&apos;adhérent {nfcSupported && "(si pas de carte scannée)"}
        <input
          type="text"
          required={!scannedTagUid}
          disabled={!!scannedTagUid}
          value={memberNumber}
          onChange={(e) => {
            setMemberNumber(e.target.value);
            setScannedTagUid(null);
          }}
          className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
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
