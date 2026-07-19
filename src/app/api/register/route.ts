import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateMerchantCode } from "@/lib/merchantCode";
import { generateMemberNumber } from "@/lib/memberNumber";
import { PIN_REGEX } from "@/lib/pin";
import { geocodeAddress } from "@/lib/geocoding";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  pin: z.string().regex(PIN_REGEX, "Le code PIN doit comporter exactement 4 chiffres."),
  accountType: z.enum(["PARTICULIER", "COMMERCANT"]),
  merchant: z
    .object({
      businessName: z.string().min(2),
      address: z.string().min(2),
      category: z.string().min(2),
      iban: z.string().min(10),
    })
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  if (data.accountType === "COMMERCANT" && !data.merchant) {
    return NextResponse.json(
      { error: "Les informations du commerce sont requises." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const pinHash = await bcrypt.hash(data.pin, 10);
  // Géocodage en amont (best-effort, jamais bloquant) : un appel réseau ne
  // doit pas rester ouvert pendant la transaction ci-dessous.
  const coordinates = data.merchant ? await geocodeAddress(data.merchant.address) : null;

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
              accountType: data.accountType,
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

      if (data.merchant) {
        let merchantAttempts = 0;
        for (;;) {
          try {
            await tx.merchantProfile.create({
              data: {
                userId: created.id,
                businessName: data.merchant.businessName,
                address: data.merchant.address,
                latitude: coordinates?.latitude,
                longitude: coordinates?.longitude,
                category: data.merchant.category,
                iban: data.merchant.iban,
                merchantCode: generateMerchantCode(),
                validated: false,
              },
            });
            break;
          } catch (err) {
            merchantAttempts += 1;
            const isUniqueClash =
              err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
            if (!isUniqueClash || merchantAttempts >= 5) throw err;
          }
        }
      }

      return created;
    });

    return NextResponse.json({ id: user.id, memberNumber: user.memberNumber }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible de créer le compte." }, { status: 500 });
  }
}
