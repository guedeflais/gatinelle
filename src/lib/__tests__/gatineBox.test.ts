import { prisma } from "@/lib/prisma";
import {
  manufactureGatineBox,
  sellGatineBox,
  activateGatineBox,
  MAX_ACTIVATION_ATTEMPTS,
  InvalidStateError,
  NotFoundError,
} from "@/lib/gatineBox";
import { getBalanceCents } from "@/lib/wallet";
import { generateMerchantCode } from "@/lib/merchantCode";
import { AccountType } from "@prisma/client";

let counter = 0;
function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.local`;
}
function uniqueMemberNumber() {
  counter += 1;
  return `W${(Date.now() + counter).toString().slice(-5)}`;
}
function uniqueNfcTagUid() {
  counter += 1;
  return `TEST-UID-${Date.now()}-${counter}`;
}

async function createAdmin() {
  return prisma.user.create({
    data: {
      email: uniqueEmail("admin"),
      passwordHash: "x",
      pinHash: "x",
      memberNumber: uniqueMemberNumber(),
      fullName: "Test Admin",
      accountType: AccountType.PARTICULIER,
      staffRole: "ADMIN",
    },
  });
}

async function createParticulier() {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail("particulier"),
      passwordHash: "x",
      pinHash: "x",
      memberNumber: uniqueMemberNumber(),
      fullName: "Test Bénéficiaire",
      accountType: AccountType.PARTICULIER,
    },
  });
  const wallet = await prisma.wallet.create({ data: { userId: user.id } });
  return { user, wallet };
}

async function createValidatedMerchant() {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail("commercant"),
      passwordHash: "x",
      pinHash: "x",
      memberNumber: uniqueMemberNumber(),
      fullName: "Test Commerçant",
      accountType: AccountType.COMMERCANT,
    },
  });
  const wallet = await prisma.wallet.create({ data: { userId: user.id } });
  const merchantProfile = await prisma.merchantProfile.create({
    data: {
      userId: user.id,
      businessName: "Boutique Test",
      address: "1 rue du Test",
      category: "AUTRE",
      merchantCode: generateMerchantCode(),
      validated: true,
    },
  });
  return { user, wallet, merchantProfile };
}

async function manufactureAndSell(merchantProfileId: string, priceCents = 2000) {
  const admin = await createAdmin();
  const { boxNumber, activationCode } = await manufactureGatineBox(admin.id, uniqueNfcTagUid());
  await sellGatineBox(merchantProfileId, boxNumber, priceCents);
  return { boxNumber, activationCode, priceCents };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("manufactureGatineBox", () => {
  it("crée une box au statut manufacturée avec un numéro et un code distincts", async () => {
    const admin = await createAdmin();
    const result = await manufactureGatineBox(admin.id, uniqueNfcTagUid());
    expect(result.boxNumber).toHaveLength(8);
    expect(result.activationCode).toHaveLength(12);

    const box = await prisma.gatineBox.findUniqueOrThrow({ where: { boxNumber: result.boxNumber } });
    expect(box.status).toBe("MANUFACTURED");
    expect(box.activationCodeHash).not.toBe(result.activationCode);
  });

  it("refuse de réutiliser une carte NFC déjà associée à une box", async () => {
    const admin = await createAdmin();
    const uid = uniqueNfcTagUid();
    await manufactureGatineBox(admin.id, uid);
    await expect(manufactureGatineBox(admin.id, uid)).rejects.toThrow(InvalidStateError);
  });
});

describe("sellGatineBox", () => {
  it("enregistre le prix une seule fois et passe la box au statut vendue", async () => {
    const admin = await createAdmin();
    const { merchantProfile } = await createValidatedMerchant();
    const { boxNumber } = await manufactureGatineBox(admin.id, uniqueNfcTagUid());

    const sold = await sellGatineBox(merchantProfile.id, boxNumber, 1500);
    expect(sold.status).toBe("SOLD");
    expect(sold.priceCents).toBe(1500);
  });

  it("refuse de revendre une box déjà vendue", async () => {
    const admin = await createAdmin();
    const { merchantProfile } = await createValidatedMerchant();
    const { boxNumber } = await manufactureGatineBox(admin.id, uniqueNfcTagUid());
    await sellGatineBox(merchantProfile.id, boxNumber, 1000);

    await expect(sellGatineBox(merchantProfile.id, boxNumber, 2000)).rejects.toThrow(InvalidStateError);
  });

  it("refuse un numéro de box inconnu", async () => {
    const { merchantProfile } = await createValidatedMerchant();
    await expect(sellGatineBox(merchantProfile.id, "INCONNU1", 1000)).rejects.toThrow(NotFoundError);
  });
});

describe("activateGatineBox", () => {
  it("crédite le compte, lie la carte NFC et active la box avec le bon code", async () => {
    const { merchantProfile } = await createValidatedMerchant();
    const { user: beneficiary, wallet } = await createParticulier();
    const { boxNumber, activationCode, priceCents } = await manufactureAndSell(merchantProfile.id, 2500);

    const transaction = await activateGatineBox(beneficiary.id, boxNumber, activationCode);
    expect(transaction.amountCents).toBe(priceCents);

    const balance = await getBalanceCents(prisma, wallet.id);
    expect(balance).toBe(priceCents);

    const box = await prisma.gatineBox.findUniqueOrThrow({ where: { boxNumber } });
    expect(box.status).toBe("ACTIVATED");
    expect(box.activatedByUserId).toBe(beneficiary.id);

    const nfcTag = await prisma.nfcTag.findUniqueOrThrow({ where: { tagUid: box.nfcTagUid } });
    expect(nfcTag.userId).toBe(beneficiary.id);
  });

  it("refuse l'activation par un compte commerçant même avec le bon code", async () => {
    const { merchantProfile } = await createValidatedMerchant();
    const { user: otherMerchant } = await createValidatedMerchant();
    const { boxNumber, activationCode } = await manufactureAndSell(merchantProfile.id);

    await expect(activateGatineBox(otherMerchant.id, boxNumber, activationCode)).rejects.toThrow(
      InvalidStateError
    );

    const box = await prisma.gatineBox.findUniqueOrThrow({ where: { boxNumber } });
    expect(box.status).toBe("SOLD");
  });

  it("refuse une seconde activation de la même box", async () => {
    const { merchantProfile } = await createValidatedMerchant();
    const { user: beneficiary } = await createParticulier();
    const { user: otherBeneficiary } = await createParticulier();
    const { boxNumber, activationCode } = await manufactureAndSell(merchantProfile.id);

    await activateGatineBox(beneficiary.id, boxNumber, activationCode);
    await expect(activateGatineBox(otherBeneficiary.id, boxNumber, activationCode)).rejects.toThrow(
      InvalidStateError
    );
  });

  it("bloque la box après MAX_ACTIVATION_ATTEMPTS codes erronés, y compris le bon ensuite", async () => {
    const { merchantProfile } = await createValidatedMerchant();
    const { user: beneficiary } = await createParticulier();
    const { boxNumber, activationCode } = await manufactureAndSell(merchantProfile.id);

    for (let i = 0; i < MAX_ACTIVATION_ATTEMPTS; i++) {
      await expect(activateGatineBox(beneficiary.id, boxNumber, "MAUVAIS-CODE")).rejects.toThrow(
        InvalidStateError
      );
    }

    const box = await prisma.gatineBox.findUniqueOrThrow({ where: { boxNumber } });
    expect(box.activationBlocked).toBe(true);

    await expect(activateGatineBox(beneficiary.id, boxNumber, activationCode)).rejects.toThrow(
      InvalidStateError
    );
  });

  it("empêche la double activation lors de deux tentatives concurrentes avec le bon code", async () => {
    const { merchantProfile } = await createValidatedMerchant();
    const { user: beneficiary1 } = await createParticulier();
    const { user: beneficiary2 } = await createParticulier();
    const { boxNumber, activationCode } = await manufactureAndSell(merchantProfile.id);

    const results = await Promise.allSettled([
      activateGatineBox(beneficiary1.id, boxNumber, activationCode),
      activateGatineBox(beneficiary2.id, boxNumber, activationCode),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const box = await prisma.gatineBox.findUniqueOrThrow({ where: { boxNumber } });
    expect(box.status).toBe("ACTIVATED");
  });
});
