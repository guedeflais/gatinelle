import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";
import type { AccountType, StaffRole } from "@prisma/client";

export const PIN_REGEX = /^\d{4}$/;
export const MAX_PIN_ATTEMPTS = 3;

export interface PinLoginUser {
  id: string;
  email: string;
  fullName: string;
  accountType: AccountType;
  staffRole: StaffRole | null;
  merchantId: string | null;
}

/**
 * Vérifie un couple numéro d'adhérent + PIN, sur le modèle de l'Eusko :
 * incrémente le compteur d'échecs et bloque l'accès après MAX_PIN_ATTEMPTS
 * tentatives infructueuses (déblocage réservé à un administrateur).
 * Retourne null si le numéro est inconnu, le compte bloqué, ou le PIN erroné.
 */
export async function attemptPinLogin(
  memberNumber: string,
  pin: string
): Promise<PinLoginUser | null> {
  if (!PIN_REGEX.test(pin)) return null;

  const user = await prisma.user.findUnique({
    where: { memberNumber: memberNumber.toUpperCase() },
    include: { merchantProfile: true },
  });
  if (!user || user.pinBlocked) return null;

  const valid = await bcrypt.compare(pin, user.pinHash);

  if (!valid) {
    // Incrément atomique côté base (SET x = x + 1) : contrairement à un calcul
    // en mémoire suivi d'une écriture, il ne peut pas être perdu si plusieurs
    // tentatives de PIN arrivent en même temps — sinon un essai en parallèle
    // permettrait de dépasser MAX_PIN_ATTEMPTS et de forcer le PIN par
    // essais concurrents (l'espace à 4 chiffres n'a que 10 000 combinaisons).
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { pinFailedAttempts: { increment: 1 } },
    });
    if (updated.pinFailedAttempts >= MAX_PIN_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pinBlocked: true },
      });
    }
    return null;
  }

  if (user.pinFailedAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pinFailedAttempts: 0 },
    });
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    accountType: user.accountType,
    staffRole: user.staffRole,
    merchantId: user.merchantProfile?.id ?? null,
  };
}

/**
 * Génère un nouveau PIN aléatoire et le renvoie en clair une seule fois —
 * utilisé pour transformer un compte inscription express (dont le PIN
 * initial est aléatoire et jamais affiché, donc inutilisable) en compte
 * durable que le participant peut désormais utiliser via le PIN quick-login.
 */
export async function regeneratePin(userId: string): Promise<string> {
  const pin = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { pinHash, pinFailedAttempts: 0, pinBlocked: false },
  });
  return pin;
}
