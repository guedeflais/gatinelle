import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { buildPaymentForm, isUp2PayConfigured } from "@/lib/up2pay";
import { PaymentMethod, TransactionStatus, TransactionType } from "@prisma/client";

// Up2Pay refuse les montants inférieurs à 1 € (PBX_TOTAL doit être > 100 centimes).
const schema = z.object({ amountEuros: z.number().min(1).max(10000) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (!isUp2PayConfigured()) {
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

  const amountCents = eurosToCents(parsed.data.amountEuros);

  const transaction = await prisma.transaction.create({
    data: {
      type: TransactionType.PURCHASE,
      fromUserId: null,
      toUserId: session.user.id,
      amountCents,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.PENDING,
    },
  });

  const origin = new URL(request.url).origin;

  const form = buildPaymentForm({
    transactionId: transaction.id,
    amountCents,
    buyerEmail: session.user.email,
    origin,
  });

  return NextResponse.json(form, { status: 201 });
}
