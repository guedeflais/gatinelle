import { getSession } from "next-auth/react";

/**
 * Un compte stand n'a besoin que d'encaisser au comptoir — on l'y envoie
 * directement plutôt que sur le tableau de bord générique (voir NavBar, qui
 * masque aussi les liens non pertinents pour ces comptes).
 */
export async function getPostLoginRedirectPath(): Promise<string> {
  const session = await getSession();
  return session?.user.isEventStand ? "/stand/payer" : "/compte";
}
