import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  merchantProfileId: z.string().min(1),
  name: z.string().min(2),
  priceEuros: z.number().positive(),
});

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
  const { merchantProfileId, name, priceEuros } = parsed.data;

  const stand = await prisma.merchantProfile.findUnique({ where: { id: merchantProfileId } });
  if (!stand || !stand.isEventStand) {
    return NextResponse.json({ error: "Stand introuvable." }, { status: 404 });
  }

  const product = await prisma.standProduct.create({
    data: {
      merchantProfileId,
      name,
      priceCents: Math.round(priceEuros * 100),
    },
  });

  return NextResponse.json({ id: product.id }, { status: 201 });
}
