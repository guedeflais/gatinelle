import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { manufactureGatineBox, InvalidStateError } from "@/lib/gatineBox";

const schema = z.object({ nfcTagUid: z.string().min(1, "Numéro de série de la carte NFC requis.") });

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
    const result = await manufactureGatineBox(session.user.id, parsed.data.nfcTagUid);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de confectionner cette Gâtine Box." }, { status: 500 });
  }
}
