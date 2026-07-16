-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nfcTagUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_nfcTagUid_key" ON "User"("nfcTagUid");
