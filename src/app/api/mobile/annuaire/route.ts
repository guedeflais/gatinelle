import { prisma } from "@/lib/prisma";
import { MERCHANT_CATEGORY_LABELS } from "@/lib/merchantCategory";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

// Public, à l'image de /annuaire sur le web : aucune authentification requise.
export async function GET() {
  const merchants = await prisma.merchantProfile.findMany({
    where: { validated: true },
    select: { businessName: true, address: true, category: true, latitude: true, longitude: true },
    orderBy: { businessName: "asc" },
  });

  const withLabels = merchants.map((m) => ({
    businessName: m.businessName,
    address: m.address,
    category: MERCHANT_CATEGORY_LABELS[m.category],
    latitude: m.latitude,
    longitude: m.longitude,
  }));

  return corsJson({ merchants: withLabels });
}
