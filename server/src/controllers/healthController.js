import * as healthService from '../services/healthService.js';

/**
 * Controller to handle general API health checks
 * Returns: { "success": true, "message": "Collections by Chandni API is running" }
 */
export const checkHealth = (req, res, next) => {
  try {
    const status = healthService.getHealthStatus();
    return res.status(200).json({
      success: true,
      message: 'Collections by Chandni API is running',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle database connection health check
 * GET /api/health/db
 * Returns:
 * 200: { "success": true, "message": "Database connection successful" }
 * 503: { "success": false, "message": "Database connection failed", "error": ... }
 */
export const checkDbHealth = async (req, res, next) => {
  try {
    const result = await healthService.checkDatabaseHealth();
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(503).json(result);
    }
  } catch (error) {
    next(error);
  }
};
