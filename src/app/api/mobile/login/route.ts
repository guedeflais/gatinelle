import { z } from "zod";
import { attemptPinLogin } from "@/lib/pin";
import { attemptPasswordLogin } from "@/lib/passwordAuth";
import { createMobileSession } from "@/lib/mobileAuth";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

// Même méthode que la connexion web : numéro d'adhérent+PIN (comptoir) ou
// email+mot de passe. Réutilise attemptPinLogin/attemptPasswordLogin tels
// quels — mêmes compteurs d'échecs et blocages qu'en connexion web, un
// attaquant n'a pas de budget de tentatives séparé en passant par l'appli.
const schema = z.union([
  z.object({ memberNumber: z.string().min(1), pin: z.string().min(1) }),
  z.object({ email: z.string().email(), password: z.string().min(1) }),
]);

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return corsJson({ error: "Identifiants requis." }, { status: 400 });
  }

  const user =
    "memberNumber" in parsed.data
      ? await attemptPinLogin(parsed.data.memberNumber, parsed.data.pin)
      : await attemptPasswordLogin(parsed.data.email, parsed.data.password);

  if (!user) {
    return corsJson({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const { token, expiresAt } = await createMobileSession(user.id);

  return corsJson({
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      accountType: user.accountType,
      staffRole: user.staffRole,
      merchantId: user.merchantId,
    },
  });
}
