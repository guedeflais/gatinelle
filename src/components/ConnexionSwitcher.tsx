"use client";

import { useState } from "react";
import { PinConnexionForm } from "@/components/PinConnexionForm";
import { ConnexionForm } from "@/components/ConnexionForm";

export function ConnexionSwitcher() {
  const [mode, setMode] = useState<"pin" | "password">("pin");

  return (
    <div className="flex flex-col gap-4">
      {mode === "pin" ? <PinConnexionForm /> : <ConnexionForm />}
      <button
        type="button"
        onClick={() => setMode(mode === "pin" ? "password" : "pin")}
        className="self-start text-sm text-brand-700 underline"
      >
        {mode === "pin"
          ? "Se connecter avec email et mot de passe"
          : "Se connecter avec numéro d'adhérent et PIN"}
      </button>
    </div>
  );
}
