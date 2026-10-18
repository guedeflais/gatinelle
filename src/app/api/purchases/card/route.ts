import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { eurosToCents } from "@/lib/money";
import { isCawlConfigured } from "@/lib/cawl";
import { startCardPurchase } from "@/lib/cardPurchase";

// Montant minimum de 1 € (1 gâtinelle) : choix métier, repris par AcheterForm.
const schema = z.object({ amountEuros: z.number().min(1).max(10000) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (!isCawlConfigured()) {
    return NextResponse.json(
      { error: "Le paiement par carte n'est pas encore configuré." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { redirectUrl } = await startCardPurchase({
      userId: session.user.id,
      email: session.user.email,
      amountCents: eurosToCents(parsed.data.amountEuros),
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({ redirectUrl }, { status: 201 });
  } catch (err) {
    console.error("Création du paiement par carte impossible :", err);
    return NextResponse.json(
      { error: "Impossible de lancer le paiement par carte. Réessayez dans un instant." },
      { status: 502 }
    );
  }
}
