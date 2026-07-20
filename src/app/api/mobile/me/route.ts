import { NextResponse } from "next/server";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { getBalanceCents } from "@/lib/wallet";

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  const user = token ? await getUserFromMobileToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const balanceCents = wallet ? await getBalanceCents(prisma, wallet.id) : 0;

  return NextResponse.json({ user, balanceCents });
}
