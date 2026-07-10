export const metadata = { title: "Politique de confidentialité — La Gâtinelle" };

export default function ConfidentialitePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Politique de confidentialité</h1>
      <p className="text-sm text-neutral-500">Dernière mise à jour : juillet 2026</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">1. Responsable du traitement</h2>
        <p className="text-neutral-700">
          Le responsable du traitement des données personnelles collectées sur cette
          application est l&apos;association Ici en Gâtine Poitevine - Gâtin&apos;émois, 36
          route de Thouars, 79200 Châtillon-sur-Thouet — contact :{" "}
          <a className="text-brand-700 underline" href="mailto:association@gatinemois.fr">
            association@gatinemois.fr
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">2. Données collectées</h2>
        <ul className="list-inside list-disc text-neutral-700">
          <li>Nom complet et adresse email</li>
          <li>Mot de passe et code PIN, sous forme chiffrée (hachage), jamais en clair</li>
          <li>Numéro d&apos;adhérent</li>
          <li>
            Pour les commerçants : nom du commerce, adresse, catégorie, IBAN (pour les
            reconversions en euros)
          </li>
          <li>Historique des transactions (achats, paiements, reconversions)</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">3. Finalités et base légale</h2>
        <p className="text-neutral-700">
          Ces données sont traitées pour la gestion du compte adhérent, le traitement des
          achats et paiements en gâtinelles, la prévention de la fraude (verrouillage du code
          PIN après plusieurs échecs), et le respect des obligations comptables de
          l&apos;association. Le traitement repose sur l&apos;exécution du contrat
          d&apos;adhésion et, pour les obligations comptables, sur le respect d&apos;une
          obligation légale.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">4. Destinataires des données</h2>
        <p className="text-neutral-700">
          Les données sont accessibles aux membres habilités de l&apos;association
          (administrateurs, bénévoles de comptoir) dans la limite de leurs fonctions. Pour les
          paiements par carte bancaire, les données de paiement transitent par Up2Pay
          e-Transactions (Crédit Agricole) et ne sont jamais stockées par
          l&apos;application. L&apos;hébergement technique est assuré par Vercel Inc. et
          Prisma (Prisma Data, Inc.) — voir les{" "}
          <a href="/mentions-legales" className="text-brand-700 underline">
            mentions légales
          </a>{" "}
          pour le détail.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">5. Durée de conservation</h2>
        <p className="text-neutral-700">
          Les données sont conservées pendant toute la durée de l&apos;adhésion, puis archivées
          pendant la durée nécessaire au respect des obligations légales et comptables de
          l&apos;association, avant suppression.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">6. Vos droits</h2>
        <p className="text-neutral-700">
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
          d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, de
          portabilité et d&apos;opposition sur vos données personnelles. Vous pouvez exercer ces
          droits en écrivant à{" "}
          <a className="text-brand-700 underline" href="mailto:association@gatinemois.fr">
            association@gatinemois.fr
          </a>
          . Vous disposez également du droit d&apos;introduire une réclamation auprès de la
          CNIL (
          <a
            className="text-brand-700 underline"
            href="https://www.cnil.fr"
            target="_blank"
            rel="noreferrer"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">7. Sécurité</h2>
        <p className="text-neutral-700">
          Les mots de passe et codes PIN sont stockés sous forme hachée (non réversible), les
          échanges sont chiffrés (HTTPS), et l&apos;accès administrateur est limité aux membres
          habilités de l&apos;association.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">8. Cookies</h2>
        <p className="text-neutral-700">
          L&apos;application utilise uniquement un cookie de session strictement nécessaire à
          l&apos;authentification. Aucun cookie de mesure d&apos;audience ou publicitaire
          n&apos;est utilisé.
        </p>
      </section>
    </div>
  );
}
