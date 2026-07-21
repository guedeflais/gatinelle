import { z } from "zod";
import { MerchantCategory, Prisma } from "@prisma/client";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocoding";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

const schema = z.object({
  fullName: z.string().min(2, "Le nom complet doit comporter au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  merchant: z
    .object({
      businessName: z.string().min(2, "Le nom du commerce doit comporter au moins 2 caractères."),
      address: z.string().min(2, "L'adresse doit comporter au moins 2 caractères."),
      category: z.nativeEnum(MerchantCategory, { message: "Catégorie invalide." }),
      iban: z.string().min(10, "L'IBAN doit comporter au moins 10 caractères."),
    })
    .optional(),
});

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  const user = token ? await getUserFromMobileToken(token) : null;
  if (!user) {
    return corsJson({ error: "Non authentifié." }, { status: 401 });
  }

  const merchant = user.accountType === "COMMERCANT"
    ? await prisma.merchantProfile.findUnique({
        where: { userId: user.id },
        select: { businessName: true, address: true, category: true, iban: true },
      })
    : null;

  return corsJson({
    fullName: user.fullName,
    email: user.email,
    merchant: merchant ?? undefined,
  });
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  const user = token ? await getUserFromMobileToken(token) : null;
  if (!user) {
    return corsJson({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return corsJson({ error: "Certains champs sont invalides.", fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  let coordinates: { latitude: number; longitude: number } | null | undefined;
  if (user.accountType === "COMMERCANT" && data.merchant) {
    const current = await prisma.merchantProfile.findUnique({
      where: { userId: user.id },
      select: { address: true },
    });
    if (current && current.address !== data.merchant.address) {
      coordinates = await geocodeAddress(data.merchant.address);
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { fullName: data.fullName, email: data.email.toLowerCase() },
      });

      if (user.accountType === "COMMERCANT" && data.merchant) {
        await tx.merchantProfile.update({
          where: { userId: user.id },
          data: {
            businessName: data.merchant.businessName,
            address: data.merchant.address,
            category: data.merchant.category,
            iban: data.merchant.iban,
            ...(coordinates !== undefined
              ? { latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null }
              : {}),
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return corsJson({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }
    return corsJson({ error: "Impossible de mettre à jour le profil." }, { status: 500 });
  }

  return corsJson({ ok: true });
}
