CREATE TABLE "NfcTag" (
    "id" TEXT NOT NULL,
    "tagUid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NfcTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NfcTag_tagUid_key" ON "NfcTag"("tagUid");

CREATE INDEX "NfcTag_userId_idx" ON "NfcTag"("userId");

ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprend les tags déjà liés (le cas échéant) avant de retirer la colonne.
INSERT INTO "NfcTag" ("id", "tagUid", "userId", "createdAt")
SELECT 'migrated_' || "id", "nfcTagUid", "id", CURRENT_TIMESTAMP
FROM "User"
WHERE "nfcTagUid" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "nfcTagUid";
