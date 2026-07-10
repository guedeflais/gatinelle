export const metadata = { title: "Mentions légales — La Gâtinelle" };

export default function MentionsLegalesPage() {
  return (
    <div className="prose flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mentions légales</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Éditeur du site</h2>
        <p className="text-neutral-700">
          Le présent site est édité par l&apos;association{" "}
          <strong>Ici en Gâtine Poitevine - Gâtin&apos;émois</strong>, association loi 1901.
        </p>
        <ul className="list-inside list-disc text-neutral-700">
          <li>Siège social : 36 route de Thouars, 79200 Châtillon-sur-Thouet</li>
          <li>N° RNA : W792003978</li>
          <li>N° SIRET : 79832817500020</li>
          <li>Responsables de la publication : Jean-Michel Fourniau, Jean-Philippe Brossard</li>
          <li>
            Contact :{" "}
            <a className="text-brand-700 underline" href="mailto:association@gatinemois.fr">
              association@gatinemois.fr
            </a>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Hébergement</h2>
        <p className="text-neutral-700">
          Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789,
          États-Unis (
          <a className="text-brand-700 underline" href="https://vercel.com">
            vercel.com
          </a>
          ).
        </p>
        <p className="text-neutral-700">
          La base de données est hébergée par Prisma (Prisma Data, Inc.) — voir leur{" "}
          <a
            className="text-brand-700 underline"
            href="https://www.prisma.io/privacy"
            target="_blank"
            rel="noreferrer"
          >
            politique de confidentialité
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Propriété intellectuelle</h2>
        <p className="text-neutral-700">
          La marque et le logo « La Gâtinelle » appartiennent à l&apos;association. Toute
          reproduction sans autorisation est interdite.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Signalement</h2>
        <p className="text-neutral-700">
          Pour tout signalement de contenu ou réclamation concernant le site, contactez{" "}
          <a className="text-brand-700 underline" href="mailto:association@gatinemois.fr">
            association@gatinemois.fr
          </a>
          .
        </p>
      </section>
    </div>
  );
}
