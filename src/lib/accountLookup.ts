import { prisma } from "@/lib/prisma";

/**
 * Retrouve un compte à partir d'une carte NFC scannée ou d'un numéro
 * d'adhérent saisi manuellement — le même repli que dans tous les écrans
 * du comptoir mode festival (créditer, consulter le solde, rembourser,
 * transformer en compte durable).
 */
export async function resolveFestivalAccount(identifier: { tagUid?: string; memberNumber?: string }) {
  if (identifier.tagUid) {
    const nfcTag = await prisma.nfcTag.findUnique({
      where: { tagUid: identifier.tagUid },
      include: { user: { include: { wallet: true } } },
    });
    return nfcTag?.user ?? null;
  }

  return prisma.user.findUnique({
    where: { memberNumber: identifier.memberNumber!.trim().toUpperCase() },
    include: { wallet: true },
  });
}
