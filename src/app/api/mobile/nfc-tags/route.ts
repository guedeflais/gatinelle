import { z } from "zod";
import { Prisma } from "@prisma/client";
import { extractBearerToken, getUserFromMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

const schema = z.object({ tagUid: z.string().min(1) });

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  const user = token ? await getUserFromMobileToken(token) : null;
  if (!user) {
    return corsJson({ error: "Non authentifié." }, { status: 401 });
  }

  const tags = await prisma.nfcTag.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return corsJson({
    tags: tags.map((t) => ({ id: t.id, tagUid: t.tagUid, createdAt: t.createdAt.toISOString() })),
  });
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
    return corsJson({ error: "Numéro de tag requis." }, { status: 400 });
  }

  try {
    const tag = await prisma.nfcTag.create({
      data: { userId: user.id, tagUid: parsed.data.tagUid },
    });
    return corsJson(
      { tag: { id: tag.id, tagUid: tag.tagUid, createdAt: tag.createdAt.toISOString() } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return corsJson({ error: "Ce bracelet/carte est déjà lié à un compte." }, { status: 409 });
    }
    return corsJson({ error: "Impossible d'ajouter ce bracelet/carte." }, { status: 500 });
  }
}
