import { PrismaClient } from '@prisma/client';

/**
 * Collections by Chandni - Prisma Client Singleton
 * Preserves connection pool and avoids instantiating multiple instances in dev.
 */

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.DEBUG_PRISMA === 'true' ? ['warn', 'error'] : [],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let isSyncing = false;
let isSynced = false;

/**
 * Idempotently verifies and auto-synchronizes database schema columns
 * Prevents "The column product_images.publicId does not exist" errors
 */
export async function syncDatabaseSchema() {
  if (isSynced || isSyncing) return;
  isSyncing = true;
  try {
    // Ping database
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 1500)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);

    // Ensure product_images has all columns declared in schema.prisma
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_images') THEN
          ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
          ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;
          ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'banners') THEN
          ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "desktopImageUrl" TEXT;
          ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "mobileImageUrl" TEXT;
          ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "imagePublicId" TEXT;
          ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "destinationUrl" TEXT;
        END IF;
      END $$;
    `);

    isSynced = true;
    console.log('✓ Database schema synchronized successfully (product_images columns verified)');
  } catch (err) {
    // If database is offline or in memory mode, fail open gracefully
    console.warn('Database schema sync note:', err.message);
  } finally {
    isSyncing = false;
  }
}

export default prisma;
