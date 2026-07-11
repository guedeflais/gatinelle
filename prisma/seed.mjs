import "dotenv/config";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Pas de mot de passe/PIN par défaut faibles : si non fournis via l'environnement,
// on en génère des forts aléatoirement et on les affiche une seule fois, pour ne
// jamais risquer de créer silencieusement un compte admin prévisible (ex.
// admin1234) — y compris par erreur en production.
function randomPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
}
function randomPin() {
  return String(crypto.randomInt(0, 10000)).padStart(4, "0");
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@gatinelle.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? randomPassword();
const ADMIN_PIN = process.env.SEED_ADMIN_PIN ?? randomPin();
const ADMIN_MEMBER_NUMBER = process.env.SEED_ADMIN_MEMBER_NUMBER ?? "A00000";

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
  console.log("Notez ces identifiants maintenant : ils ne seront plus jamais affichés.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
