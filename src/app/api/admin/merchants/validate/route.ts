import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const schema = z.object({ merchantProfileId: z.string().min(1), approve: z.boolean() });

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

  const merchantProfile = await prisma.merchantProfile.findUnique({
    where: { id: parsed.data.merchantProfileId },
  });
  if (!merchantProfile) {
    return NextResponse.json({ error: "Commerçant introuvable." }, { status: 404 });
  }

  await prisma.merchantProfile.update({
    where: { id: merchantProfile.id },
    data: parsed.data.approve
      ? { validated: true, validatedById: session.user.id, validatedAt: new Date() }
      : { validated: false, validatedById: session.user.id, validatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
