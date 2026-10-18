import { NextResponse } from "next/server";
import { parseWebhookEvent, verifyWebhookSignature } from "@/lib/cawl";
import { settleCardPurchase } from "@/lib/cardPurchase";

// Webhook CAWL : appelé de serveur à serveur à chaque évènement de paiement.
// Il couvre le cas où le client ferme son navigateur avant le retour sur le
// site. À déclarer dans le portail marchand CAWL (Développeur > Webhooks) :
// URL = https://www.gatinelle.fr/api/cawl/webhook, avec la clé/secret saisis
// dans CAWL_WEBHOOK_KEY_ID / CAWL_WEBHOOK_SECRET.
//
// CAWL attend un code 2xx pour chaque évènement reçu (sinon 5 nouvelles
// tentatives étalées sur 24 h) : après vérification de la signature on répond
// donc 200 même pour un évènement qui ne nous concerne pas. La signature se
// calcule sur le corps BRUT, d'où request.text() et non request.json().
export async function POST(request: Request) {
  const rawBody = await request.text();

  const valid = verifyWebhookSignature(
    rawBody,
    request.headers.get("X-GCS-Signature"),
    request.headers.get("X-GCS-KeyId")
  );
  if (!valid) {
    return new NextResponse(null, { status: 401 });
  }

  const event = parseWebhookEvent(rawBody);
  if (event) {
    await settleCardPurchase(event.transactionId, event.outcome);
  }

  return new NextResponse(null, { status: 200 });
}
