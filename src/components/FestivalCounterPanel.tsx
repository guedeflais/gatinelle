"use client";

import { useState } from "react";
import { InscriptionExpressForm } from "@/components/InscriptionExpressForm";
import { CreditAccountForm } from "@/components/CreditAccountForm";
import { CheckBalanceForm } from "@/components/CheckBalanceForm";
import { RefundAccountForm } from "@/components/RefundAccountForm";
import { ConvertAccountForm } from "@/components/ConvertAccountForm";

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

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-medium">Fin de festival : rembourser</h2>
        <p className="max-w-md text-sm text-neutral-600">
          Convertit tout le solde restant du participant et vous indique le montant à lui remettre
          en espèces (commission d&apos;1 € déduite).
        </p>
        <RefundAccountForm />
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-medium">Fin de festival : transformer en compte permanent</h2>
        <p className="max-w-md text-sm text-neutral-600">
          Le participant garde son solde et peut continuer à utiliser la Gâtinelle après le
          festival — génère un code PIN à lui communiquer pour se connecter avec son numéro
          d&apos;adhérent.
        </p>
        <ConvertAccountForm />
      </div>
    </div>
  );
}
