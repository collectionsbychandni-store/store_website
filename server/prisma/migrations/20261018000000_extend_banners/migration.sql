-- CreateTable banners if not exists
CREATE TABLE IF NOT EXISTS "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "desktopImageUrl" TEXT,
    "mobileImageUrl" TEXT,
    "imagePublicId" TEXT,
    "buttonText" TEXT,
    "buttonLink" TEXT,
    "destinationUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- AlterTable banners if already exists
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "desktopImageUrl" TEXT;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "mobileImageUrl" TEXT;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "imagePublicId" TEXT;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "destinationUrl" TEXT;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
