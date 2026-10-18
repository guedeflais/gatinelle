import crypto from "crypto";

// Intégration de CAWL E-COMMERCE (Crédit Agricole / Worldline) : page de
// paiement hébergée ("Hosted Checkout"). Référence :
// https://docs.ecommerce.cawl-solutions.fr
//
// Principe :
// - On crée une session de paiement côté serveur (CreateHostedCheckout, API
//   REST authentifiée par une signature HMAC-SHA256 "GCS v1HMAC"), puis on
//   redirige le client vers l'`redirectUrl` renvoyée.
// - Au retour du client, on interroge nous-mêmes CAWL (GetHostedCheckout) pour
//   connaître le résultat : on ne fait jamais confiance aux paramètres de
//   l'URL de retour.
// - CAWL appelle aussi un webhook (POST signé) à chaque évènement de paiement,
//   ce qui couvre le cas où le client ferme son navigateur avant le retour.
// Aucune donnée de carte ne transite par notre serveur.

export type HostedCheckoutStatus = {
  status?: string;
  createdPaymentOutput?: {
    payment?: {
      id?: string;
      status?: string;
      paymentOutput?: {
        amountOfMoney?: { amount?: number; currencyCode?: string };
        references?: { merchantReference?: string };
      };
    };
    paymentStatusCategory?: string;
  };
};

function readConfig() {
  return {
    merchantId: process.env.CAWL_MERCHANT_ID ?? "",
    apiKeyId: process.env.CAWL_API_KEY_ID ?? "",
    apiSecret: process.env.CAWL_API_SECRET ?? "",
    apiUrl: (process.env.CAWL_API_URL || "https://payment.preprod.cawl-solutions.fr").replace(/\/+$/, ""),
    webhookKeyId: process.env.CAWL_WEBHOOK_KEY_ID ?? "",
    webhookSecret: process.env.CAWL_WEBHOOK_SECRET ?? "",
  };
}

export function isCawlConfigured(): boolean {
  const c = readConfig();
  return Boolean(c.merchantId && c.apiKeyId && c.apiSecret);
}

/**
 * En-têtes d'une requête signée (authentification manuelle, sans SDK).
 * Chaîne signée : MÉTHODE \n Content-Type \n Date \n chemin \n — le
 * Content-Type est une chaîne vide (et non omis) pour une requête sans corps.
 * CAWL rejette une requête dont la date a plus de 5 minutes d'écart.
 */
export function buildAuthHeaders(params: {
  method: "GET" | "POST";
  path: string;
  apiKeyId: string;
  apiSecret: string;
  date?: Date;
}): Record<string, string> {
  const date = (params.date ?? new Date()).toUTCString();
  const contentType = params.method === "POST" ? "application/json" : "";
  const stringToSign = `${params.method}\n${contentType}\n${date}\n${params.path}\n`;
  const signature = crypto
    .createHmac("sha256", params.apiSecret)
    .update(stringToSign, "utf8")
    .digest("base64");

  const headers: Record<string, string> = {
    Authorization: `GCS v1HMAC:${params.apiKeyId}:${signature}`,
    Date: date,
  };
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

async function callApi<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const config = readConfig();
  if (!isCawlConfigured()) {
    throw new Error(
      "CAWL n'est pas configuré (CAWL_MERCHANT_ID / CAWL_API_KEY_ID / CAWL_API_SECRET manquants)."
    );
  }

  const headers = buildAuthHeaders({
    method,
    path,
    apiKeyId: config.apiKeyId,
    apiSecret: config.apiSecret,
  });
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`CAWL ${method} ${path} → HTTP ${response.status} ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

export interface CreateHostedCheckoutParams {
  transactionId: string;
  amountCents: number;
  buyerEmail: string;
  origin: string;
}

export interface HostedCheckoutSession {
  hostedCheckoutId: string;
  redirectUrl: string;
}

/**
 * Crée la session de paiement. `transactionId` sert de référence marchand
 * (merchantReference) : c'est elle que CAWL nous renvoie dans les webhooks.
 * Le retour du client arrive sur /api/cawl/retour, qui redirige ensuite vers
 * /compte?achat=... ou /acheter?achat=... (voir cette route).
 */
export async function createHostedCheckout({
  transactionId,
  amountCents,
  buyerEmail,
  origin,
}: CreateHostedCheckoutParams): Promise<HostedCheckoutSession> {
  const { merchantId } = readConfig();
  const result = await callApi<{
    hostedCheckoutId?: string;
    redirectUrl?: string;
    partialRedirectUrl?: string;
  }>("POST", `/v2/${merchantId}/hostedcheckouts`, {
    order: {
      amountOfMoney: { currencyCode: "EUR", amount: amountCents },
      references: { merchantReference: transactionId },
      customer: { contactDetails: { emailAddress: buyerEmail } },
    },
    hostedCheckoutSpecificInput: {
      returnUrl: `${origin}/api/cawl/retour`,
    },
  });

  const redirectUrl =
    result.redirectUrl ?? (result.partialRedirectUrl ? `https://payment.${result.partialRedirectUrl}` : undefined);
  if (!result.hostedCheckoutId || !redirectUrl || !redirectUrl.startsWith("https://")) {
    throw new Error("Réponse CAWL inattendue à la création de la session de paiement.");
  }
  return { hostedCheckoutId: result.hostedCheckoutId, redirectUrl };
}

export async function getHostedCheckoutStatus(hostedCheckoutId: string): Promise<HostedCheckoutStatus> {
  const { merchantId } = readConfig();
  return callApi<HostedCheckoutStatus>(
    "GET",
    `/v2/${merchantId}/hostedcheckouts/${encodeURIComponent(hostedCheckoutId)}`
  );
}

// Résultat d'un paiement, indépendant de la source (retour client ou webhook).
export type CardOutcome =
  | { kind: "paid"; paymentId?: string; amountCents?: number; currencyCode?: string }
  | { kind: "pending" }
  | { kind: "refused" }
  | { kind: "cancelled" };

/**
 * Interprète la réponse de GetHostedCheckout. On ne considère le paiement
 * comme encaissé (et on ne crédite) que lorsque le paiement est CAPTURED :
 * une simple autorisation (PENDING_CAPTURE) ou une capture en cours
 * (CAPTURE_REQUESTED) reste "en attente" — le webhook payment.captured
 * déclenchera le crédit une fois les fonds réellement capturés.
 */
export function interpretHostedCheckout(status: HostedCheckoutStatus): CardOutcome {
  if (status.status === "CANCELLED_BY_CONSUMER") return { kind: "cancelled" };
  if (status.status === "CLIENT_NOT_ELIGIBLE_FOR_SELECTED_PAYMENT_PRODUCT") return { kind: "refused" };
  if (status.status !== "PAYMENT_CREATED") return { kind: "pending" };

  const output = status.createdPaymentOutput;
  if (output?.paymentStatusCategory === "REJECTED") return { kind: "refused" };
  if (output?.paymentStatusCategory !== "SUCCESSFUL") return { kind: "pending" };

  const payment = output.payment;
  if (payment?.status !== "CAPTURED") return { kind: "pending" };
  return {
    kind: "paid",
    paymentId: payment.id,
    amountCents: payment.paymentOutput?.amountOfMoney?.amount,
    currencyCode: payment.paymentOutput?.amountOfMoney?.currencyCode,
  };
}

/**
 * Vérifie la signature d'un webhook : X-GCS-Signature est le HMAC-SHA256
 * (base64) du corps BRUT de la requête, calculé avec le secret du webhook
 * (portail marchand, Développeur > Webhooks) ; X-GCS-KeyId identifie la clé.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  keyIdHeader: string | null
): boolean {
  const { webhookKeyId, webhookSecret } = readConfig();
  if (!webhookSecret || !signatureHeader || !keyIdHeader) return false;
  if (webhookKeyId && keyIdHeader !== webhookKeyId) return false;

  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest();
  const received = Buffer.from(signatureHeader, "base64");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export interface CardWebhookResult {
  transactionId: string;
  outcome: CardOutcome;
}

/**
 * Extrait d'un évènement webhook la transaction concernée et le résultat.
 * Seul `payment.captured` crédite : un `payment.rejected` n'est pas définitif
 * (le client peut retenter avec une autre carte dans la même session), le
 * refus définitif est constaté au retour du client (voir /api/cawl/retour).
 */
export function parseWebhookEvent(rawBody: string): CardWebhookResult | null {
  let event: {
    type?: string;
    payment?: {
      id?: string;
      status?: string;
      paymentOutput?: {
        amountOfMoney?: { amount?: number; currencyCode?: string };
        references?: { merchantReference?: string };
      };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return null;
  }

  const transactionId = event.payment?.paymentOutput?.references?.merchantReference;
  if (event.type !== "payment.captured" || !transactionId) return null;

  return {
    transactionId,
    outcome: {
      kind: "paid",
      paymentId: event.payment?.id,
      amountCents: event.payment?.paymentOutput?.amountOfMoney?.amount,
      currencyCode: event.payment?.paymentOutput?.amountOfMoney?.currencyCode,
    },
  };
}
