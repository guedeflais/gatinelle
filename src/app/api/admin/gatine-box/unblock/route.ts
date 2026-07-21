import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const schema = z.object({ gatineBoxId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.gatineBox.update({
    where: { id: parsed.data.gatineBoxId },
    data: { activationBlocked: false, activationFailedAttempts: 0 },
  });

  return NextResponse.json({ ok: true });
}
