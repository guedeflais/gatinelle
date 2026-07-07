import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { eurosToCents } from "@/lib/money";
import { payMerchant, InsufficientBalanceError, NotFoundError, InvalidStateError } from "@/lib/wallet";

const schema = z.object({
  merchantCode: z.string().min(1),
  amountEuros: z.number().positive().max(10000),
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

  try {
    const transaction = await payMerchant(
      session.user.id,
      parsed.data.merchantCode.trim().toUpperCase(),
      eurosToCents(parsed.data.amountEuros)
    );
    return NextResponse.json({ id: transaction.id }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof NotFoundError || err instanceof InvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors du paiement." }, { status: 500 });
  }
}
