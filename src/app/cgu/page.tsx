export const metadata = { title: "Conditions générales d'utilisation — La Gâtinelle" };

export default function CguPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Conditions générales d&apos;utilisation</h1>
      <p className="text-sm text-neutral-500">Dernière mise à jour : juillet 2026</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">1. Objet</h2>
        <p className="text-neutral-700">
          Les présentes conditions générales d&apos;utilisation (CGU) régissent l&apos;usage de
          l&apos;application de gestion de la Gâtinelle, monnaie locale complémentaire de la
          Gâtine Poitevine, éditée par l&apos;association Ici en Gâtine Poitevine -
          Gâtin&apos;émois (« l&apos;association »). L&apos;inscription sur l&apos;application
          vaut acceptation pleine et entière des présentes CGU.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">2. Définitions</h2>
        <ul className="list-inside list-disc text-neutral-700">
          <li>
            <strong>Gâtinelle</strong> : unité de la monnaie locale complémentaire, dont la
            parité est fixe : 1 gâtinelle = 1 euro.
          </li>
          <li>
            <strong>Adhérent</strong> : personne physique (particulier) ou morale (commerçant)
            ayant créé un compte sur l&apos;application.
          </li>
          <li>
            <strong>Commerçant agréé</strong> : adhérent professionnel dont le compte a été
            validé par l&apos;association et qui accepte les paiements en gâtinelles.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">3. Inscription et compte</h2>
        <p className="text-neutral-700">
          L&apos;inscription est ouverte aux particuliers et aux commerçants. Chaque compte se
          voit attribuer un numéro d&apos;adhérent et un code PIN à 4 chiffres, permettant une
          connexion rapide en complément de l&apos;identification par email et mot de passe.
          Après trois échecs de saisie du code PIN, l&apos;accès est bloqué et ne peut être
          débloqué que par un administrateur de l&apos;association. L&apos;adhérent est seul
          responsable de la confidentialité de ses identifiants.
        </p>
        <p className="text-neutral-700">
          Un compte commerçant doit être validé par l&apos;association avant de pouvoir recevoir
          des paiements en gâtinelles. L&apos;association se réserve le droit de refuser ou de
          retirer cet agrément.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">4. Achat de gâtinelles</h2>
        <p className="text-neutral-700">
          Les gâtinelles peuvent être achetées contre des euros par trois moyens : espèces
          (auprès d&apos;un comptoir de change agréé), virement bancaire, ou carte bancaire. Le
          taux de change est fixe : 1 gâtinelle = 1 euro. Les achats par espèces ou virement
          sont crédités après validation manuelle par un bénévole ou un administrateur de
          l&apos;association, une fois les fonds effectivement reçus.
        </p>
        <p className="text-neutral-700">
          <strong>Péremption</strong> : les gâtinelles achetées par un particulier sont valables
          un an à compter de leur date d&apos;achat. Passé ce délai, elles sont périmées et
          perdues, sans possibilité de remboursement. Les gâtinelles détenues par un compte
          commerçant n&apos;expirent pas.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">5. Paiement chez un commerçant agréé</h2>
        <p className="text-neutral-700">
          Un adhérent peut régler ses achats en gâtinelles auprès de tout commerçant agréé, en
          saisissant le code du commerçant et le montant à payer. Le paiement est immédiat et
          irrévocable. L&apos;adhérent doit s&apos;assurer de disposer d&apos;un solde suffisant
          avant de valider un paiement.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">6. Reconversion (commerçants)</h2>
        <p className="text-neutral-700">
          Un commerçant agréé peut demander la reconversion de tout ou partie de son solde de
          gâtinelles en euros. Le montant demandé est immédiatement retiré de son solde
          disponible ; l&apos;association effectue ensuite le virement bancaire correspondant
          vers l&apos;IBAN renseigné par le commerçant, dans un délai raisonnable.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">7. Responsabilités</h2>
        <p className="text-neutral-700">
          L&apos;association s&apos;efforce d&apos;assurer la disponibilité et la sécurité de
          l&apos;application, sans garantie d&apos;absence d&apos;interruption. L&apos;adhérent
          est responsable de l&apos;exactitude des informations qu&apos;il transmet
          (coordonnées bancaires notamment) et de la bonne utilisation de ses identifiants de
          connexion.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">8. Suspension et résiliation</h2>
        <p className="text-neutral-700">
          L&apos;association peut suspendre ou clôturer un compte en cas de non-respect des
          présentes CGU, de fraude avérée ou suspectée, ou à la demande de l&apos;adhérent.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">9. Modification des CGU</h2>
        <p className="text-neutral-700">
          L&apos;association peut modifier les présentes CGU à tout moment. Les adhérents seront
          informés de toute modification substantielle.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">10. Droit applicable</h2>
        <p className="text-neutral-700">
          Les présentes CGU sont soumises au droit français. Tout litige relève de la
          compétence des juridictions françaises.
        </p>
      </section>
    </div>
  );
}
