export const metadata = { title: "Suppression de compte — Gâtinelle" };

export default function SuppressionComptePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Suppression de compte</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Comment demander la suppression de votre compte</h2>
        <p className="text-neutral-700">
          Pour demander la suppression de votre compte Gâtinelle et des données associées,
          écrivez à{" "}
          <a className="text-brand-700 underline" href="mailto:association@gatinemois.fr">
            association@gatinemois.fr
          </a>{" "}
          en indiquant votre nom complet et votre numéro d&apos;adhérent. Votre demande sera
          traitée par l&apos;association sous un délai raisonnable.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Quelles données sont supprimées</h2>
        <p className="text-neutral-700">
          Votre nom, votre email, votre mot de passe et code PIN (déjà stockés sous forme
          chiffrée), et les autres informations de profil sont supprimés.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Quelles données sont conservées, et pourquoi</h2>
        <p className="text-neutral-700">
          Un compte détenant un solde de gâtinelles non nul ou une reconversion en cours ne
          peut pas être supprimé immédiatement : contactez l&apos;association pour convertir
          ou utiliser ce solde au préalable. Par ailleurs, l&apos;historique des transactions
          (achats, paiements, reconversions) est conservé sous forme anonymisée pendant la
          durée requise par les obligations comptables et légales de l&apos;association,
          conformément à notre{" "}
          <a href="/confidentialite" className="text-brand-700 underline">
            politique de confidentialité
          </a>
          .
        </p>
      </section>
    </div>
  );
}
