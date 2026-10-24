-- AlterTable: Add missing columns to product_images
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
