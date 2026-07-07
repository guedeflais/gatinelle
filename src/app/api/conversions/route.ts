import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { eurosToCents } from "@/lib/money";
import { requestConversion, InsufficientBalanceError, NotFoundError, InvalidStateError } from "@/lib/wallet";

const schema = z.object({ amountEuros: z.number().positive().max(100000) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (session.user.accountType !== "COMMERCANT") {
    return NextResponse.json(
      { error: "Seuls les commerçants peuvent demander une reconversion." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const transaction = await requestConversion(session.user.id, eurosToCents(parsed.data.amountEuros));
    return NextResponse.json({ id: transaction.id }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof NotFoundError || err instanceof InvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la demande de reconversion." }, { status: 500 });
  }
}
