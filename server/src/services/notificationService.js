import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../config/db.js';
import {
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
  STORE_NAME,
  FRONTEND_URL,
  isEmailConfigured,
  isWhatsAppConfigured,
  getSanitizedNotificationConfig,
} from '../config/notificationConfig.js';
import emailTemplates from './templates/emailTemplates.js';
import whatsappTemplates from './templates/whatsappTemplates.js';
import { loadCollection, saveCollection } from '../utils/fileStore.js';
import * as authService from './authService.js';

/**
 * Collections by Chandni - Notification & Transactional Messaging Service
 *
 * Implements Launch Step 26:
 * - Dual Email provider: Resend API or SMTP (via nodemailer) with dry-run fallback
 * - MSG91 WhatsApp Official Business API with dry-run simulation
 * - 5 core transactional events:
 *    1. ORDER_CONFIRMED
 *    2. PAYMENT_CONFIRMED
 *    3. ORDER_DISPATCHED
 *    4. ORDER_CANCELLED
 *    5. REFUND_PROCESSED
 * - Strict segregation between PayU (prepaid) and Cash on Delivery (COD)
 * - Strict non-blocking execution (failures NEVER break checkout or webhooks)
 * - Idempotency protection to prevent duplicate notifications
 * - Customer notification preferences & opt-out compliance
 * - Outbox logging & Dual persistence (Prisma PostgreSQL + fileStore JSON fallback)
 * - Admin inspection, filtering, stats, and manual retry
 */

// In-memory fallback notifications collection backed by disk storage
let inMemoryNotifications = loadCollection('notifications', []);

function persistNotifications() {
  saveCollection('notifications', inMemoryNotifications);
}

let lastDbCheck = 0;
let lastDbStatus = false;

async function isDatabaseAlive() {
  const now = Date.now();
  if (now - lastDbCheck < 10000) {
    return lastDbStatus;
  }
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 1000)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    lastDbStatus = true;
    lastDbCheck = now;
    return true;
  } catch (e) {
    lastDbStatus = false;
    lastDbCheck = now;
    return false;
  }
}

/**
 * Normalizes Indian mobile number to E.164 without '+' for MSG91
 * Example inputs: '+91 98123 45678', '9812345678', '09812345678' -> '919812345678'
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits.length >= 10 ? digits : null;
}

/**
 * Validates email address format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Checks customer opt-out preferences
 */
async function checkUserPreference(userId, channel) {
  if (!userId) return true; // guest or not specified defaults to opt-in for transactional
  try {
    const user = await authService.getUserById(userId);
    if (!user) return true;
    if (channel === 'EMAIL') {
      return user.emailNotifications !== false;
    }
    if (channel === 'WHATSAPP') {
      return user.whatsappNotifications !== false;
    }
  } catch (e) {
    // Graceful fallback to true
  }
  return true;
}

/**
 * Low-level Email Dispatcher (Resend / SMTP / Dry-Run)
 */
async function dispatchEmail({ to, subject, html, text }) {
  const configured = isEmailConfigured();

  if (!configured || EMAIL_PROVIDER === 'DRY_RUN') {
    const ref = `sim_em_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    console.log(`[EMAIL DRY-RUN] To: ${to} | Subject: "${subject}" | ProviderRef: ${ref}`);
    return {
      success: true,
      provider: 'DRY_RUN',
      providerRef: ref,
      status: 'SENT',
    };
  }

  // 1. Resend API
  if (EMAIL_PROVIDER === 'RESEND') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Resend API error (${response.status}): ${data.message || JSON.stringify(data)}`);
    }

    return {
      success: true,
      provider: 'RESEND',
      providerRef: data.id || `resend_${Date.now()}`,
      status: 'SENT',
    };
  }

  // 2. SMTP Transport via Nodemailer
  if (EMAIL_PROVIDER === 'SMTP') {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    return {
      success: true,
      provider: 'SMTP',
      providerRef: info.messageId || `smtp_${Date.now()}`,
      status: 'SENT',
    };
  }

  throw new Error(`Unsupported email provider: ${EMAIL_PROVIDER}`);
}

/**
 * Low-level MSG91 WhatsApp Dispatcher (Official API / Dry-Run)
 */
async function dispatchWhatsApp({ to, templatePayload, textFallback }) {
  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo) {
    throw new Error(`Invalid mobile phone number for WhatsApp: ${to}`);
  }

  const configured = isWhatsAppConfigured();

  if (!configured) {
    const ref = `sim_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    console.log(`[WHATSAPP DRY-RUN] To: ${normalizedTo} | Template: ${templatePayload?.template_name} | ProviderRef: ${ref}`);
    console.log(`[WHATSAPP MESSAGE TEXT]:\n${textFallback}\n----------------------------------`);
    return {
      success: true,
      provider: 'DRY_RUN',
      providerRef: ref,
      status: 'SENT',
      normalizedRecipient: normalizedTo,
    };
  }

  // Official MSG91 Outbound WhatsApp Bulk API
  const body = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: 'template',
    payload: {
      to: normalizedTo,
      type: 'template',
      template: templatePayload,
    },
  };

  const response = await fetch(MSG91_WHATSAPP_URL, {
    method: 'POST',
    headers: {
      'authkey': MSG91_AUTH_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || (data.status && data.status !== 'success' && data.status !== 1)) {
    throw new Error(`MSG91 WhatsApp API error (${response.status}): ${data.message || JSON.stringify(data)}`);
  }

  return {
    success: true,
    provider: 'MSG91',
    providerRef: String(data.request_id || data.message_id || `msg91_${Date.now()}`),
    status: 'SENT',
    normalizedRecipient: normalizedTo,
  };
}

/**
 * Stores or updates a notification record in Dual persistence (Prisma + fileStore)
 */
async function saveNotificationRecord(record) {
  const now = new Date();
  const notificationItem = {
    ...record,
    id: record.id || `notif-${crypto.randomUUID()}`,
    attempts: record.attempts || 1,
    lastAttemptAt: now,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  // 1. Prisma DB if alive
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      await prisma.notification.upsert({
        where: { id: notificationItem.id },
        create: {
          id: notificationItem.id,
          orderId: notificationItem.orderId || null,
          userId: notificationItem.userId || null,
          event: notificationItem.event,
          channel: notificationItem.channel,
          recipient: notificationItem.recipient,
          status: notificationItem.status,
          provider: notificationItem.provider,
          providerRef: notificationItem.providerRef || null,
          idempotencyKey: notificationItem.idempotencyKey || null,
          subject: notificationItem.subject || null,
          templateName: notificationItem.templateName || null,
          metadata: notificationItem.metadata || null,
          errorMessage: notificationItem.errorMessage || null,
          attempts: notificationItem.attempts,
          lastAttemptAt: notificationItem.lastAttemptAt,
          deliveredAt: notificationItem.deliveredAt || null,
        },
        update: {
          status: notificationItem.status,
          provider: notificationItem.provider,
          providerRef: notificationItem.providerRef || null,
          errorMessage: notificationItem.errorMessage || null,
          attempts: notificationItem.attempts,
          lastAttemptAt: notificationItem.lastAttemptAt,
          deliveredAt: notificationItem.deliveredAt || null,
          updatedAt: now,
        },
      });
    } catch (e) {
      // Prisma write fallback
    }
  }

  // 2. In-memory / fileStore
  const existingIdx = inMemoryNotifications.findIndex((n) => n.id === notificationItem.id);
  if (existingIdx >= 0) {
    inMemoryNotifications[existingIdx] = {
      ...inMemoryNotifications[existingIdx],
      ...notificationItem,
    };
  } else {
    inMemoryNotifications.unshift(notificationItem);
  }
  persistNotifications();

  return notificationItem;
}

/**
 * Finds an existing notification by idempotency key
 */
async function findByIdempotencyKey(key) {
  if (!key) return null;
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const found = await prisma.notification.findUnique({
        where: { idempotencyKey: key },
      });
      if (found) return found;
    } catch (e) {
      // Fallback
    }
  }

  return inMemoryNotifications.find((n) => n.idempotencyKey === key) || null;
}

/**
 * Master Dispatch Runner with Idempotency, Preferences, and Error Resilience
 */
async function executeNotification({
  orderId = null,
  userId = null,
  event,
  channel,
  recipient,
  idempotencyKey,
  subject = null,
  templateName = null,
  metadata = {},
  renderFn,
}) {
  const notifId = `notif-${crypto.randomUUID()}`;

  // 1. Idempotency Check: if already sent/delivered, return without resending
  if (idempotencyKey) {
    const existing = await findByIdempotencyKey(idempotencyKey);
    if (existing && (existing.status === 'SENT' || existing.status === 'DELIVERED')) {
      console.log(`[NOTIFICATION IDEMPOTENCY] Skipping already dispatched ${event} (${channel}) for key: ${idempotencyKey}`);
      return existing;
    }
  }

  // 2. Customer Preference Opt-Out Check
  const isOptedIn = await checkUserPreference(userId, channel);
  if (!isOptedIn) {
    const skippedRecord = {
      id: notifId,
      orderId,
      userId,
      event,
      channel,
      recipient: recipient || 'N/A',
      status: 'SKIPPED',
      provider: channel === 'EMAIL' ? EMAIL_PROVIDER : 'MSG91',
      idempotencyKey,
      subject,
      templateName,
      metadata,
      errorMessage: `Customer has opted out of ${channel} notifications`,
      attempts: 0,
    };
    return await saveNotificationRecord(skippedRecord);
  }

  // 3. Recipient Validation
  if (channel === 'EMAIL' && !isValidEmail(recipient)) {
    const invalidRecord = {
      id: notifId,
      orderId,
      userId,
      event,
      channel,
      recipient: recipient || 'Missing',
      status: 'FAILED',
      provider: EMAIL_PROVIDER,
      idempotencyKey,
      subject,
      templateName,
      metadata,
      errorMessage: `Invalid recipient email address: "${recipient}"`,
      attempts: 1,
    };
    return await saveNotificationRecord(invalidRecord);
  }

  if (channel === 'WHATSAPP') {
    const normalized = normalizePhoneNumber(recipient);
    if (!normalized) {
      const invalidRecord = {
        id: notifId,
        orderId,
        userId,
        event,
        channel,
        recipient: recipient || 'Missing',
        status: 'FAILED',
        provider: 'MSG91',
        idempotencyKey,
        subject,
        templateName,
        metadata,
        errorMessage: `Invalid recipient phone number for WhatsApp: "${recipient}"`,
        attempts: 1,
      };
      return await saveNotificationRecord(invalidRecord);
    }
  }

  // 4. Render Payload & Execute Dispatch
  try {
    const rendered = await renderFn();

    let dispatchResult;
    if (channel === 'EMAIL') {
      dispatchResult = await dispatchEmail({
        to: recipient,
        subject: rendered.subject || subject,
        html: rendered.html,
        text: rendered.text,
      });
    } else if (channel === 'WHATSAPP') {
      dispatchResult = await dispatchWhatsApp({
        to: recipient,
        templatePayload: rendered.templatePayload,
        textFallback: rendered.text,
      });
    }

    const successRecord = {
      id: notifId,
      orderId,
      userId,
      event,
      channel,
      recipient: dispatchResult.normalizedRecipient || recipient,
      status: dispatchResult.status || 'SENT',
      provider: dispatchResult.provider,
      providerRef: dispatchResult.providerRef,
      idempotencyKey,
      subject: rendered.subject || subject,
      templateName,
      metadata,
      attempts: 1,
      deliveredAt: dispatchResult.status === 'DELIVERED' ? new Date() : null,
    };

    return await saveNotificationRecord(successRecord);
  } catch (dispatchError) {
    console.error(`[NOTIFICATION DISPATCH ERROR] ${channel} ${event}:`, dispatchError.message);

    const failedRecord = {
      id: notifId,
      orderId,
      userId,
      event,
      channel,
      recipient,
      status: 'FAILED',
      provider: channel === 'EMAIL' ? EMAIL_PROVIDER : 'MSG91',
      idempotencyKey,
      subject,
      templateName,
      metadata,
      errorMessage: dispatchError.message,
      attempts: 1,
    };

    return await saveNotificationRecord(failedRecord);
  }
}

// ---------------------------------------------------------------------------
// 5 CORE TRANSACTIONAL EVENT HANDLERS
// ---------------------------------------------------------------------------

/**
 * 1. ORDER CONFIRMED
 * Triggered after an order is durably committed to the database.
 * Supports distinct messaging for COD (payment pending upon delivery)
 * vs PayU (awaiting online verification).
 */
export async function sendOrderConfirmationNotifications({ order, customer }) {
  if (!order) return { email: null, whatsapp: null };

  const orderId = order.id;
  const orderNumber = order.orderNumber || orderId;
  const userId = order.userId;

  const recipientEmail = customer?.email || order.shippingAddress?.email || order.user?.email;
  const recipientPhone = customer?.phone || order.shippingAddress?.phone || order.user?.phone;

  const results = { email: null, whatsapp: null };

  // Dispatch Email Notification (Non-blocking)
  if (recipientEmail) {
    try {
      results.email = await executeNotification({
        orderId,
        userId,
        event: 'ORDER_CONFIRMED',
        channel: 'EMAIL',
        recipient: recipientEmail,
        idempotencyKey: `${orderId}_ORDER_CONFIRMED_EMAIL`,
        subject: `Order Confirmation: ${orderNumber} - ${STORE_NAME}`,
        templateName: 'order_confirmed_email',
        metadata: { orderNumber, paymentMethod: order.paymentMethod, total: order.totalAmount },
        renderFn: () => emailTemplates.renderOrderConfirmedEmail({ order, customer }),
      });
    } catch (e) {
      console.warn('Order confirmation email non-blocking failure:', e.message);
    }
  }

  // Dispatch WhatsApp Notification (Non-blocking)
  if (recipientPhone) {
    try {
      results.whatsapp = await executeNotification({
        orderId,
        userId,
        event: 'ORDER_CONFIRMED',
        channel: 'WHATSAPP',
        recipient: recipientPhone,
        idempotencyKey: `${orderId}_ORDER_CONFIRMED_WHATSAPP`,
        templateName: 'order_confirmed_whatsapp',
        metadata: { orderNumber, paymentMethod: order.paymentMethod, total: order.totalAmount },
        renderFn: () => whatsappTemplates.renderOrderConfirmedWhatsApp({ order, customer }),
      });
    } catch (e) {
      console.warn('Order confirmation WhatsApp non-blocking failure:', e.message);
    }
  }

  return results;
}

/**
 * 2. PAYMENT CONFIRMED
 * Triggered strictly after PayU payment has been verified server-side.
 */
export async function sendPaymentConfirmationNotifications({ order, customer, paymentDetails = {} }) {
  if (!order) return { email: null, whatsapp: null };

  const orderId = order.id;
  const orderNumber = order.orderNumber || orderId;
  const userId = order.userId;

  const recipientEmail = customer?.email || order.shippingAddress?.email || order.user?.email;
  const recipientPhone = customer?.phone || order.shippingAddress?.phone || order.user?.phone;

  const results = { email: null, whatsapp: null };

  if (recipientEmail) {
    try {
      results.email = await executeNotification({
        orderId,
        userId,
        event: 'PAYMENT_CONFIRMED',
        channel: 'EMAIL',
        recipient: recipientEmail,
        idempotencyKey: `${orderId}_PAYMENT_CONFIRMED_EMAIL`,
        subject: `Payment Received: Order ${orderNumber} - ${STORE_NAME}`,
        templateName: 'payment_confirmed_email',
        metadata: {
          orderNumber,
          txnid: paymentDetails.txnid || order.paymentDetails?.txnid,
          amount: paymentDetails.amount || order.totalAmount,
        },
        renderFn: () => emailTemplates.renderPaymentConfirmedEmail({ order, customer, paymentDetails }),
      });
    } catch (e) {
      console.warn('Payment confirmation email non-blocking failure:', e.message);
    }
  }

  if (recipientPhone) {
    try {
      results.whatsapp = await executeNotification({
        orderId,
        userId,
        event: 'PAYMENT_CONFIRMED',
        channel: 'WHATSAPP',
        recipient: recipientPhone,
        idempotencyKey: `${orderId}_PAYMENT_CONFIRMED_WHATSAPP`,
        templateName: 'payment_confirmed_whatsapp',
        metadata: {
          orderNumber,
          txnid: paymentDetails.txnid || order.paymentDetails?.txnid,
          amount: paymentDetails.amount || order.totalAmount,
        },
        renderFn: () => whatsappTemplates.renderPaymentConfirmedWhatsApp({ order, customer, paymentDetails }),
      });
    } catch (e) {
      console.warn('Payment confirmation WhatsApp non-blocking failure:', e.message);
    }
  }

  return results;
}

/**
 * 3. ORDER DISPATCHED
 * Triggered when consignment is dispatched and AWB is assigned.
 */
export async function sendOrderDispatchedNotifications({ order, customer, shipment = {} }) {
  if (!order) return { email: null, whatsapp: null };

  const orderId = order.id;
  const orderNumber = order.orderNumber || orderId;
  const userId = order.userId;

  const recipientEmail = customer?.email || order.shippingAddress?.email || order.user?.email;
  const recipientPhone = customer?.phone || order.shippingAddress?.phone || order.user?.phone;

  const results = { email: null, whatsapp: null };

  if (recipientEmail) {
    try {
      results.email = await executeNotification({
        orderId,
        userId,
        event: 'ORDER_DISPATCHED',
        channel: 'EMAIL',
        recipient: recipientEmail,
        idempotencyKey: `${orderId}_ORDER_DISPATCHED_EMAIL`,
        subject: `Dispatched: Your Order ${orderNumber} is on its way - ${STORE_NAME}`,
        templateName: 'order_dispatched_email',
        metadata: {
          orderNumber,
          awbCode: shipment.awbCode,
          courierName: shipment.courierName,
        },
        renderFn: () => emailTemplates.renderOrderDispatchedEmail({ order, customer, shipment }),
      });
    } catch (e) {
      console.warn('Order dispatched email non-blocking failure:', e.message);
    }
  }

  if (recipientPhone) {
    try {
      results.whatsapp = await executeNotification({
        orderId,
        userId,
        event: 'ORDER_DISPATCHED',
        channel: 'WHATSAPP',
        recipient: recipientPhone,
        idempotencyKey: `${orderId}_ORDER_DISPATCHED_WHATSAPP`,
        templateName: 'order_dispatched_whatsapp',
        metadata: {
          orderNumber,
          awbCode: shipment.awbCode,
          courierName: shipment.courierName,
        },
        renderFn: () => whatsappTemplates.renderOrderDispatchedWhatsApp({ order, customer, shipment }),
      });
    } catch (e) {
      console.warn('Order dispatched WhatsApp non-blocking failure:', e.message);
    }
  }

  return results;
}

/**
 * 4. ORDER CANCELLED
 * Triggered upon customer or admin cancellation.
 */
export async function sendOrderCancelledNotifications({
  order,
  customer,
  cancellationReason = 'Cancelled per request',
  refundNote = '',
}) {
  if (!order) return { email: null, whatsapp: null };

  const orderId = order.id;
  const orderNumber = order.orderNumber || orderId;
  const userId = order.userId;

  const recipientEmail = customer?.email || order.shippingAddress?.email || order.user?.email;
  const recipientPhone = customer?.phone || order.shippingAddress?.phone || order.user?.phone;

  const results = { email: null, whatsapp: null };

  if (recipientEmail) {
    try {
      results.email = await executeNotification({
        orderId,
        userId,
        event: 'ORDER_CANCELLED',
        channel: 'EMAIL',
        recipient: recipientEmail,
        idempotencyKey: `${orderId}_ORDER_CANCELLED_EMAIL`,
        subject: `Order Cancelled: ${orderNumber} - ${STORE_NAME}`,
        templateName: 'order_cancelled_email',
        metadata: { orderNumber, cancellationReason, refundNote },
        renderFn: () =>
          emailTemplates.renderOrderCancelledEmail({
            order,
            customer,
            cancellationReason,
            refundNote,
          }),
      });
    } catch (e) {
      console.warn('Order cancelled email non-blocking failure:', e.message);
    }
  }

  if (recipientPhone) {
    try {
      results.whatsapp = await executeNotification({
        orderId,
        userId,
        event: 'ORDER_CANCELLED',
        channel: 'WHATSAPP',
        recipient: recipientPhone,
        idempotencyKey: `${orderId}_ORDER_CANCELLED_WHATSAPP`,
        templateName: 'order_cancelled_whatsapp',
        metadata: { orderNumber, cancellationReason, refundNote },
        renderFn: () =>
          whatsappTemplates.renderOrderCancelledWhatsApp({
            order,
            customer,
            cancellationReason,
            refundNote,
          }),
      });
    } catch (e) {
      console.warn('Order cancelled WhatsApp non-blocking failure:', e.message);
    }
  }

  return results;
}

/**
 * 5. REFUND PROCESSED
 * Triggered strictly after a refund transaction has been verified.
 */
export async function sendRefundProcessedNotifications({ order, customer, refund = {} }) {
  if (!order) return { email: null, whatsapp: null };

  const orderId = order.id;
  const orderNumber = order.orderNumber || orderId;
  const userId = order.userId;

  const recipientEmail = customer?.email || order.shippingAddress?.email || order.user?.email;
  const recipientPhone = customer?.phone || order.shippingAddress?.phone || order.user?.phone;

  const results = { email: null, whatsapp: null };

  if (recipientEmail) {
    try {
      results.email = await executeNotification({
        orderId,
        userId,
        event: 'REFUND_PROCESSED',
        channel: 'EMAIL',
        recipient: recipientEmail,
        idempotencyKey: `${orderId}_${refund.id || refund.payuRefundId || 'ref'}_REFUND_PROCESSED_EMAIL`,
        subject: `Refund Processed: ₹${Number(refund.amount || order.totalAmount).toLocaleString(
          'en-IN'
        )} for Order ${orderNumber} - ${STORE_NAME}`,
        templateName: 'refund_processed_email',
        metadata: {
          orderNumber,
          amount: refund.amount || order.totalAmount,
          bankRef: refund.bankRefNum || refund.payuRefundId,
        },
        renderFn: () => emailTemplates.renderRefundProcessedEmail({ order, customer, refund }),
      });
    } catch (e) {
      console.warn('Refund processed email non-blocking failure:', e.message);
    }
  }

  if (recipientPhone) {
    try {
      results.whatsapp = await executeNotification({
        orderId,
        userId,
        event: 'REFUND_PROCESSED',
        channel: 'WHATSAPP',
        recipient: recipientPhone,
        idempotencyKey: `${orderId}_${refund.id || refund.payuRefundId || 'ref'}_REFUND_PROCESSED_WHATSAPP`,
        templateName: 'refund_processed_whatsapp',
        metadata: {
          orderNumber,
          amount: refund.amount || order.totalAmount,
          bankRef: refund.bankRefNum || refund.payuRefundId,
        },
        renderFn: () => whatsappTemplates.renderRefundProcessedWhatsApp({ order, customer, refund }),
      });
    } catch (e) {
      console.warn('Refund processed WhatsApp non-blocking failure:', e.message);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// ADMIN VISIBILITY & MANAGEMENT
// ---------------------------------------------------------------------------

/**
 * Retrieves paginated, filterable notifications for Admin Dashboard
 */
export async function getAdminNotifications({
  page = 1,
  limit = 20,
  channel = null,
  event = null,
  status = null,
  orderId = null,
  search = null,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const where = {};
      if (channel) where.channel = channel.toUpperCase();
      if (event) where.event = event.toUpperCase();
      if (status) where.status = status.toUpperCase();
      if (orderId) where.orderId = orderId;
      if (search) {
        where.OR = [
          { recipient: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { orderId: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, items] = await Promise.all([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      return {
        notifications: items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      };
    } catch (e) {
      // In-memory fallback
    }
  }

  // In-memory filtering
  let filtered = [...inMemoryNotifications];
  if (channel) {
    filtered = filtered.filter((n) => n.channel === channel.toUpperCase());
  }
  if (event) {
    filtered = filtered.filter((n) => n.event === event.toUpperCase());
  }
  if (status) {
    filtered = filtered.filter((n) => n.status === status.toUpperCase());
  }
  if (orderId) {
    filtered = filtered.filter((n) => n.orderId === orderId);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        (n.recipient && n.recipient.toLowerCase().includes(q)) ||
        (n.subject && n.subject.toLowerCase().includes(q)) ||
        (n.orderId && n.orderId.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = filtered.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(startIndex, startIndex + limitNum);

  return {
    notifications: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Returns summary stats for admin analytics
 */
export async function getNotificationStats() {
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const [total, sent, failed, skipped, byChannel, byEvent] = await Promise.all([
        prisma.notification.count(),
        prisma.notification.count({ where: { status: { in: ['SENT', 'DELIVERED'] } } }),
        prisma.notification.count({ where: { status: 'FAILED' } }),
        prisma.notification.count({ where: { status: 'SKIPPED' } }),
        prisma.notification.groupBy({
          by: ['channel'],
          _count: { channel: true },
        }),
        prisma.notification.groupBy({
          by: ['event'],
          _count: { event: true },
        }),
      ]);

      return {
        total,
        sent,
        failed,
        skipped,
        byChannel: byChannel.reduce((acc, c) => ({ ...acc, [c.channel]: c._count.channel }), {}),
        byEvent: byEvent.reduce((acc, e) => ({ ...acc, [e.event]: e._count.event }), {}),
        sanitizedConfig: getSanitizedNotificationConfig(),
      };
    } catch (e) {
      // Fallback to in-memory stats
    }
  }

  const total = inMemoryNotifications.length;
  const sent = inMemoryNotifications.filter((n) => n.status === 'SENT' || n.status === 'DELIVERED').length;
  const failed = inMemoryNotifications.filter((n) => n.status === 'FAILED').length;
  const skipped = inMemoryNotifications.filter((n) => n.status === 'SKIPPED').length;

  const byChannel = inMemoryNotifications.reduce((acc, n) => {
    acc[n.channel] = (acc[n.channel] || 0) + 1;
    return acc;
  }, {});

  const byEvent = inMemoryNotifications.reduce((acc, n) => {
    acc[n.event] = (acc[n.event] || 0) + 1;
    return acc;
  }, {});

  return {
    total,
    sent,
    failed,
    skipped,
    byChannel,
    byEvent,
    sanitizedConfig: getSanitizedNotificationConfig(),
  };
}

/**
 * Retries a failed or skipped notification record
 */
export async function retryNotification(notificationId) {
  if (!notificationId) {
    const err = new Error('Notification ID is required for retry');
    err.status = 400;
    throw err;
  }

  let notification = null;
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
    } catch (e) {
      // Fallback
    }
  }

  if (!notification) {
    notification = inMemoryNotifications.find((n) => n.id === notificationId);
  }

  if (!notification) {
    const err = new Error('Notification record not found');
    err.status = 404;
    throw err;
  }

  const now = new Date();
  const nextAttempts = (notification.attempts || 1) + 1;

  try {
    let dispatchResult;
    if (notification.channel === 'EMAIL') {
      dispatchResult = await dispatchEmail({
        to: notification.recipient,
        subject: notification.subject || `Notification - ${STORE_NAME}`,
        html: `<p>Retried notification for ${notification.event}</p>`,
        text: `Retried notification for ${notification.event}`,
      });
    } else {
      dispatchResult = await dispatchWhatsApp({
        to: notification.recipient,
        templatePayload: {
          template_name: notification.templateName || 'cbc_order_confirmation',
          language: { code: 'en' },
          body_parameters: ['Patron', notification.orderId || 'Order'],
        },
        textFallback: `Retried WhatsApp notification for ${notification.event}`,
      });
    }

    const updated = {
      ...notification,
      status: dispatchResult.status || 'SENT',
      provider: dispatchResult.provider,
      providerRef: dispatchResult.providerRef,
      errorMessage: null,
      attempts: nextAttempts,
      lastAttemptAt: now,
      updatedAt: now,
    };

    return await saveNotificationRecord(updated);
  } catch (err) {
    const failed = {
      ...notification,
      status: 'FAILED',
      errorMessage: err.message,
      attempts: nextAttempts,
      lastAttemptAt: now,
      updatedAt: now,
    };
    return await saveNotificationRecord(failed);
  }
}

/**
 * Updates customer notification preferences
 */
export async function updateCustomerPreferences(userId, { emailNotifications, whatsappNotifications }) {
  if (!userId) {
    const err = new Error('User ID is required');
    err.status = 400;
    throw err;
  }

  const emailOpt = typeof emailNotifications === 'boolean' ? emailNotifications : undefined;
  const whatsappOpt = typeof whatsappNotifications === 'boolean' ? whatsappNotifications : undefined;

  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const data = {};
      if (emailOpt !== undefined) data.emailNotifications = emailOpt;
      if (whatsappOpt !== undefined) data.whatsappNotifications = whatsappOpt;

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          phone: true,
          emailNotifications: true,
          whatsappNotifications: true,
        },
      });
      return user;
    } catch (e) {
      // In-memory fallback
    }
  }

  const user = authService._getInMemoryUsers().find((u) => u.id === userId);
  if (user) {
    if (emailOpt !== undefined) user.emailNotifications = emailOpt;
    if (whatsappOpt !== undefined) user.whatsappNotifications = whatsappOpt;
    user.updatedAt = new Date();
    saveCollection('users', authService._getInMemoryUsers());
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      emailNotifications: user.emailNotifications !== false,
      whatsappNotifications: user.whatsappNotifications !== false,
    };
  }

  const err = new Error('User not found');
  err.status = 404;
  throw err;
}

/**
 * Gets customer notification preferences
 */
export async function getCustomerPreferences(userId) {
  if (!userId) {
    const err = new Error('User ID is required');
    err.status = 400;
    throw err;
  }

  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          emailNotifications: true,
          whatsappNotifications: true,
        },
      });
      if (user) return user;
    } catch (e) {
      // Fallback
    }
  }

  const user = authService._getInMemoryUsers().find((u) => u.id === userId);
  if (user) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      emailNotifications: user.emailNotifications !== false,
      whatsappNotifications: user.whatsappNotifications !== false,
    };
  }

  const err = new Error('User not found');
  err.status = 404;
  throw err;
}

export default {
  normalizePhoneNumber,
  isValidEmail,
  sendOrderConfirmationNotifications,
  sendPaymentConfirmationNotifications,
  sendOrderDispatchedNotifications,
  sendOrderCancelledNotifications,
  sendRefundProcessedNotifications,
  getAdminNotifications,
  getNotificationStats,
  retryNotification,
  updateCustomerPreferences,
  getCustomerPreferences,
};
