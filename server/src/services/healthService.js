import prisma from '../config/db.js';

/**
 * Health service handling API diagnostics and status checks
 */

export const getHealthStatus = () => {
  return {
    success: true,
    message: 'Collections by Chandni API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
};

/**
 * Verifies backend communication with PostgreSQL via Prisma
 * Strictly avoids exposing database credentials or URLs
 */
export const checkDatabaseHealth = async () => {
  try {
    // Execute a simple ping query through Prisma connection pool
    await prisma.$queryRaw`SELECT 1`;
    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    // Sanitize error without exposing connection strings or credentials
    console.error('PostgreSQL health check failed:', error.code || error.message);
    return {
      success: false,
      message: 'Database connection failed',
      error: 'Unable to communicate with PostgreSQL database. Verify DATABASE_URL and database availability.',
    };
  }
};
