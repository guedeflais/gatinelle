CREATE TABLE "StandProduct" (
    "id" TEXT NOT NULL,
    "merchantProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StandProduct_merchantProfileId_idx" ON "StandProduct"("merchantProfileId");

ALTER TABLE "StandProduct" ADD CONSTRAINT "StandProduct_merchantProfileId_fkey" FOREIGN KEY ("merchantProfileId") REFERENCES "MerchantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
