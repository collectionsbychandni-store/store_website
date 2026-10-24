import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generates a signed JWT with minimal necessary claims
 * @param {object} payload - e.g. { userId, role }
 * @returns {string} Signed JWT token
 */
export function generateToken(payload) {
  const secret = config.jwtSecret;
  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing');
  }

  // Ensure only non-sensitive claims are stored
  const sanitizedPayload = {
    userId: payload.userId,
    role: payload.role,
  };

  return jwt.sign(sanitizedPayload, secret, {
    expiresIn: config.jwtExpiresIn || '1d',
  });
}

/**
 * Verifies and decodes a JWT token
 * @param {string} token
 * @returns {object} Decoded token payload
 */
export function verifyToken(token) {
  const secret = config.jwtSecret;
  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing');
  }

  return jwt.verify(token, secret);
}
