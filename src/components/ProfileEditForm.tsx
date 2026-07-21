"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MerchantCategory } from "@prisma/client";
import { MERCHANT_CATEGORY_OPTIONS } from "@/lib/merchantCategory";

interface MerchantInfo {
  businessName: string;
  address: string;
  category: MerchantCategory;
  iban: string;
}

interface ProfileEditFormProps {
  fullName: string;
  email: string;
  merchant?: MerchantInfo;
}

export function ProfileEditForm({ fullName, email, merchant }: ProfileEditFormProps) {
  const router = useRouter();
  const [values, setValues] = useState({
    fullName,
    email,
    businessName: merchant?.businessName ?? "",
    address: merchant?.address ?? "",
    category: merchant?.category ?? "",
    iban: merchant?.iban ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: values.fullName,
        email: values.email,
        merchant: merchant
          ? {
              businessName: values.businessName,
              address: values.address,
              category: values.category,
              iban: values.iban,
            }
          : undefined,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        typeof body?.error === "string" ? body.error : "Impossible de mettre à jour le profil."
      );
      return;
    }
    setSuccess("Profil mis à jour.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1">
        Nom complet
        <input
          type="text"
          required
          minLength={2}
          value={values.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Email
        <input
          type="email"
          required
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>

      {merchant && (
        <>
          <label className="flex flex-col gap-1">
            Nom du commerce
            <input
              type="text"
              required
              minLength={2}
              value={values.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Adresse
            <input
              type="text"
              required
              minLength={2}
              value={values.address}
              onChange={(e) => update("address", e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Catégorie
            <select
              required
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            >
              {MERCHANT_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            IBAN (pour les reconversions)
            <input
              type="text"
              required
              minLength={10}
              value={values.iban}
              onChange={(e) => update("iban", e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-leaf-700">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "..." : "Enregistrer"}
      </button>
    </form>
  );
}
