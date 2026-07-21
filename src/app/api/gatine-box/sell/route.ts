import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { sellGatineBox, NotFoundError, InvalidStateError } from "@/lib/gatineBox";

const schema = z.object({
  boxNumber: z.string().min(1, "Numéro de box requis."),
  priceEuros: z.number().positive().max(10000),
  sealIntact: z.literal(true, { message: "Vérifiez que le sceau de garantie est intact." }),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (session.user.accountType !== "COMMERCANT") {
    return NextResponse.json(
      { error: "Seuls les commerçants peuvent vendre une Gâtine Box." },
      { status: 403 }
    );
  }

  const merchantProfile = await prisma.merchantProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!merchantProfile || !merchantProfile.validated) {
    return NextResponse.json(
      { error: "Votre compte commerçant n'est pas encore validé par l'association." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const box = await sellGatineBox(
      merchantProfile.id,
      parsed.data.boxNumber,
      eurosToCents(parsed.data.priceEuros)
    );
    return NextResponse.json({ boxNumber: box.boxNumber, status: box.status });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible d'enregistrer la vente." }, { status: 500 });
  }
}
