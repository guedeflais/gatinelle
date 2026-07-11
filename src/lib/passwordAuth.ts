import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { AccountType, StaffRole } from "@prisma/client";

export const MAX_PASSWORD_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface PasswordLoginUser {
  id: string;
  email: string;
  fullName: string;
  accountType: AccountType;
  staffRole: StaffRole | null;
  merchantId: string | null;
}

/**
 * Vérifie un couple email + mot de passe. Contrairement au PIN (voir
 * lib/pin.ts), pas de blocage permanent nécessitant un administrateur :
 * l'email est trop facile à connaître pour n'importe qui (contrairement au
 * numéro d'adhérent), un blocage définitif serait donc un moyen simple de
 * bloquer le compte de n'importe quel adhérent. À la place, une pause
 * temporaire auto-expirante après plusieurs échecs.
 */
export async function attemptPasswordLogin(
  email: string,
  password: string
): Promise<PasswordLoginUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { merchantProfile: true },
  });
  if (!user) return null;

  if (user.passwordLockedUntil && user.passwordLockedUntil > new Date()) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // Incrément atomique côté base : voir lib/pin.ts pour le raisonnement
    // (évite qu'un calcul en mémoire perde des tentatives en cas de course).
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordFailedAttempts: { increment: 1 } },
    });
    if (updated.passwordFailedAttempts >= MAX_PASSWORD_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordLockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
      });
    }
    return null;
  }

  if (user.passwordFailedAttempts > 0 || user.passwordLockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordFailedAttempts: 0, passwordLockedUntil: null },
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
