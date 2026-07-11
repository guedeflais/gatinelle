import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { attemptPasswordLogin, MAX_PASSWORD_ATTEMPTS } from "@/lib/passwordAuth";
import { AccountType } from "@prisma/client";

let counter = 0;
function uniqueEmail() {
  counter += 1;
  return `pwd-test-${Date.now()}-${counter}@test.local`;
}
function uniqueMemberNumber() {
  counter += 1;
  return `X${(Date.now() + counter).toString().slice(-5)}`;
}

async function createUserWithPassword(password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email: uniqueEmail(),
      passwordHash,
      pinHash: "x",
      memberNumber: uniqueMemberNumber(),
      fullName: "Test Password",
      accountType: AccountType.PARTICULIER,
    },
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("attemptPasswordLogin", () => {
  it("réussit avec le bon email et mot de passe", async () => {
    const user = await createUserWithPassword("correct-password");
    const result = await attemptPasswordLogin(user.email, "correct-password");
    expect(result?.id).toBe(user.id);
  });

  it("échoue avec un mauvais mot de passe sans bloquer avant le seuil", async () => {
    const user = await createUserWithPassword("correct-password");
    const result = await attemptPasswordLogin(user.email, "wrong-password");
    expect(result).toBeNull();

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.passwordFailedAttempts).toBe(1);
    expect(refreshed.passwordLockedUntil).toBeNull();
  });

  it("bloque temporairement après MAX_PASSWORD_ATTEMPTS échecs, même le bon mot de passe", async () => {
    const user = await createUserWithPassword("correct-password");

    for (let i = 0; i < MAX_PASSWORD_ATTEMPTS; i++) {
      await attemptPasswordLogin(user.email, "wrong-password");
    }

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.passwordLockedUntil).not.toBeNull();
    expect(refreshed.passwordLockedUntil!.getTime()).toBeGreaterThan(Date.now());

    const result = await attemptPasswordLogin(user.email, "correct-password");
    expect(result).toBeNull();
  });

  it("remet le compteur à zéro après une connexion réussie", async () => {
    const user = await createUserWithPassword("correct-password");
    await attemptPasswordLogin(user.email, "wrong-password");
    await attemptPasswordLogin(user.email, "correct-password");

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.passwordFailedAttempts).toBe(0);
    expect(refreshed.passwordLockedUntil).toBeNull();
  });

  it("ne bloque jamais indéfiniment (la date de déblocage est dans le futur proche, pas nulle-pour-toujours)", async () => {
    const user = await createUserWithPassword("correct-password");
    for (let i = 0; i < MAX_PASSWORD_ATTEMPTS; i++) {
      await attemptPasswordLogin(user.email, "wrong-password");
    }
    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const minutesUntilUnlock = (refreshed.passwordLockedUntil!.getTime() - Date.now()) / 60000;
    expect(minutesUntilUnlock).toBeLessThanOrEqual(15);
    expect(minutesUntilUnlock).toBeGreaterThan(0);
  });

  it("retourne null pour un email inconnu", async () => {
    const result = await attemptPasswordLogin("inconnu@test.local", "peu-importe");
    expect(result).toBeNull();
  });

  it("empêche le contournement du blocage par des tentatives concurrentes", async () => {
    const user = await createUserWithPassword("correct-password");

    await Promise.all(
      Array.from({ length: MAX_PASSWORD_ATTEMPTS * 4 }, () =>
        attemptPasswordLogin(user.email, "wrong-password")
      )
    );

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.passwordLockedUntil).not.toBeNull();
    expect(refreshed.passwordFailedAttempts).toBeGreaterThanOrEqual(MAX_PASSWORD_ATTEMPTS);
  });
});
