import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
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
