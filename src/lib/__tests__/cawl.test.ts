import crypto from "crypto";
import {
  buildAuthHeaders,
  createHostedCheckout,
  getHostedCheckoutStatus,
  interpretHostedCheckout,
  isCawlConfigured,
  parseWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/cawl";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.CAWL_MERCHANT_ID = "PSPID123";
  process.env.CAWL_API_KEY_ID = "key-id-1";
  process.env.CAWL_API_SECRET = "api-secret-1";
  process.env.CAWL_API_URL = "https://payment.preprod.cawl-solutions.fr";
  process.env.CAWL_WEBHOOK_KEY_ID = "wh-key-1";
  process.env.CAWL_WEBHOOK_SECRET = "wh-secret-1";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.restoreAllMocks();
});

describe("isCawlConfigured", () => {
  it("is true once merchant id and API key/secret are set", () => {
    expect(isCawlConfigured()).toBe(true);
  });

  it("is false when a credential is missing", () => {
    delete process.env.CAWL_API_SECRET;
    expect(isCawlConfigured()).toBe(false);
  });
});

describe("buildAuthHeaders", () => {
  const date = new Date("2026-05-18T10:00:00Z");

  it("signs METHOD, content-type, date and path with HMAC-SHA256 (POST)", () => {
    const headers = buildAuthHeaders({
      method: "POST",
      path: "/v2/PSPID123/hostedcheckouts",
      apiKeyId: "key-id-1",
      apiSecret: "api-secret-1",
      date,
    });

    const stringToSign =
      "POST\napplication/json\nMon, 18 May 2026 10:00:00 GMT\n/v2/PSPID123/hostedcheckouts\n";
    const expected = crypto.createHmac("sha256", "api-secret-1").update(stringToSign).digest("base64");

    expect(headers.Date).toBe("Mon, 18 May 2026 10:00:00 GMT");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe(`GCS v1HMAC:key-id-1:${expected}`);
  });

  it("uses an empty content-type (and sends none) for a GET", () => {
    const headers = buildAuthHeaders({
      method: "GET",
      path: "/v2/PSPID123/hostedcheckouts/abc",
      apiKeyId: "key-id-1",
      apiSecret: "api-secret-1",
      date,
    });

    const stringToSign = "GET\n\nMon, 18 May 2026 10:00:00 GMT\n/v2/PSPID123/hostedcheckouts/abc\n";
    const expected = crypto.createHmac("sha256", "api-secret-1").update(stringToSign).digest("base64");

    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers.Authorization).toBe(`GCS v1HMAC:key-id-1:${expected}`);
  });
});

describe("createHostedCheckout", () => {
  it("posts the order and returns the hosted checkout id and redirect url", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          hostedCheckoutId: "hc-123",
          redirectUrl: "https://payment.preprod.cawl-solutions.fr/hostedcheckout/PaymentMethods/Selection/abc",
          RETURNMAC: "mac",
        }),
        { status: 201 }
      )
    );

    const session = await createHostedCheckout({
      transactionId: "tx_1",
      amountCents: 2550,
      buyerEmail: "membre@example.com",
      origin: "https://www.gatinelle.fr",
    });

    expect(session).toEqual({
      hostedCheckoutId: "hc-123",
      redirectUrl: "https://payment.preprod.cawl-solutions.fr/hostedcheckout/PaymentMethods/Selection/abc",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://payment.preprod.cawl-solutions.fr/v2/PSPID123/hostedcheckouts");
    expect((init as RequestInit).method).toBe("POST");
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toMatch(
      /^GCS v1HMAC:key-id-1:.+/
    );

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.order.amountOfMoney).toEqual({ currencyCode: "EUR", amount: 2550 });
    expect(body.order.references.merchantReference).toBe("tx_1");
    expect(body.order.customer.contactDetails.emailAddress).toBe("membre@example.com");
    expect(body.hostedCheckoutSpecificInput.returnUrl).toBe("https://www.gatinelle.fr/api/cawl/retour");
  });

  it("falls back to partialRedirectUrl when redirectUrl is absent", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ hostedCheckoutId: "hc-9", partialRedirectUrl: "preprod.cawl-solutions.fr/hostedcheckout/x" }),
        { status: 201 }
      )
    );
    const session = await createHostedCheckout({
      transactionId: "tx_2",
      amountCents: 100,
      buyerEmail: "a@b.fr",
      origin: "https://www.gatinelle.fr",
    });
    expect(session.redirectUrl).toBe("https://payment.preprod.cawl-solutions.fr/hostedcheckout/x");
  });

  it("throws on an HTTP error from CAWL", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("forbidden", { status: 403 }));
    await expect(
      createHostedCheckout({ transactionId: "tx_3", amountCents: 100, buyerEmail: "a@b.fr", origin: "https://x.fr" })
    ).rejects.toThrow(/HTTP 403/);
  });

  it("throws when the response has no usable redirect url", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ hostedCheckoutId: "hc" }), { status: 201 }));
    await expect(
      createHostedCheckout({ transactionId: "tx_4", amountCents: 100, buyerEmail: "a@b.fr", origin: "https://x.fr" })
    ).rejects.toThrow(/inattendue/);
  });

  it("refuses to call CAWL when not configured", async () => {
    delete process.env.CAWL_MERCHANT_ID;
    await expect(
      createHostedCheckout({ transactionId: "tx_5", amountCents: 100, buyerEmail: "a@b.fr", origin: "https://x.fr" })
    ).rejects.toThrow(/n'est pas configuré/);
  });
});

describe("getHostedCheckoutStatus", () => {
  it("signs a GET without body on the hosted checkout path", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ status: "IN_PROGRESS" }), { status: 200 }));

    const status = await getHostedCheckoutStatus("hc-123");

    expect(status.status).toBe("IN_PROGRESS");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://payment.preprod.cawl-solutions.fr/v2/PSPID123/hostedcheckouts/hc-123");
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).body).toBeUndefined();
  });
});

describe("interpretHostedCheckout", () => {
  const paid = (paymentStatus: string, category = "SUCCESSFUL") => ({
    status: "PAYMENT_CREATED",
    createdPaymentOutput: {
      paymentStatusCategory: category,
      payment: {
        id: "pay-1",
        status: paymentStatus,
        paymentOutput: { amountOfMoney: { amount: 5000, currencyCode: "EUR" } },
      },
    },
  });

  it("is paid only when the payment is CAPTURED", () => {
    expect(interpretHostedCheckout(paid("CAPTURED"))).toEqual({
      kind: "paid",
      paymentId: "pay-1",
      amountCents: 5000,
      currencyCode: "EUR",
    });
  });

  it("keeps an authorised-but-not-captured payment pending", () => {
    expect(interpretHostedCheckout(paid("PENDING_CAPTURE")).kind).toBe("pending");
    expect(interpretHostedCheckout(paid("CAPTURE_REQUESTED")).kind).toBe("pending");
  });

  it("maps a rejected payment to refused", () => {
    expect(interpretHostedCheckout(paid("REJECTED", "REJECTED")).kind).toBe("refused");
  });

  it("maps an unfinished 3-D Secure / unknown status to pending", () => {
    expect(interpretHostedCheckout(paid("CREATED", "STATUS_UNKNOWN")).kind).toBe("pending");
    expect(interpretHostedCheckout({ status: "IN_PROGRESS" }).kind).toBe("pending");
  });

  it("maps a cancelled session to cancelled", () => {
    expect(interpretHostedCheckout({ status: "CANCELLED_BY_CONSUMER" }).kind).toBe("cancelled");
  });
});

describe("webhooks", () => {
  const body = JSON.stringify({
    type: "payment.captured",
    payment: {
      id: "pay-7",
      status: "CAPTURED",
      paymentOutput: {
        amountOfMoney: { amount: 1200, currencyCode: "EUR" },
        references: { merchantReference: "tx_77" },
      },
    },
  });
  const sign = (raw: string, secret = "wh-secret-1") =>
    crypto.createHmac("sha256", secret).update(raw).digest("base64");

  it("accepts a correctly signed body", () => {
    expect(verifyWebhookSignature(body, sign(body), "wh-key-1")).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(body + " ", sign(body), "wh-key-1")).toBe(false);
  });

  it("rejects a signature made with another secret", () => {
    expect(verifyWebhookSignature(body, sign(body, "other-secret"), "wh-key-1")).toBe(false);
  });

  it("rejects an unknown key id", () => {
    expect(verifyWebhookSignature(body, sign(body), "someone-else")).toBe(false);
  });

  it("rejects missing headers or an unset secret", () => {
    expect(verifyWebhookSignature(body, null, "wh-key-1")).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), null)).toBe(false);
    delete process.env.CAWL_WEBHOOK_SECRET;
    expect(verifyWebhookSignature(body, sign(body), "wh-key-1")).toBe(false);
  });

  it("extracts the transaction and outcome from a payment.captured event", () => {
    expect(parseWebhookEvent(body)).toEqual({
      transactionId: "tx_77",
      outcome: { kind: "paid", paymentId: "pay-7", amountCents: 1200, currencyCode: "EUR" },
    });
  });

  it("ignores other events and malformed bodies", () => {
    expect(parseWebhookEvent(JSON.stringify({ type: "payment.rejected", payment: {} }))).toBeNull();
    expect(parseWebhookEvent("not json")).toBeNull();
    expect(parseWebhookEvent(JSON.stringify({ type: "payment.captured" }))).toBeNull();
  });
});
