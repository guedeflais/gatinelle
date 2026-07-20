import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
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

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      fromUser: { select: { fullName: true, merchantProfile: { select: { businessName: true } } } },
      toUser: { select: { fullName: true, merchantProfile: { select: { businessName: true } } } },
    },
  });

  return corsJson({
    transactions: transactions.map((t) => {
      const isOutgoing = t.fromUserId === user.id;
      // Seul le type PAYMENT a un interlocuteur humain identifiable des deux
      // côtés (achat/reconversion/péremption se font face à l'association).
      const counterpartyUser = isOutgoing ? t.toUser : t.fromUser;
      const counterpartyLabel =
        t.type === "PAYMENT" && counterpartyUser
          ? (counterpartyUser.merchantProfile?.businessName ?? counterpartyUser.fullName)
          : null;
      return {
        id: t.id,
        type: t.type,
        status: t.status,
        amountCents: t.amountCents,
        isOutgoing,
        counterpartyLabel,
        createdAt: t.createdAt.toISOString(),
      };
    }),
  });
}
