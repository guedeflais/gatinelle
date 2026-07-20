import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateMerchantCode } from "@/lib/merchantCode";
import { generateMemberNumber } from "@/lib/memberNumber";
import { PIN_REGEX } from "@/lib/pin";
import { geocodeAddress } from "@/lib/geocoding";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

const schema = z.object({
  fullName: z.string().min(2, "Le nom complet doit comporter au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères."),
  pin: z.string().regex(PIN_REGEX, "Le code PIN doit comporter exactement 4 chiffres."),
  accountType: z.enum(["PARTICULIER", "COMMERCANT"]),
  merchant: z
    .object({
      businessName: z.string().min(2, "Le nom du commerce doit comporter au moins 2 caractères."),
      address: z.string().min(2, "L'adresse doit comporter au moins 2 caractères."),
      category: z.string().min(2, "La catégorie doit comporter au moins 2 caractères."),
      iban: z.string().min(10, "L'IBAN doit comporter au moins 10 caractères."),
    })
    .optional(),
});

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Chemin en pointillés (ex. "merchant.iban") plutôt que .flatten(), qui ne
    // distingue pas les champs imbriqués — permet à l'appelant de savoir
    // précisément quel champ signaler, y compris dans l'objet merchant.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return corsJson({ error: "Certains champs sont invalides.", fieldErrors }, { status: 400 });
  }
  const data = parsed.data;
  if (data.accountType === "COMMERCANT" && !data.merchant) {
    return corsJson({ error: "Les informations du commerce sont requises." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return corsJson({ error: "Cet email est déjà utilisé." }, { status: 409 });
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

    return corsJson({ id: user.id, memberNumber: user.memberNumber }, { status: 201 });
  } catch {
    return corsJson({ error: "Impossible de créer le compte." }, { status: 500 });
  }
}
