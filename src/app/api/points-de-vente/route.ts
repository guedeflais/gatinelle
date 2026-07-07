import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const merchants = await prisma.merchantProfile.findMany({
    where: { validated: true },
    select: { businessName: true, address: true, category: true },
    orderBy: { businessName: "asc" },
  });

  return NextResponse.json({ merchants });
}
