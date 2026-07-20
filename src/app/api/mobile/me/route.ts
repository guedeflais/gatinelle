import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { getBalanceCents } from "@/lib/wallet";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  const user = token ? await getUserFromMobileToken(token) : null;
  if (!user) {
    return corsJson({ error: "Non authentifié." }, { status: 401 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const balanceCents = wallet ? await getBalanceCents(prisma, wallet.id) : 0;

  return corsJson({ user, balanceCents });
}
