import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { PaymentMethod, TransactionStatus, TransactionType } from "@prisma/client";

const schema = z.object({
  amountEuros: z.number().positive().max(10000),
  method: z.enum(["CASH", "TRANSFER"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
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
      paymentMethod: PaymentMethod[parsed.data.method],
      status: TransactionStatus.PENDING,
    },
  });

  return NextResponse.json({ id: transaction.id, status: transaction.status }, { status: 201 });
}
