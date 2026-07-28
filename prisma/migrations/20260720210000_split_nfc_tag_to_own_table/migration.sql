-- CreateTable
-- IF NOT EXISTS : sur main/production, cette table existe déjà (créée par la
-- migration Gâtine Box 20260721120000_add_gatine_box_and_nfc_tag, qui a
-- tourné directement sur main avant que dev n'y soit fusionnée) — structure
-- identique (voir prisma/schema.prisma). Sur l'environnement dev/staging
-- d'origine, la table n'existe pas encore et est créée normalement ici.
CREATE TABLE IF NOT EXISTS "NfcTag" (
    "id" TEXT NOT NULL,
    "tagUid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NfcTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NfcTag_tagUid_key" ON "NfcTag"("tagUid");

CREATE INDEX IF NOT EXISTS "NfcTag_userId_idx" ON "NfcTag"("userId");

-- AddForeignKey
-- Bloc conditionnel pour la même raison que CREATE TABLE IF NOT EXISTS
-- ci-dessus : Postgres n'a pas de ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NfcTag_userId_fkey') THEN
        ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Reprend les tags déjà liés (le cas échéant) avant de retirer la colonne.
INSERT INTO "NfcTag" ("id", "tagUid", "userId", "createdAt")
SELECT 'migrated_' || "id", "nfcTagUid", "id", CURRENT_TIMESTAMP
FROM "User"
WHERE "nfcTagUid" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "nfcTagUid";
