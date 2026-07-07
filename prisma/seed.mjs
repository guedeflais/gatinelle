import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@gatinelle.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
const ADMIN_PIN = process.env.SEED_ADMIN_PIN ?? "1234";
const ADMIN_MEMBER_NUMBER = "A00000";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Un compte admin existe déjà : ${ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const pinHash = await bcrypt.hash(ADMIN_PIN, 10);
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      fullName: "Administrateur Gâtinelle",
      accountType: "PARTICULIER",
      staffRole: "ADMIN",
      memberNumber: ADMIN_MEMBER_NUMBER,
      pinHash,
    },
  });
  await prisma.wallet.create({ data: { userId: admin.id } });

  console.log(`Compte admin créé : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Numéro d'adhérent / PIN : ${ADMIN_MEMBER_NUMBER} / ${ADMIN_PIN}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
