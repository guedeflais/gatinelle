import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { getTransactionPage } from "@/lib/transactions";
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

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;

  const { transactions, page: resolvedPage, hasMore } = await getTransactionPage(user.id, page);

  return corsJson({
    transactions: transactions.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    page: resolvedPage,
    hasMore,
  });
}
