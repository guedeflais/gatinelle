import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { creditAccount, NotFoundError, InvalidStateError } from "@/lib/wallet";

const schema = z
  .object({
    memberNumber: z.string().min(1).optional(),
    tagUid: z.string().min(1).optional(),
    amountEuros: z.number().positive().max(10000),
  })
  .refine((data) => data.memberNumber || data.tagUid, {
    message: "Numéro d'adhérent ou carte NFC requis.",
  });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isStaff(session)) {
    return NextResponse.json({ error: "Accès réservé au personnel de l'association." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let target: { id: string; fullName: string } | null;
  if (parsed.data.tagUid) {
    const nfcTag = await prisma.nfcTag.findUnique({
      where: { tagUid: parsed.data.tagUid },
      include: { user: true },
    });
    target = nfcTag?.user ?? null;
    if (!target) {
      return NextResponse.json({ error: "Carte NFC non reconnue." }, { status: 404 });
    }
  } else {
    target = await prisma.user.findUnique({
      where: { memberNumber: parsed.data.memberNumber!.trim().toUpperCase() },
    });
    if (!target) {
      return NextResponse.json({ error: "Numéro d'adhérent inconnu." }, { status: 404 });
    }
  }

  try {
    await creditAccount(session.user.id, target.id, eurosToCents(parsed.data.amountEuros));
    return NextResponse.json({ ok: true, fullName: target.fullName });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de créditer ce compte." }, { status: 500 });
  }
}
