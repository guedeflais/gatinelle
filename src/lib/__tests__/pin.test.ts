import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { attemptPinLogin, MAX_PIN_ATTEMPTS } from "@/lib/pin";
import { AccountType } from "@prisma/client";

let counter = 0;
function uniqueEmail() {
  counter += 1;
  return `pin-test-${Date.now()}-${counter}@test.local`;
}
function uniqueMemberNumber() {
  counter += 1;
  return `Y${(Date.now() + counter).toString().slice(-5)}`;
}

async function createUserWithPin(pin: string) {
  const pinHash = await bcrypt.hash(pin, 10);
  return prisma.user.create({
    data: {
      email: uniqueEmail(),
      passwordHash: "x",
      pinHash,
      memberNumber: uniqueMemberNumber(),
      fullName: "Test Pin",
      accountType: AccountType.PARTICULIER,
    },
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("attemptPinLogin", () => {
  it("réussit avec le bon numéro et le bon PIN", async () => {
    const user = await createUserWithPin("1234");
    const result = await attemptPinLogin(user.memberNumber, "1234");
    expect(result?.id).toBe(user.id);
  });

  it("échoue avec un mauvais PIN sans bloquer avant le seuil", async () => {
    const user = await createUserWithPin("1234");
    const result = await attemptPinLogin(user.memberNumber, "0000");
    expect(result).toBeNull();

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.pinFailedAttempts).toBe(1);
    expect(refreshed.pinBlocked).toBe(false);
  });

  it("bloque l'accès après MAX_PIN_ATTEMPTS échecs consécutifs", async () => {
    const user = await createUserWithPin("1234");

    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      await attemptPinLogin(user.memberNumber, "9999");
    }

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.pinBlocked).toBe(true);

    // Même avec le bon PIN, un compte bloqué ne doit plus permettre la connexion.
    const result = await attemptPinLogin(user.memberNumber, "1234");
    expect(result).toBeNull();
  });

  it("remet le compteur d'échecs à zéro après une connexion réussie", async () => {
    const user = await createUserWithPin("1234");
    await attemptPinLogin(user.memberNumber, "0000");
    await attemptPinLogin(user.memberNumber, "1234");

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.pinFailedAttempts).toBe(0);
    expect(refreshed.pinBlocked).toBe(false);
  });

  it("retourne null pour un numéro d'adhérent inconnu", async () => {
    const result = await attemptPinLogin("Z99999", "1234");
    expect(result).toBeNull();
  });

  it("retourne null pour un format de PIN invalide", async () => {
    const user = await createUserWithPin("1234");
    const result = await attemptPinLogin(user.memberNumber, "12");
    expect(result).toBeNull();
  });
});
