import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { activateGatineBox, NotFoundError, InvalidStateError } from "@/lib/gatineBox";

const schema = z.object({
  boxNumber: z.string().min(1, "Numéro de box requis."),
  activationCode: z.string().min(1, "Code d'activation requis."),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (session.user.accountType === "COMMERCANT") {
    return NextResponse.json(
      { error: "Un compte commerçant ne peut pas activer de Gâtine Box." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const transaction = await activateGatineBox(
      session.user.id,
      parsed.data.boxNumber,
      parsed.data.activationCode
    );
    return NextResponse.json({ id: transaction.id, amountCents: transaction.amountCents });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible d'activer cette Gâtine Box." }, { status: 500 });
  }
}
