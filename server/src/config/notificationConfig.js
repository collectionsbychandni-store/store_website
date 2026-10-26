/**
 * Collections by Chandni - Email & WhatsApp Notification Configuration
 *
 * Implements Launch Step 26:
 * - Provider credential management (Resend / SMTP / MSG91)
 * - Safe environment variable detection and dry-run fallback
 * - Sensitive credential isolation (never sent to client)
 * - WhatsApp MSG91 official template mappings
 */

export const NOTIFICATION_ENV = process.env.NOTIFICATION_ENV || process.env.NODE_ENV || 'development';

// ---------------------------------------------------------------------------
// 1. EMAIL PROVIDER CONFIGURATION
// ---------------------------------------------------------------------------
// Supported: 'RESEND', 'SMTP', 'DRY_RUN'
export const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'RESEND' : process.env.SMTP_HOST ? 'SMTP' : 'DRY_RUN')).toUpperCase();

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Collections by Chandni <orders@collectionsbychandni.in>';
export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// SMTP Configuration
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

// ---------------------------------------------------------------------------
// 2. WHATSAPP PROVIDER CONFIGURATION (MSG91)
// ---------------------------------------------------------------------------
export const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
export const MSG91_INTEGRATED_NUMBER = process.env.MSG91_INTEGRATED_NUMBER || '917755887517';
export const MSG91_WHATSAPP_URL = process.env.MSG91_WHATSAPP_URL || 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

// Configured MSG91 WhatsApp template identifiers
export const MSG91_TEMPLATES = {
  ORDER_CONFIRMATION: process.env.MSG91_TEMPLATE_ORDER_CONFIRMATION || 'cbc_order_confirmation',
  PAYMENT_CONFIRMATION: process.env.MSG91_TEMPLATE_PAYMENT_CONFIRMATION || 'cbc_payment_confirmation',
  ORDER_DISPATCHED: process.env.MSG91_TEMPLATE_ORDER_DISPATCHED || 'cbc_order_dispatched',
  ORDER_CANCELLED: process.env.MSG91_TEMPLATE_ORDER_CANCELLED || 'cbc_order_cancelled',
  REFUND_PROCESSED: process.env.MSG91_TEMPLATE_REFUND_PROCESSED || 'cbc_refund_processed',
};

// ---------------------------------------------------------------------------
// 3. STORE & ATELIER METADATA FOR NOTIFICATIONS
// ---------------------------------------------------------------------------
export const STORE_NAME = 'Collections by Chandni';
export const STORE_TAGLINE = 'Luxury Indian Handloom & Bespoke Couture';
export const SUPPORT_EMAIL = 'care@collectionsbychandni.in';
export const SUPPORT_PHONE = '+91 77558 87517';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Checks if email delivery is genuinely configured
 */
export function isEmailConfigured() {
  if (EMAIL_PROVIDER === 'RESEND') {
    return Boolean(RESEND_API_KEY && RESEND_API_KEY.trim().length > 0);
  }
  if (EMAIL_PROVIDER === 'SMTP') {
    return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
  }
  return false;
}

/**
 * Checks if WhatsApp delivery is genuinely configured
 */
export function isWhatsAppConfigured() {
  return Boolean(
    MSG91_AUTH_KEY &&
    MSG91_AUTH_KEY.trim().length > 0 &&
    MSG91_INTEGRATED_NUMBER &&
    MSG91_INTEGRATED_NUMBER.trim().length > 0
  );
}

/**
 * Returns redacted configuration for admin health checks (never leaking credentials)
 */
export function getSanitizedNotificationConfig() {
  const emailConfigured = isEmailConfigured();
  const whatsappConfigured = isWhatsAppConfigured();

  return {
    environment: NOTIFICATION_ENV,
    email: {
      provider: EMAIL_PROVIDER,
      isConfigured: emailConfigured,
      from: EMAIL_FROM,
      mode: emailConfigured ? 'LIVE' : 'DRY_RUN (Simulated)',
      smtpHost: SMTP_HOST ? `${SMTP_HOST.slice(0, 4)}***` : 'None',
    },
    whatsapp: {
      provider: 'MSG91',
      isConfigured: whatsappConfigured,
      integratedNumber: MSG91_INTEGRATED_NUMBER ? `${MSG91_INTEGRATED_NUMBER.slice(0, 4)}***` : 'None',
      mode: whatsappConfigured ? 'LIVE' : 'DRY_RUN (Simulated)',
      templates: MSG91_TEMPLATES,
    },
    supportContact: {
      email: SUPPORT_EMAIL,
      phone: SUPPORT_PHONE,
      storeName: STORE_NAME,
    },
  };
}

export default {
  EMAIL_PROVIDER,
  EMAIL_FROM,
  RESEND_API_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  MSG91_AUTH_KEY,
  MSG91_INTEGRATED_NUMBER,
  MSG91_WHATSAPP_URL,
  MSG91_TEMPLATES,
  STORE_NAME,
  STORE_TAGLINE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  FRONTEND_URL,
  isEmailConfigured,
  isWhatsAppConfigured,
  getSanitizedNotificationConfig,
};
