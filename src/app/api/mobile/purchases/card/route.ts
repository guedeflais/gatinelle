import { z } from "zod";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { eurosToCents } from "@/lib/money";
import { isCawlConfigured } from "@/lib/cawl";
import { startCardPurchase } from "@/lib/cardPurchase";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

// Montant minimum de 1 € (1 gâtinelle) : choix métier, repris par l'appli.
const schema = z.object({ amountEuros: z.number().min(1).max(10000) });

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  const user = token ? await getUserFromMobileToken(token) : null;
  if (!user) {
    return corsJson({ error: "Non authentifié." }, { status: 401 });
  }

  if (!isCawlConfigured()) {
    return corsJson({ error: "Le paiement par carte n'est pas encore configuré." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return corsJson({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { redirectUrl } = await startCardPurchase({
      userId: user.id,
      email: user.email,
      amountCents: eurosToCents(parsed.data.amountEuros),
      origin: new URL(request.url).origin,
    });
    return corsJson({ redirectUrl }, { status: 201 });
  } catch (err) {
    console.error("Création du paiement par carte impossible :", err);
    return corsJson(
      { error: "Impossible de lancer le paiement par carte. Réessayez dans un instant." },
      { status: 502 }
    );
  }
}
