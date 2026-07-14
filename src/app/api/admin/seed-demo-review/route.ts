import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqualString } from "@/lib/security";
import {
  AccountType,
  LotStatus,
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { payMerchant, createPurchaseLot } from "@/lib/wallet";
import { generateMerchantCode } from "@/lib/merchantCode";
import { generateMemberNumber } from "@/lib/memberNumber";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Route temporaire à usage unique : peuple un compte de test existant
 * (V02519) avec un solde/historique de démonstration et un commerçant
 * validé, pour les captures d'écran de la fiche Google Play. À supprimer
 * après usage.
 */
export async function POST(request: Request) {
  const expected = process.env.SEED_DEMO_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || !authHeader || !timingSafeEqualString(authHeader, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const jean = await prisma.user.findUnique({
    where: { memberNumber: "V02519" },
    include: { wallet: true },
  });
  if (!jean?.wallet) {
    return NextResponse.json({ error: "Compte V02519 introuvable." }, { status: 404 });
  }

  const purchase1 = await prisma.transaction.create({
    data: {
      type: TransactionType.PURCHASE,
      toUserId: jean.id,
      amountCents: 2000,
      paymentMethod: PaymentMethod.CASH,
      status: TransactionStatus.COMPLETED,
      validatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });
  await createPurchaseLot(
    prisma,
    jean.wallet.id,
    AccountType.PARTICULIER,
    2000,
    purchase1.id,
    new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  );

  const purchase2 = await prisma.transaction.create({
    data: {
      type: TransactionType.PURCHASE,
      toUserId: jean.id,
      amountCents: 1500,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.COMPLETED,
      validatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  await createPurchaseLot(
    prisma,
    jean.wallet.id,
    AccountType.PARTICULIER,
    1500,
    purchase2.id,
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  );

  const passwordHash = await bcrypt.hash(crypto.randomBytes(9).toString("base64"), 10);
  const pinHash = await bcrypt.hash(String(crypto.randomInt(0, 10000)).padStart(4, "0"), 10);
  const merchantCode = generateMerchantCode();
  const merchantUser = await prisma.user.create({
    data: {
      email: "commerce-demo@gatinelle.fr",
      passwordHash,
      pinHash,
      fullName: "Commerce Démo (compte test)",
      accountType: AccountType.COMMERCANT,
      memberNumber: generateMemberNumber(),
      wallet: { create: {} },
      merchantProfile: {
        create: {
          businessName: "Épicerie Démo (compte test)",
          address: "Place du marché, 79200 Châtillon-sur-Thouet",
          category: "Alimentation",
          merchantCode,
          validated: true,
          validatedAt: new Date(),
        },
      },
    },
    include: { merchantProfile: true },
  });

  await payMerchant(jean.id, merchantCode, 800);

  const balance = await prisma.gatinelleLot.aggregate({
    where: {
      walletId: jean.wallet.id,
      status: LotStatus.ACTIVE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    _sum: { remainingCents: true },
  });

  return NextResponse.json({
    balanceCents: balance._sum.remainingCents ?? 0,
    merchant: merchantUser.merchantProfile?.businessName,
    merchantCode,
  });
}
