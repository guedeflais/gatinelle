import bcrypt from "bcryptjs";
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
    const attempts = user.pinFailedAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinFailedAttempts: attempts,
        pinBlocked: attempts >= MAX_PIN_ATTEMPTS,
      },
    });
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
