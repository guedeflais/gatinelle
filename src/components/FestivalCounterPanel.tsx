"use client";

import { useState } from "react";
import { InscriptionExpressForm } from "@/components/InscriptionExpressForm";
import { CreditAccountForm } from "@/components/CreditAccountForm";
import { CheckBalanceForm } from "@/components/CheckBalanceForm";

export function FestivalCounterPanel() {
  const [lastMemberNumber, setLastMemberNumber] = useState<string | undefined>();

  return (
    <div className="flex flex-col gap-10">
      <InscriptionExpressForm onCreated={setLastMemberNumber} />

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-medium">Créditer un compte</h2>
        <p className="max-w-md text-sm text-neutral-600">
          Après avoir encaissé des espèces au comptoir, créditez directement le compte du
          participant à partir de son numéro d&apos;adhérent — inutile qu&apos;il se
          connecte lui-même.
        </p>
        <CreditAccountForm initialMemberNumber={lastMemberNumber} />
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-medium">Consulter un solde</h2>
        <p className="max-w-md text-sm text-neutral-600">
          Scannez la carte du participant (ou saisissez son numéro d&apos;adhérent) pour lui
          annoncer le solde restant.
        </p>
        <CheckBalanceForm />
      </div>
    </div>
  );
}
