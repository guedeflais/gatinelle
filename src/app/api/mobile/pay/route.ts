import { z } from "zod";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { eurosToCents } from "@/lib/money";
import { payMerchant, InsufficientBalanceError, NotFoundError, InvalidStateError } from "@/lib/wallet";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

const schema = z.object({
  merchantCode: z.string().min(1),
  amountEuros: z.number().positive().max(10000),
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

  try {
    const transaction = await payMerchant(
      user.id,
      parsed.data.merchantCode.trim().toUpperCase(),
      eurosToCents(parsed.data.amountEuros)
    );
    return corsJson({ id: transaction.id }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return corsJson({ error: err.message }, { status: 409 });
    }
    if (err instanceof NotFoundError || err instanceof InvalidStateError) {
      return corsJson({ error: err.message }, { status: 400 });
    }
    return corsJson({ error: "Erreur lors du paiement." }, { status: 500 });
  }
}
