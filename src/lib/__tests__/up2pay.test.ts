import crypto from "crypto";
import { buildPaymentForm, verifySignature, isUp2PayConfigured, PBX_RETOUR } from "@/lib/up2pay";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("buildPaymentForm", () => {
  beforeEach(() => {
    process.env.UP2PAY_SITE = "1999887";
    process.env.UP2PAY_RANG = "32";
    process.env.UP2PAY_IDENTIFIANT = "215";
    process.env.UP2PAY_HMAC_KEY =
      "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
    process.env.UP2PAY_PAYMENT_URL = "https://preprod-tpeweb.e-transactions.fr/php/";
  });

  it("reports configured once env vars are set", () => {
    expect(isUp2PayConfigured()).toBe(true);
  });

  it("builds fields whose HMAC matches an independent recomputation", () => {
    const form = buildPaymentForm({
      transactionId: "tx_abc123",
      amountCents: 5000,
      buyerEmail: "test@example.com",
      origin: "http://localhost:3000",
    });

    const hmacField = form.fields[form.fields.length - 1];
    expect(hmacField.name).toBe("PBX_HMAC");

    const dataFields = form.fields.slice(0, -1);
    const expectedMsg = dataFields.map((f) => `${f.name}=${f.value}`).join("&");
    const binKey = Buffer.from(process.env.UP2PAY_HMAC_KEY!, "hex");
    const expectedHmac = crypto
      .createHmac("sha512", binKey)
      .update(expectedMsg, "utf8")
      .digest("hex")
      .toUpperCase();

    expect(hmacField.value).toBe(expectedHmac);

    const total = dataFields.find((f) => f.name === "PBX_TOTAL");
    const cmd = dataFields.find((f) => f.name === "PBX_CMD");
    const porteur = dataFields.find((f) => f.name === "PBX_PORTEUR");
    const retour = dataFields.find((f) => f.name === "PBX_RETOUR");
    expect(total?.value).toBe("5000");
    expect(cmd?.value).toBe("tx_abc123");
    expect(porteur?.value).toBe("test@example.com");
    expect(retour?.value).toBe(PBX_RETOUR);
  });

  it("throws when required config is missing", () => {
    delete process.env.UP2PAY_HMAC_KEY;
    expect(() =>
      buildPaymentForm({
        transactionId: "tx",
        amountCents: 100,
        buyerEmail: "a@b.com",
        origin: "http://localhost:3000",
      })
    ).toThrow();
  });
});

describe("verifySignature", () => {
  // Reproduit le mécanisme Up2Pay : signature RSA-SHA1, encodée en base64
  // puis URL-encodée, placée après la dernière valeur de la querystring.
  function signAndAppend(data: string, privateKey: string): string {
    const signature = crypto.sign("RSA-SHA1", Buffer.from(data, "utf8"), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    });
    const encodedSig = encodeURIComponent(signature.toString("base64"));
    return `${data}&sign=${encodedSig}`;
  }

  let publicKey: string;
  let privateKey: string;

  beforeAll(() => {
    const keys = crypto.generateKeyPairSync("rsa", {
      modulusLength: 1024,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
  });

  beforeEach(() => {
    process.env.UP2PAY_PUBLIC_KEY = publicKey;
  });

  it("accepts a correctly signed message", () => {
    const query = signAndAppend("mt=5000&ref=tx_abc123&trans=71256&erreur=00000", privateKey);
    expect(verifySignature(query)).toBe(true);
  });

  it("rejects a tampered message", () => {
    const query = signAndAppend("mt=5000&ref=tx_abc123&trans=71256&erreur=00000", privateKey);
    const tampered = query.replace("mt=5000", "mt=999999");
    expect(verifySignature(tampered)).toBe(false);
  });

  it("rejects when no public key is configured", () => {
    delete process.env.UP2PAY_PUBLIC_KEY;
    const query = signAndAppend("mt=5000&ref=tx_abc123&erreur=00000", privateKey);
    expect(verifySignature(query)).toBe(false);
  });
});
