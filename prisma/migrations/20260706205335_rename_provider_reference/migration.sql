/*
  Warnings:

  - You are about to drop the column `stripePaymentIntentId` on the `Transaction` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "validatedById" TEXT,
    "validatedAt" DATETIME,
    "providerReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amountCents", "createdAt", "fromUserId", "id", "paymentMethod", "status", "toUserId", "type", "validatedAt", "validatedById") SELECT "amountCents", "createdAt", "fromUserId", "id", "paymentMethod", "status", "toUserId", "type", "validatedAt", "validatedById" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_providerReference_key" ON "Transaction"("providerReference");
CREATE INDEX "Transaction_type_status_idx" ON "Transaction"("type", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
