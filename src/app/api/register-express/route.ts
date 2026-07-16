import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateMemberNumber } from "@/lib/memberNumber";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
});

/**
 * Inscription express (mode festival) : nom + email uniquement, un mot de
 * passe et un PIN générés aléatoirement (jamais affichés — ce flux n'est pas
 * destiné à une connexion classique, voir le plan de la fonctionnalité
 * festival). Le bracelet NFC scanné au kiosque peut être lié dès la création.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("base64"), 12);
  const pinHash = await bcrypt.hash(String(crypto.randomInt(0, 10000)).padStart(4, "0"), 10);

  try {
    const user = await prisma.$transaction(async (tx) => {
      let created;
      let attempts = 0;
      for (;;) {
        try {
          created = await tx.user.create({
            data: {
              fullName: data.fullName,
              email: data.email.toLowerCase(),
              passwordHash,
              accountType: "PARTICULIER",
              memberNumber: generateMemberNumber(),
              pinHash,
            },
          });
          break;
        } catch (err) {
          attempts += 1;
          const isUniqueClash =
            err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
          if (!isUniqueClash || attempts >= 5) throw err;
        }
      }

      await tx.wallet.create({ data: { userId: created.id } });
      return created;
    });

    return NextResponse.json({ id: user.id, memberNumber: user.memberNumber }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible de créer le compte." }, { status: 500 });
  }
}
