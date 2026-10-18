import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostedCheckoutStatus, interpretHostedCheckout } from "@/lib/cawl";
import { settleCardPurchase } from "@/lib/cardPurchase";

// Retour du client depuis la page de paiement CAWL (returnUrl). Les paramètres
// de l'URL (hostedCheckoutId, RETURNMAC) ne sont qu'un moyen de retrouver la
// transaction : le résultat réel est toujours demandé à CAWL par un appel
// authentifié, donc une URL de retour forgée ne peut rien créditer. Pas de
// session requise (l'appli mobile ouvre ce flux dans une WebView sans cookie).
//
// On redirige ensuite vers les mêmes URL qu'avant (/compte?achat=succes, etc.) :
// le site les affiche, et l'appli mobile les intercepte pour afficher son
// propre écran de résultat.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = (path: string) => NextResponse.redirect(new URL(path, url.origin), 303);

  const hostedCheckoutId = url.searchParams.get("hostedCheckoutId");
  if (!hostedCheckoutId) return redirect("/acheter");

  const transaction = await prisma.transaction.findUnique({
    where: { providerReference: hostedCheckoutId },
    select: { id: true },
  });
  if (!transaction) return redirect("/acheter");

  let outcome;
  try {
    outcome = interpretHostedCheckout(await getHostedCheckoutStatus(hostedCheckoutId));
  } catch (err) {
    // CAWL injoignable : le webhook finira de régler le paiement.
    console.error("Lecture du statut CAWL impossible :", err);
    return redirect("/compte?achat=attente");
  }

  const result = await settleCardPurchase(transaction.id, outcome);

  switch (outcome.kind) {
    case "paid":
      return redirect(result === "ignored" ? "/compte?achat=attente" : "/compte?achat=succes");
    case "refused":
      return redirect("/acheter?achat=refuse");
    case "cancelled":
      return redirect("/acheter?achat=annule");
    default:
      return redirect("/compte?achat=attente");
  }
}
