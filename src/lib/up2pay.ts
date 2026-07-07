import crypto from "crypto";

// Intégration du protocole "PBX_" (historiquement Paybox) utilisé par
// Up2Pay e-Transactions (Crédit Agricole) pour la page de paiement hébergée.
// Référence : Manuel d'intégration Up2pay e-Transactions (Crédit Agricole S.A,
// version du 01/03/2021) + Kit d'intégration PHP officiel (ca-moncommerce.com).
//
// Principe :
// - Notre appel vers la page de paiement est authentifié par une signature
//   HMAC-SHA512 (PBX_HMAC), calculée sur la concaténation "NOM=VALEUR"
//   (données brutes, non URL-encodées) de tous les champs, séparés par "&",
//   dans le MÊME ordre que celui du formulaire envoyé.
// - Les réponses d'Up2Pay (retour navigateur et notification serveur IPN)
//   sont authentifiées par une signature RSA-SHA1 (couple clé publique/privée
//   propre à Up2Pay), à vérifier avec leur clé publique (PBX_RETOUR doit
//   demander la donnée "K" en dernière position).

export interface Up2PayField {
  name: string;
  value: string;
}

function readConfig() {
  return {
    site: process.env.UP2PAY_SITE ?? "",
    rang: process.env.UP2PAY_RANG ?? "",
    identifiant: process.env.UP2PAY_IDENTIFIANT ?? "",
    hmacKeyHex: process.env.UP2PAY_HMAC_KEY ?? "",
    paymentUrl: process.env.UP2PAY_PAYMENT_URL || "https://recette-tpeweb.e-transactions.fr/php/",
    publicKeyPem: process.env.UP2PAY_PUBLIC_KEY ?? "",
  };
}

export function isUp2PayConfigured(): boolean {
  const c = readConfig();
  return Boolean(c.site && c.rang && c.identifiant && c.hmacKeyHex);
}

// Les variables demandées en retour (PBX_RETOUR), sous forme "nom:lettre".
// La signature ("sign:K") doit impérativement être la DERNIÈRE demandée pour
// que l'ensemble des données précédentes soit couvert par la signature.
export const PBX_RETOUR = "mt:M;ref:R;trans:S;erreur:E;sign:K";

export interface BuildPaymentFormParams {
  transactionId: string;
  amountCents: number;
  buyerEmail: string;
  origin: string;
}

export interface Up2PayForm {
  actionUrl: string;
  fields: Up2PayField[];
}

/**
 * Construit le formulaire (URL + champs ordonnés) à soumettre en POST vers
 * la page de paiement Up2Pay. L'ordre des champs est arbitraire mais DOIT
 * être strictement identique entre la chaîne signée et le formulaire envoyé.
 */
export function buildPaymentForm({
  transactionId,
  amountCents,
  buyerEmail,
  origin,
}: BuildPaymentFormParams): Up2PayForm {
  const config = readConfig();
  if (!isUp2PayConfigured()) {
    throw new Error(
      "Up2Pay n'est pas configuré (UP2PAY_SITE / UP2PAY_RANG / UP2PAY_IDENTIFIANT / UP2PAY_HMAC_KEY manquants)."
    );
  }

  const fields: Up2PayField[] = [
    { name: "PBX_SITE", value: config.site },
    { name: "PBX_RANG", value: config.rang },
    { name: "PBX_IDENTIFIANT", value: config.identifiant },
    { name: "PBX_SOURCE", value: "RWD" },
    { name: "PBX_TOTAL", value: String(amountCents) },
    { name: "PBX_DEVISE", value: "978" },
    { name: "PBX_CMD", value: transactionId },
    { name: "PBX_PORTEUR", value: buyerEmail },
    { name: "PBX_REPONDRE_A", value: `${origin}/api/up2pay/ipn` },
    { name: "PBX_RETOUR", value: PBX_RETOUR },
    { name: "PBX_EFFECTUE", value: `${origin}/compte?achat=succes` },
    { name: "PBX_REFUSE", value: `${origin}/acheter?achat=refuse` },
    { name: "PBX_ANNULE", value: `${origin}/acheter?achat=annule` },
    { name: "PBX_ATTENTE", value: `${origin}/compte?achat=attente` },
    { name: "PBX_HASH", value: "SHA512" },
    { name: "PBX_TIME", value: new Date().toISOString() },
  ];

  const messageToSign = fields.map((f) => `${f.name}=${f.value}`).join("&");
  const binaryKey = Buffer.from(config.hmacKeyHex, "hex");
  const hmac = crypto
    .createHmac("sha512", binaryKey)
    .update(messageToSign, "utf8")
    .digest("hex")
    .toUpperCase();

  return {
    actionUrl: config.paymentUrl,
    fields: [...fields, { name: "PBX_HMAC", value: hmac }],
  };
}

/**
 * Vérifie la signature RSA-SHA1 d'un appel de retour (redirection navigateur
 * ou IPN). `rawQueryString` doit être la chaîne de requête brute reçue
 * (encore URL-encodée), sans le "?" initial.
 * Reproduit fidèlement l'algorithme de référence fourni par Crédit Agricole
 * (fonction GetSignedData du kit d'intégration officiel) : la signature est
 * la valeur après le dernier "=", les données signées sont tout ce qui
 * précède le dernier "&".
 */
export function verifySignature(rawQueryString: string): boolean {
  const config = readConfig();
  if (!config.publicKeyPem) return false;

  const lastAmp = rawQueryString.lastIndexOf("&");
  if (lastAmp === -1) return false;
  const data = rawQueryString.slice(0, lastAmp);
  const eqIndex = rawQueryString.indexOf("=", lastAmp);
  if (eqIndex === -1) return false;
  const sigRaw = rawQueryString.slice(eqIndex + 1);

  try {
    const signature = Buffer.from(decodeURIComponent(sigRaw), "base64");
    const verifier = crypto.createVerify("RSA-SHA1");
    verifier.update(data, "utf8");
    return verifier.verify(config.publicKeyPem, signature);
  } catch {
    return false;
  }
}
