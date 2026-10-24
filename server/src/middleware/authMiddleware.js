import { verifyToken } from '../utils/jwt.js';
import * as authService from '../services/authService.js';

/**
 * Authentication Middleware
 * 1. Reads Authorization header: Bearer <token>
 * 2. Verifies the JWT
 * 3. Loads user details and attaches to req.user
 * 4. Returns 401 if missing, invalid, or expired
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Load active user info from database / service
    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      // If user was deleted or does not exist
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    // Token expired or invalid signature
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
}

/**
 * Admin Authorization Middleware
 * Verifies that the authenticated user possesses the ADMIN role.
 * Must be used after authenticateToken.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
}

/**
 * Optional Authentication Middleware
 * If Authorization header is present and valid, attaches req.user.
 * Otherwise, allows request to proceed as unauthenticated public user.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return next();
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return next();
  }

  const token = parts[1];
  try {
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      const user = await authService.getUserById(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore invalid/expired token in optional auth
  }

  next();
}

export default {
  authenticateToken,
  requireAdmin,
  optionalAuth,
};

