import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { MerchantCategory, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { generateMemberNumber } from "@/lib/memberNumber";
import { generateMerchantCode } from "@/lib/merchantCode";

const schema = z.object({
  businessName: z.string().min(2),
  category: z.nativeEnum(MerchantCategory, { message: "Catégorie invalide." }),
});

function randomPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
}

/**
 * Crée un stand d'événement : un compte COMMERCANT immédiatement validé (pas
 * de file d'attente admin, l'organisateur crée lui-même les stands qu'il a
 * approuvés). Les identifiants ne sont affichés qu'une seule fois.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessName, category } = parsed.data;

  const password = randomPassword();
  const pin = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  const passwordHash = await bcrypt.hash(password, 12);
  const pinHash = await bcrypt.hash(pin, 10);
  const diacriticsRegex = new RegExp("[\\u0300-\\u036f]", "g");
  const slug = businessName
    .toLowerCase()
    .normalize("NFD")
    .replace(diacriticsRegex, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);

  const created = await prisma.$transaction(async (tx) => {
    let user: Prisma.UserGetPayload<{ include: { merchantProfile: true } }> | undefined;
    let attempts = 0;
    for (;;) {
      try {
        user = await tx.user.create({
          data: {
            email: `stand-${slug}-${crypto.randomBytes(3).toString("hex")}@gatinelle.local`,
            passwordHash,
            fullName: businessName,
            accountType: "COMMERCANT",
            memberNumber: generateMemberNumber(),
            pinHash,
            wallet: { create: {} },
            merchantProfile: {
              create: {
                businessName,
                address: "Stand d'événement",
                category,
                merchantCode: generateMerchantCode(),
                validated: true,
                isEventStand: true,
                validatedById: session.user.id,
                validatedAt: new Date(),
              },
            },
          },
          include: { merchantProfile: true },
        });
        break;
      } catch (err) {
        attempts += 1;
        if (attempts >= 5) throw err;
      }
    }
    return user;
  });

  return NextResponse.json({
    email: created.email,
    password,
    memberNumber: created.memberNumber,
    merchantCode: created.merchantProfile?.merchantCode,
  });
}
