import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { completeConversion, InvalidStateError, NotFoundError } from "@/lib/wallet";

const schema = z.object({ transactionId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await completeConversion(parsed.data.transactionId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidStateError || err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la validation." }, { status: 500 });
  }
}
