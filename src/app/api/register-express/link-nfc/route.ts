import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  userId: z.string().min(1),
  nfcTagUid: z.string().min(1),
});

/**
 * Lie un bracelet/carte NFC à un compte fraîchement créé via l'inscription
 * express (voir /api/register-express). Un compte peut avoir plusieurs tags
 * (voir modèle NfcTag) ; cette route se contente d'ajouter celui-ci.
 */
export async function PATCH(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, nfcTagUid } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  try {
    await prisma.nfcTag.create({ data: { userId, tagUid: nfcTagUid } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Ce bracelet est déjà lié à un autre compte." }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de lier le bracelet." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
