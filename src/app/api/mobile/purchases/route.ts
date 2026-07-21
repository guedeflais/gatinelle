import { z } from "zod";
import { PaymentMethod, TransactionStatus, TransactionType } from "@prisma/client";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

const schema = z.object({
  amountEuros: z.number().positive().max(10000),
  method: z.enum(["CASH", "TRANSFER"]),
});

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  const user = token ? await getUserFromMobileToken(token) : null;
  if (!user) {
    return corsJson({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return corsJson({ error: parsed.error.flatten() }, { status: 400 });
  }

  const amountCents = eurosToCents(parsed.data.amountEuros);

  const transaction = await prisma.transaction.create({
    data: {
      type: TransactionType.PURCHASE,
      fromUserId: null,
      toUserId: user.id,
      amountCents,
      paymentMethod: PaymentMethod[parsed.data.method],
      status: TransactionStatus.PENDING,
    },
  });

  return corsJson(
    {
      id: transaction.id,
      status: transaction.status,
      associationIban: parsed.data.method === "TRANSFER" ? (process.env.ASSOCIATION_IBAN ?? null) : undefined,
    },
    { status: 201 },
  );
}
