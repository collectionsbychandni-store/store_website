/**
 * Collections by Chandni - Shiprocket Logistics Configuration
 *
 * Implements Launch Step 22:
 * - Shiprocket API base endpoints
 * - Secure credential references (backend only)
 * - Packaging dimension defaults for atelier heirlooms
 * - Webhook secret validation helper
 */

export const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

export const SHIPROCKET_ENV = process.env.SHIPROCKET_ENV || 'test';
export const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || '';
export const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || '';
export const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
export const SHIPROCKET_WEBHOOK_SECRET = process.env.SHIPROCKET_WEBHOOK_SECRET || '';

// Default package configuration for luxury Indian apparel & sarees
export const DEFAULT_PACKAGE = {
  weight: parseFloat(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || '0.5'), // kg
  length: parseFloat(process.env.SHIPROCKET_DEFAULT_LENGTH_CM || '15'), // cm
  breadth: parseFloat(process.env.SHIPROCKET_DEFAULT_BREADTH_CM || '10'), // cm
  height: parseFloat(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM || '5'), // cm
};

/**
 * Checks if production/external Shiprocket API credentials are fully configured
 */
export function isShiprocketConfigured() {
  return Boolean(
    process.env.SHIPROCKET_EMAIL &&
    process.env.SHIPROCKET_EMAIL.trim().length > 0 &&
    process.env.SHIPROCKET_PASSWORD &&
    process.env.SHIPROCKET_PASSWORD.trim().length > 0
  );
}

/**
 * Returns redacted configuration for admin health checks (never leaking passwords)
 */
export function getSanitizedConfig() {
  return {
    isConfigured: isShiprocketConfigured(),
    environment: SHIPROCKET_ENV,
    email: SHIPROCKET_EMAIL ? `${SHIPROCKET_EMAIL.slice(0, 3)}***@***` : 'Not Configured',
    pickupLocation: SHIPROCKET_PICKUP_LOCATION,
    defaultPackaging: DEFAULT_PACKAGE,
    hasWebhookSecret: Boolean(SHIPROCKET_WEBHOOK_SECRET),
  };
}

export default {
  BASE_URL: SHIPROCKET_BASE_URL,
  ENV: SHIPROCKET_ENV,
  EMAIL: SHIPROCKET_EMAIL,
  PASSWORD: SHIPROCKET_PASSWORD,
  PICKUP_LOCATION: SHIPROCKET_PICKUP_LOCATION,
  WEBHOOK_SECRET: SHIPROCKET_WEBHOOK_SECRET,
  DEFAULT_PACKAGE,
  isShiprocketConfigured,
  getSanitizedConfig,
};
