"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Method = "CASH" | "TRANSFER" | "CARD";

export function AcheterForm({ associationIban }: { associationIban: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmation(null);
    const amountEuros = Number(amount);
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      setError("Montant invalide.");
      return;
    }

    setLoading(true);

    if (method === "CARD") {
      const res = await fetch("/api/purchases/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountEuros }),
      });
      if (!res.ok) {
        setLoading(false);
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Impossible de lancer le paiement.");
        return;
      }
      const { actionUrl, fields } = (await res.json()) as {
        actionUrl: string;
        fields: { name: string; value: string }[];
      };
      // Up2Pay exige une vraie soumission de formulaire POST (pas une simple
      // redirection GET) : on construit et soumet un formulaire caché.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = actionUrl;
      for (const field of fields) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = field.name;
        input.value = field.value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      return;
    }

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountEuros, method }),
    });
    setLoading(false);

    if (!res.ok) {
      setError("Impossible d'enregistrer l'achat.");
      return;
    }

    if (method === "CASH") {
      setConfirmation(
        "Demande enregistrée. Présentez-vous à un comptoir de change avec les espèces pour valider votre achat."
      );
    } else {
      setConfirmation(
        `Demande enregistrée. Effectuez un virement de ${amountEuros} € vers ${associationIban} en indiquant votre nom. Vos gâtinelles seront créditées après vérification par l'association.`
      );
    }
    router.refresh();
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Montant (en euros, 1 € = 1 gâtinelle)
          <input
            type="number"
            min="1"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <fieldset className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={method === "CASH"}
              onChange={() => setMethod("CASH")}
            />
            Espèces (comptoir de change)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={method === "TRANSFER"}
              onChange={() => setMethod("TRANSFER")}
            />
            Virement bancaire
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={method === "CARD"} onChange={() => setMethod("CARD")} />
            Carte bancaire
          </label>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "Envoi..." : "Valider ma demande d'achat"}
        </button>
      </form>
      {confirmation && (
        <p className="rounded border border-leaf-300 bg-leaf-50 p-4 text-leaf-900">
          {confirmation}
        </p>
      )}
    </div>
  );
}
