import crypto from "crypto";
import { prisma } from "./prisma";
import type { AccountType, StaffRole } from "@prisma/client";

// Jeton opaque à haute entropie (256 bits) : contrairement à un mot de passe,
// pas besoin d'un hachage lent (bcrypt) pour se protéger d'un brute-force —
// SHA-256 suffit, l'espace de recherche est bien trop grand pour être deviné.
const TOKEN_BYTES = 32;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours, glissant

export interface MobileSessionUser {
  id: string;
  email: string;
  fullName: string;
  accountType: AccountType;
  staffRole: StaffRole | null;
  merchantId: string | null;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Émet un nouveau jeton pour un utilisateur déjà authentifié (PIN ou mot de passe). */
export async function createMobileSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.mobileSession.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return { token, expiresAt };
}

/**
 * Résout un jeton `Authorization: Bearer <token>` en utilisateur, ou null si
 * absent/invalide/expiré. Prolonge la session à chaque usage (expiration
 * glissante) : un jeton actif ne se déconnecte jamais tout seul, seul un
 * jeton inutilisé pendant 30 jours expire.
 */
export async function getUserFromMobileToken(token: string): Promise<MobileSessionUser | null> {
  const tokenHash = hashToken(token);

  const mobileSession = await prisma.mobileSession.findUnique({
    where: { tokenHash },
    include: { user: { include: { merchantProfile: true } } },
  });
  if (!mobileSession || mobileSession.expiresAt <= new Date()) return null;

  const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.mobileSession.update({
    where: { id: mobileSession.id },
    data: { lastUsedAt: new Date(), expiresAt: newExpiresAt },
  });

  const { user } = mobileSession;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    accountType: user.accountType,
    staffRole: user.staffRole,
    merchantId: user.merchantProfile?.id ?? null,
  };
}

/** Déconnexion : supprime le jeton présenté, sans toucher aux autres appareils. */
export async function revokeMobileSession(token: string): Promise<void> {
  await prisma.mobileSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
