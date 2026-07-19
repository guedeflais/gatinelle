"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InscriptionFormProps {
  initialAccountType?: "PARTICULIER" | "COMMERCANT";
}

export function InscriptionForm({ initialAccountType = "PARTICULIER" }: InscriptionFormProps) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"PARTICULIER" | "COMMERCANT">(initialAccountType);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [iban, setIban] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberNumber, setMemberNumber] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError("Le code PIN doit comporter exactement 4 chiffres.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("Les deux codes PIN ne correspondent pas.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        password,
        pin,
        accountType,
        merchant:
          accountType === "COMMERCANT" ? { businessName, address, category, iban } : undefined,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible de créer le compte.");
      return;
    }
    const data = await res.json();
    setMemberNumber(data.memberNumber);
  }

  if (memberNumber) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <p className="rounded border border-leaf-300 bg-leaf-50 p-4 text-leaf-900">
          Compte créé ! Votre numéro d&apos;adhérent est{" "}
          <span className="font-mono text-lg font-semibold">{memberNumber}</span>.
          <br />
          Notez-le : avec votre code PIN, il vous servira à vous connecter rapidement en caisse.
        </p>
        {accountType === "COMMERCANT" && (
          <p className="text-neutral-600">
            Votre compte commerçant doit être validé par l&apos;association avant de pouvoir
            recevoir des paiements.
          </p>
        )}
        <button
          onClick={() => router.push("/connexion")}
          className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800"
        >
          Aller à la connexion
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <fieldset className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={accountType === "PARTICULIER"}
            onChange={() => setAccountType("PARTICULIER")}
          />
          Particulier
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={accountType === "COMMERCANT"}
            onChange={() => setAccountType("COMMERCANT")}
          />
          Commerçant
        </label>
      </fieldset>

      <label className="flex flex-col gap-1">
        Nom complet
        <input
          required
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
      <label className="flex flex-col gap-1">
        Mot de passe (8 caractères minimum, pour la gestion de votre compte)
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-neutral-700">
          Code PIN à 4 chiffres (pour payer rapidement en caisse)
        </span>
        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1">
            PIN
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
            Confirmer le PIN
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
      </div>

      {accountType === "COMMERCANT" && (
        <>
          <label className="flex flex-col gap-1">
            Nom du commerce
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Adresse
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Catégorie (ex : boulangerie, librairie...)
            <input
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            IBAN (pour les reconversions en euros)
            <input
              required
              minLength={10}
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "Création..." : "Créer mon compte"}
      </button>
    </form>
  );
}
