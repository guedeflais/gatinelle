import { z } from "zod";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

const schema = z.object({ id: z.string().min(1) });

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
    return corsJson({ error: "Identifiant requis." }, { status: 400 });
  }

  // deleteMany plutôt que delete : ne supprime que si ce tag appartient bien
  // à l'utilisateur authentifié, sans avoir à vérifier ça séparément.
  await prisma.nfcTag.deleteMany({ where: { id: parsed.data.id, userId: user.id } });

  return corsJson({ ok: true });
}
