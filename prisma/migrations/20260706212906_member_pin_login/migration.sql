/*
  Warnings:

  - Added the required column `memberNumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pinHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "staffRole" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberNumber" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "pinBlocked" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("accountType", "createdAt", "email", "fullName", "id", "passwordHash", "staffRole") SELECT "accountType", "createdAt", "email", "fullName", "id", "passwordHash", "staffRole" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_memberNumber_key" ON "User"("memberNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
