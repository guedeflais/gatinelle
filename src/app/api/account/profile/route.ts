import { NextResponse } from "next/server";
import { z } from "zod";
import { MerchantCategory, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocoding";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  merchant: z
    .object({
      businessName: z.string().min(2),
      address: z.string().min(2),
      category: z.nativeEnum(MerchantCategory, { message: "Catégorie invalide." }),
      iban: z.string().min(10),
    })
    .optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Géocodage en amont (best-effort) : uniquement si l'adresse a réellement
  // changé, pour ne pas re-géocoder inutilement à chaque modification de
  // profil (nom, email...) et rester dans la limite d'usage de Nominatim.
  let coordinates: { latitude: number; longitude: number } | null | undefined;
  if (session.user.accountType === "COMMERCANT" && data.merchant) {
    const current = await prisma.merchantProfile.findUnique({
      where: { userId: session.user.id },
      select: { address: true },
    });
    if (current && current.address !== data.merchant.address) {
      coordinates = await geocodeAddress(data.merchant.address);
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { fullName: data.fullName, email: data.email.toLowerCase() },
      });

      if (session.user.accountType === "COMMERCANT" && data.merchant) {
        await tx.merchantProfile.update({
          where: { userId: session.user.id },
          data: {
            businessName: data.merchant.businessName,
            address: data.merchant.address,
            category: data.merchant.category,
            iban: data.merchant.iban,
            // `undefined` = adresse inchangée, on ne touche pas aux coordonnées
            // existantes ; `null` = adresse changée mais non géolocalisable,
            // on efface les anciennes coordonnées (devenues fausses).
            ...(coordinates !== undefined
              ? { latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null }
              : {}),
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de mettre à jour le profil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
