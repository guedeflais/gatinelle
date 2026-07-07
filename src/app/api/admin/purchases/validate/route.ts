import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isStaff, isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { validatePurchase, InvalidStateError, NotFoundError } from "@/lib/wallet";

const schema = z.object({ transactionId: z.string().min(1) });

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

  const transaction = await prisma.transaction.findUnique({
    where: { id: parsed.data.transactionId },
  });
  if (!transaction) {
    return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 });
  }

  // Les virements ne peuvent être validés que par un admin (vérification bancaire).
  if (transaction.paymentMethod === "TRANSFER" && !isAdmin(session)) {
    return NextResponse.json(
      { error: "Seul un administrateur peut valider un virement." },
      { status: 403 }
    );
  }

  try {
    await validatePurchase(transaction.id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidStateError || err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la validation." }, { status: 500 });
  }
}
