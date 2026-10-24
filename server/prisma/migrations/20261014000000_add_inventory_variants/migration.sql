-- AlterTable: Add lowStockThreshold to product_variants
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

-- CreateTable: inventory_adjustments
CREATE TABLE IF NOT EXISTS "inventory_adjustments" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "reason" TEXT,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_adjustments_variantId_idx" ON "inventory_adjustments"("variantId");

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
