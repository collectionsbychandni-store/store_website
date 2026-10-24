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

export default prisma;
