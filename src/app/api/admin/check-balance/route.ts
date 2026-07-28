import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { resolveFestivalAccount } from "@/lib/accountLookup";
import { getBalanceCents } from "@/lib/wallet";

const schema = z
  .object({
    memberNumber: z.string().min(1).optional(),
    tagUid: z.string().min(1).optional(),
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

  const target = await resolveFestivalAccount(parsed.data);
  if (!target) {
    const message = parsed.data.tagUid ? "Carte NFC non reconnue." : "Numéro d'adhérent inconnu.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (!target.wallet) {
    return NextResponse.json({ error: "Portefeuille introuvable." }, { status: 404 });
  }

  const balanceCents = await getBalanceCents(prisma, target.wallet.id);
  return NextResponse.json({ fullName: target.fullName, balanceCents });
}
