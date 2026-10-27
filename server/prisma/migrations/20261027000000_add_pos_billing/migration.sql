-- AlterTable: Add safe POS billing fields to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'ONLINE';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'ONLINE_PREPAID';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerDetails" JSONB;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "posCashierId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "posCashierName" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "posNotes" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cashTendered" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "changeDue" DECIMAL(10,2);

-- AlterTable: Make userId nullable for walk-in POS sales without registered accounts
ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex: Add index on source for fast reporting
CREATE INDEX IF NOT EXISTS "orders_source_idx" ON "orders"("source");
