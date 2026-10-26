import {
  STORE_NAME,
  SUPPORT_PHONE,
  FRONTEND_URL,
  MSG91_TEMPLATES,
} from '../../config/notificationConfig.js';

/**
 * Collections by Chandni - Official MSG91 WhatsApp Message Templates
 *
 * Implements Launch Step 26:
 * - MSG91 template body parameter format
 * - Plain text fallback for simulated logging
 * - Separate COD vs Prepaid messaging
 * - Safe authenticated tracking URLs
 */

// ---------------------------------------------------------------------------
// 1. ORDER CONFIRMATION
// ---------------------------------------------------------------------------
export function renderOrderConfirmedWhatsApp({ order, customer, storeUrl = FRONTEND_URL }) {
  const isCod = order.paymentMethod === 'COD';
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Patron';
  const totalFormatted = `₹${Number(order.totalAmount).toLocaleString('en-IN')}`;
  const orderUrl = `${storeUrl}/account/orders/${encodeURIComponent(order.id || orderNumber)}`;

  const paymentText = isCod
    ? `Cash on Delivery (${totalFormatted} payable upon courier delivery)`
    : `PayU Online Payment (Awaiting confirmation)`;

  // Formatted plain text for fallback & dry-run log
  const text = `Namaste ${customerName},

Thank you for choosing ${STORE_NAME}.
Your order *${orderNumber}* has been confirmed!

Total: *${totalFormatted}*
Payment Method: ${paymentText}

View order details & status:
${orderUrl}

Atelier Support: ${SUPPORT_PHONE}`;

  // MSG91 Template payload structure
  const templatePayload = {
    template_name: MSG91_TEMPLATES.ORDER_CONFIRMATION,
    language: { code: 'en', policy: 'deterministic' },
    body_parameters: [
      customerName,
      orderNumber,
      totalFormatted,
      isCod ? 'Cash on Delivery (Pending Collection)' : 'PayU Prepaid',
      orderUrl,
    ],
  };

  return {
    templatePayload,
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. PAYMENT CONFIRMATION (PayU Verified)
// ---------------------------------------------------------------------------
export function renderPaymentConfirmedWhatsApp({ order, customer, paymentDetails = {}, storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Patron';
  const totalFormatted = `₹${Number(paymentDetails.amount || order.totalAmount).toLocaleString('en-IN')}`;
  const txnId = paymentDetails.txnid || order.lastTxnId || 'Verified';
  const orderUrl = `${storeUrl}/account/orders/${encodeURIComponent(order.id || orderNumber)}`;

  const text = `Namaste ${customerName},

We have received and verified your payment of *${totalFormatted}* for order *${orderNumber}* via PayU (Txn ID: ${txnId}).

Your handloom pieces are now queued for artisan packing.

Track your order:
${orderUrl}

${STORE_NAME}`;

  const templatePayload = {
    template_name: MSG91_TEMPLATES.PAYMENT_CONFIRMATION,
    language: { code: 'en', policy: 'deterministic' },
    body_parameters: [
      customerName,
      orderNumber,
      totalFormatted,
      txnId,
      orderUrl,
    ],
  };

  return {
    templatePayload,
    text,
  };
}

// ---------------------------------------------------------------------------
// 3. ORDER DISPATCHED (Shiprocket Courier & AWB)
// ---------------------------------------------------------------------------
export function renderOrderDispatchedWhatsApp({ order, customer, shipment = {}, storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Patron';
  const courierName = shipment.courierName || 'Shiprocket Express';
  const awbCode = shipment.awbCode || 'Pending';
  const trackingUrl = shipment.trackingUrl || `https://shiprocket.co//tracking/${encodeURIComponent(awbCode)}`;

  const text = `Namaste ${customerName},

Your heirloom parcel for order *${orderNumber}* has been dispatched via *${courierName}*!

AWB Tracking Code: *${awbCode}*
Track live status here:
${trackingUrl}

${STORE_NAME}`;

  const templatePayload = {
    template_name: MSG91_TEMPLATES.ORDER_DISPATCHED,
    language: { code: 'en', policy: 'deterministic' },
    body_parameters: [
      customerName,
      orderNumber,
      courierName,
      awbCode,
      trackingUrl,
    ],
  };

  return {
    templatePayload,
    text,
  };
}

// ---------------------------------------------------------------------------
// 4. ORDER CANCELLED
// ---------------------------------------------------------------------------
export function renderOrderCancelledWhatsApp({ order, customer, reason = '', storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Patron';
  const isPrepaid = order.paymentStatus === 'PAID';

  const refundNote = isPrepaid
    ? `Your prepaid refund of ₹${Number(order.totalAmount).toLocaleString('en-IN')} has been queued (5-7 banking days).`
    : `No payment was debited (Cash on Delivery).`;

  const text = `Namaste ${customerName},

Your order *${orderNumber}* has been cancelled as requested.
Reason: ${reason || 'Customer cancellation'}
${refundNote}

For inquiries, contact us at ${SUPPORT_PHONE}.
${STORE_NAME}`;

  const templatePayload = {
    template_name: MSG91_TEMPLATES.ORDER_CANCELLED,
    language: { code: 'en', policy: 'deterministic' },
    body_parameters: [
      customerName,
      orderNumber,
      reason || 'Customer request',
      refundNote,
    ],
  };

  return {
    templatePayload,
    text,
  };
}

// ---------------------------------------------------------------------------
// 5. REFUND PROCESSED
// ---------------------------------------------------------------------------
export function renderRefundProcessedWhatsApp({ order, customer, refund = {}, storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Patron';
  const refundAmount = `₹${Number(refund.amount || order.totalAmount).toLocaleString('en-IN')}`;
  const bankRef = refund.bankRefNum || refund.payuRefundId || 'Processed';

  const text = `Namaste ${customerName},

Your refund of *${refundAmount}* for order *${orderNumber}* has been processed successfully.
Bank Reference: ${bankRef}
The credit will reflect in your bank account in 3-5 business days.

${STORE_NAME}`;

  const templatePayload = {
    template_name: MSG91_TEMPLATES.REFUND_PROCESSED,
    language: { code: 'en', policy: 'deterministic' },
    body_parameters: [
      customerName,
      orderNumber,
      refundAmount,
      bankRef,
    ],
  };

  return {
    templatePayload,
    text,
  };
}

export default {
  renderOrderConfirmedWhatsApp,
  renderPaymentConfirmedWhatsApp,
  renderOrderDispatchedWhatsApp,
  renderOrderCancelledWhatsApp,
  renderRefundProcessedWhatsApp,
};
