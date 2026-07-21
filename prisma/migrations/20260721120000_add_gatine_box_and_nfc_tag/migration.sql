-- CreateEnum
CREATE TYPE "GatineBoxStatus" AS ENUM ('MANUFACTURED', 'SOLD', 'ACTIVATED');

-- CreateTable
-- IF NOT EXISTS : sur l'environnement de staging (partagé avec la branche
-- dev), NfcTag existe déjà, créée par la migration festival de dev sur cette
-- même base physique — structure identique (voir prisma/schema.prisma).
-- Sur main/production, la table n'existe pas encore et est créée normalement.
CREATE TABLE IF NOT EXISTS "NfcTag" (
    "id" TEXT NOT NULL,
    "tagUid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NfcTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatineBox" (
    "id" TEXT NOT NULL,
    "boxNumber" TEXT NOT NULL,
    "nfcTagUid" TEXT NOT NULL,
    "activationCodeHash" TEXT NOT NULL,
    "activationFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "activationBlocked" BOOLEAN NOT NULL DEFAULT false,
    "status" "GatineBoxStatus" NOT NULL DEFAULT 'MANUFACTURED',
    "manufacturedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceCents" INTEGER,
    "soldByMerchantProfileId" TEXT,
    "soldAt" TIMESTAMP(3),
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "creditTransactionId" TEXT,

    CONSTRAINT "GatineBox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NfcTag_tagUid_key" ON "NfcTag"("tagUid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NfcTag_userId_idx" ON "NfcTag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GatineBox_boxNumber_key" ON "GatineBox"("boxNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GatineBox_nfcTagUid_key" ON "GatineBox"("nfcTagUid");

-- CreateIndex
CREATE INDEX "GatineBox_status_idx" ON "GatineBox"("status");

-- AddForeignKey
-- Bloc conditionnel pour la même raison que CREATE TABLE IF NOT EXISTS
-- ci-dessus : Postgres n'a pas de ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NfcTag_userId_fkey') THEN
        ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
ALTER TABLE "GatineBox" ADD CONSTRAINT "GatineBox_manufacturedById_fkey" FOREIGN KEY ("manufacturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatineBox" ADD CONSTRAINT "GatineBox_soldByMerchantProfileId_fkey" FOREIGN KEY ("soldByMerchantProfileId") REFERENCES "MerchantProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatineBox" ADD CONSTRAINT "GatineBox_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
