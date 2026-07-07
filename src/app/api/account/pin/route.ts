import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PIN_REGEX } from "@/lib/pin";

const schema = z.object({ pin: z.string().regex(PIN_REGEX) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Le code PIN doit comporter exactement 4 chiffres." },
      { status: 400 }
    );
  }

  const pinHash = await bcrypt.hash(parsed.data.pin, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { pinHash, pinFailedAttempts: 0, pinBlocked: false },
  });

  return NextResponse.json({ ok: true });
}
