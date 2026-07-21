import { z } from "zod";
import { PaymentMethod, TransactionStatus, TransactionType } from "@prisma/client";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { buildPaymentForm, isUp2PayConfigured } from "@/lib/up2pay";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

// Up2Pay refuse les montants inférieurs à 1 € (PBX_TOTAL doit être > 100 centimes).
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

  if (!isUp2PayConfigured()) {
    return corsJson({ error: "Le paiement par carte n'est pas encore configuré." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return corsJson({ error: parsed.error.flatten() }, { status: 400 });
  }

  const amountCents = eurosToCents(parsed.data.amountEuros);

  const transaction = await prisma.transaction.create({
    data: {
      type: TransactionType.PURCHASE,
      fromUserId: null,
      toUserId: user.id,
      amountCents,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.PENDING,
    },
  });

  const origin = new URL(request.url).origin;

  const form = buildPaymentForm({
    transactionId: transaction.id,
    amountCents,
    buyerEmail: user.email,
    origin,
  });

  return corsJson(form, { status: 201 });
}
