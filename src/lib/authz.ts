import type { Session } from "next-auth";

export function isStaff(session: Session): boolean {
  return session.user.staffRole === "AGENT" || session.user.staffRole === "ADMIN";
}

export function isAdmin(session: Session): boolean {
  return session.user.staffRole === "ADMIN";
}

export function isMerchant(session: Session): boolean {
  return session.user.accountType === "COMMERCANT";
}
