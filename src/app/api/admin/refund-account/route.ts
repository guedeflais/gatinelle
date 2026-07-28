import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/authz";
import { centsToEuros } from "@/lib/money";
import { resolveFestivalAccount } from "@/lib/accountLookup";
import { refundAccount, InsufficientBalanceError, InvalidStateError, NotFoundError } from "@/lib/wallet";

const REFUND_COMMISSION_CENTS = 100;

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

  try {
    const { balanceCents } = await refundAccount(session.user.id, target.id);
    const payoutCents = Math.max(0, balanceCents - REFUND_COMMISSION_CENTS);
    return NextResponse.json({
      fullName: target.fullName,
      refundedCents: balanceCents,
      payoutEuros: centsToEuros(payoutCents),
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidStateError || err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de rembourser ce compte." }, { status: 500 });
  }
}
