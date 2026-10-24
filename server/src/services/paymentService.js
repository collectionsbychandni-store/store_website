import crypto from 'crypto';
import prisma from '../config/db.js';
import payuConfig, {
  PAYU_KEY,
  PAYU_SALT,
  PAYU_ENV,
  getPaymentGatewayUrl,
  getVerifyServiceUrl,
  generateRequestHash,
  verifyResponseHash,
  generateVerifyPaymentHash,
} from '../config/payuConfig.js';
import * as orderService from './orderService.js';
import * as inventoryService from './inventoryService.js';
import * as variantService from './variantService.js';

/**
 * Collections by Chandni - Payment Gateway & Fulfillment Service
 *
 * Implements Launch Step 21:
 * - PayU India Hosted Checkout payment request creation & SHA-512 signing
 * - PayU response verification with reverse SHA-512 checksum validation
 * - S2S postservice verification (verify_payment)
 * - Cash on Delivery (COD) order fulfillment & lifecycle management
 * - Inventory deduction and rollback coordination
 * - Dev sandbox simulation for test verification
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';

let lastDbCheckTime = 0;
let lastDbAliveStatus = false;

async function isDatabaseAlive() {
  const now = Date.now();
  if (now - lastDbCheckTime < 10000) {
    return lastDbAliveStatus;
  }
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 1000)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    lastDbAliveStatus = true;
    lastDbCheckTime = now;
    return true;
  } catch (e) {
    lastDbAliveStatus = false;
    lastDbCheckTime = now;
    return false;
  }
}

/**
 * Generates PayU Hosted Checkout request parameters for a pending order
 */
export async function generatePayUPaymentData({ order, customer, customUrls = {} }) {
  if (!order) {
    const err = new Error('Order is required to initiate PayU payment');
    err.status = 400;
    throw err;
  }

  const orderNumber = order.orderNumber;
  const cleanOrderNum = String(orderNumber).replace(/[^a-zA-Z0-9]/g, '');
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  const txnid = `CBC_${cleanOrderNum}_${timestamp}_${random}`;

  const amount = Number(order.totalAmount).toFixed(2);
  const productinfo = `Collections by Chandni Order ${orderNumber}`;
  const firstname = (customer?.name || order.shippingAddress?.name || 'Patron').split(' ')[0] || 'Patron';
  const email = (customer?.email || 'patron@collectionsbychandni.in').toLowerCase().trim();
  const phone = (customer?.phone || order.shippingAddress?.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10);

  // Callback URLs for PayU form POST
  const surl = customUrls.surl || `${BACKEND_PUBLIC_URL}/api/checkout/payu/response`;
  const furl = customUrls.furl || `${BACKEND_PUBLIC_URL}/api/checkout/payu/response`;

  // User-defined fields to identify order securely in response
  const udf1 = order.orderNumber;
  const udf2 = order.userId || '';
  const udf3 = order.id || '';
  const udf4 = order.paymentMethod || 'PAYU';
  const udf5 = PAYU_ENV;

  const hash = generateRequestHash({
    key: PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
  });

  const paymentData = {
    actionUrl: getPaymentGatewayUrl(),
    key: PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    surl,
    furl,
    hash,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    service_provider: 'payu_paisa',
    environment: PAYU_ENV,
  };

  // Record payment attempt on order
  order.paymentMethod = 'PAYU';
  order.lastTxnId = txnid;
  order.paymentInitiatedAt = new Date();

  return paymentData;
}

/**
 * Handles PayU Gateway Callback (surl / furl POST from PayU)
 */
export async function handlePayUCallback(postData = {}) {
  const {
    txnid,
    amount,
    status,
    hash,
    mihpayid,
    mode,
    bank_ref_num,
    error,
    error_Message,
    udf1, // orderNumber
    udf3, // orderId
  } = postData;

  const orderIdentifier = udf1 || udf3;

  if (!orderIdentifier) {
    console.error('PayU callback received without order identifier in UDF fields:', postData);
    return {
      success: false,
      message: 'Missing order reference in payment response',
      redirectUrl: `${FRONTEND_URL}/checkout/payment-status?status=failure&message=${encodeURIComponent(
        'Missing order reference in payment callback'
      )}`,
    };
  }

  // Find order in database or in-memory
  const order = await orderService.getAdminOrderById(orderIdentifier);
  if (!order) {
    console.error(`PayU callback received for unknown order: ${orderIdentifier}`);
    return {
      success: false,
      message: 'Referenced order was not found',
      redirectUrl: `${FRONTEND_URL}/checkout/payment-status?status=failure&message=${encodeURIComponent(
        'Order record not found'
      )}`,
    };
  }

  // 1. Verify Reverse Checksum Hash
  const hashVerification = verifyResponseHash(postData, PAYU_SALT);
  if (!hashVerification.isValid) {
    console.error(`SECURITY ALERT: PayU reverse hash mismatch for order ${order.orderNumber}:`, {
      postData,
      hashVerification,
    });

    const auditEntry = {
      id: `shist-${crypto.randomUUID()}`,
      orderId: order.id,
      previousStatus: order.status,
      newStatus: order.status,
      adminName: 'Security Gate',
      note: `PayU payment callback checksum verification FAILED. Potential tampering detected.`,
      isCustomerSafe: false,
      createdAt: new Date(),
    };

    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push(auditEntry);

    return {
      success: false,
      message: 'Payment verification failed: checksum mismatch',
      redirectUrl: `${FRONTEND_URL}/checkout/payment-status?orderNumber=${order.orderNumber}&status=failure&message=${encodeURIComponent(
        'Payment checksum validation failed'
      )}`,
    };
  }

  const isSuccess = String(status).toLowerCase() === 'success';

  if (isSuccess) {
    // 2. Process Successful Payment
    const now = new Date();
    order.paymentStatus = 'PAID';
    order.paymentMethod = 'PAYU';
    order.status = 'CONFIRMED';
    order.updatedAt = now;
    order.paymentDetails = {
      provider: 'PayU Hosted Checkout',
      txnid,
      mihpayid,
      mode: mode || 'ONLINE',
      bankRefNum: bank_ref_num || null,
      amount: Number(amount) || Number(order.totalAmount),
      paidAt: now,
      verifiedVia: 'Reverse SHA-512 Hash & Gateway Callback',
    };

    // 3. Deduct Inventory if not already deducted
    let inventoryDeducted = false;
    if (!order.isStockDeducted) {
      try {
        for (const item of order.items || []) {
          if (!item.productVariantId) continue;
          await inventoryService.adjustStock(item.productVariantId, {
            mode: 'DECREASE',
            quantity: item.quantity,
            reason: `Order ${order.orderNumber} confirmed via PayU (${txnid})`,
            adminUserId: null,
          });
        }
        order.isStockDeducted = true;
        inventoryDeducted = true;
      } catch (stockErr) {
        console.warn('Inventory deduction warning during payment callback:', stockErr.message);
      }
    }

    // 4. Record Customer-Safe Audit History
    const historyEntry = {
      id: `shist-${crypto.randomUUID()}`,
      orderId: order.id,
      previousStatus: 'PENDING',
      newStatus: 'CONFIRMED',
      adminName: 'PayU Payment Gateway',
      note: `Online payment of ₹${Number(amount || order.totalAmount).toLocaleString(
        'en-IN'
      )} verified successfully via PayU (Txn: ${txnid}, Mode: ${mode || 'Online'})`,
      isCustomerSafe: true,
      createdAt: now,
    };

    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push(historyEntry);

    // 5. Update Database if alive
    const dbAlive = await isDatabaseAlive();
    if (dbAlive) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            isStockDeducted: order.isStockDeducted,
            updatedAt: now,
          },
        });
      } catch (dbErr) {
        console.warn('DB update fallback for PayU success:', dbErr.message);
      }
    }

    const redirectUrl = `${FRONTEND_URL}/checkout/payment-status?orderNumber=${order.orderNumber}&status=success&txnid=${txnid}&mode=${encodeURIComponent(
      mode || 'ONLINE'
    )}&amount=${amount}`;

    return {
      success: true,
      order,
      txnid,
      redirectUrl,
    };
  } else {
    // 6. Handle Failed or Cancelled Payment
    const now = new Date();
    order.paymentStatus = 'FAILED';
    order.updatedAt = now;
    const failureReason = error_Message || error || 'Transaction cancelled or declined by patron';

    const historyEntry = {
      id: `shist-${crypto.randomUUID()}`,
      orderId: order.id,
      previousStatus: order.status,
      newStatus: order.status,
      adminName: 'PayU Payment Gateway',
      note: `PayU payment failed: ${failureReason} (Txn: ${txnid})`,
      isCustomerSafe: true,
      createdAt: now,
    };

    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push(historyEntry);

    const redirectUrl = `${FRONTEND_URL}/checkout/payment-status?orderNumber=${order.orderNumber}&status=failure&message=${encodeURIComponent(
      failureReason
    )}&txnid=${txnid || ''}`;

    return {
      success: false,
      order,
      txnid,
      redirectUrl,
    };
  }
}

/**
 * Processes Cash on Delivery (COD) confirmation for an order
 */
export async function processCashOnDeliveryOrder({ order, notes, adminUser }) {
  if (!order) {
    const err = new Error('Order is required for COD confirmation');
    err.status = 400;
    throw err;
  }

  const now = new Date();
  order.paymentMethod = 'COD';
  order.paymentStatus = 'AWAITING_PAYMENT';
  order.status = 'CONFIRMED';
  order.updatedAt = now;

  // Deduct inventory for COD order confirmation
  let inventoryDeducted = false;
  if (!order.isStockDeducted) {
    for (const item of order.items || []) {
      if (!item.productVariantId) continue;
      // Pre-check stock
      const variant = await variantService.getVariantById(item.productVariantId);
      const available = variant ? Number(variant.stock) : 0;
      if (available < item.quantity) {
        const err = new Error(
          `Insufficient stock for "${item.productTitle}" (${item.size}/${item.color}) to confirm COD order. Available: ${available}, required: ${item.quantity}.`
        );
        err.status = 400;
        throw err;
      }
    }

    for (const item of order.items || []) {
      if (!item.productVariantId) continue;
      await inventoryService.adjustStock(item.productVariantId, {
        mode: 'DECREASE',
        quantity: item.quantity,
        reason: `Order ${order.orderNumber} confirmed with Cash on Delivery (COD)`,
        adminUserId: adminUser?.id || null,
      });
    }

    order.isStockDeducted = true;
    inventoryDeducted = true;
  }

  // Status history record
  const historyEntry = {
    id: `shist-${crypto.randomUUID()}`,
    orderId: order.id,
    previousStatus: 'PENDING',
    newStatus: 'CONFIRMED',
    adminName: adminUser?.name || 'Customer Checkout',
    note: `Order confirmed with Cash on Delivery (COD). Total payable amount of ₹${Number(
      order.totalAmount
    ).toLocaleString('en-IN')} to be collected upon courier delivery.`,
    isCustomerSafe: true,
    createdAt: now,
  };

  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
  order.statusHistory.push(historyEntry);

  // Update DB if alive
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'AWAITING_PAYMENT',
          isStockDeducted: order.isStockDeducted,
          updatedAt: now,
        },
      });
    } catch (dbErr) {
      console.warn('DB update fallback for COD order:', dbErr.message);
    }
  }

  return order;
}

/**
 * Cross-checks transaction with PayU S2S verify_payment API
 */
export async function verifyPayUWithS2S({ txnid }) {
  if (!txnid) {
    return { verified: false, reason: 'Missing transaction ID' };
  }

  try {
    const verifyUrl = getVerifyServiceUrl();
    const hash = generateVerifyPaymentHash({
      key: PAYU_KEY,
      command: 'verify_payment',
      var1: txnid,
      salt: PAYU_SALT,
    });

    const params = new URLSearchParams();
    params.append('key', PAYU_KEY);
    params.append('command', 'verify_payment');
    params.append('var1', txnid);
    params.append('hash', hash);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      return {
        verified: false,
        reason: `PayU S2S responded with status ${response.status}`,
      };
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      return { verified: false, reason: 'Invalid JSON response from PayU S2S' };
    }

    const txnDetails = data.transaction_details?.[txnid];
    const isSuccess = txnDetails?.status === 'success';

    return {
      verified: isSuccess,
      status: txnDetails?.status || 'unknown',
      details: txnDetails || null,
      raw: data,
    };
  } catch (err) {
    console.warn('PayU S2S verification network warning:', err.message);
    return {
      verified: false,
      reason: err.message,
      isNetworkWarning: true,
    };
  }
}

/**
 * Simulates PayU Gateway Callback for dev sandbox testing without needing external OTPs
 */
export async function simulatePayUCallback({ orderNumber, outcome = 'success', paymentMode = 'UPI' }) {
  const order = await orderService.getAdminOrderById(orderNumber);
  if (!order) {
    const err = new Error(`Order ${orderNumber} not found for payment simulation`);
    err.status = 404;
    throw err;
  }

  const txnid = order.lastTxnId || `CBC_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now().toString().slice(-6)}`;
  const amount = Number(order.totalAmount).toFixed(2);
  const status = outcome === 'success' ? 'success' : 'failure';
  const mihpayid = `payu_sim_${Date.now()}`;
  const bank_ref_num = `bank_ref_${Math.floor(100000 + Math.random() * 900000)}`;

  const firstname = (order.shippingAddress?.name || 'Patron').split(' ')[0];
  const email = 'patron@collectionsbychandni.in';
  const productinfo = `Collections by Chandni Order ${order.orderNumber}`;

  const udf1 = order.orderNumber;
  const udf2 = order.userId || '';
  const udf3 = order.id || '';
  const udf4 = 'PAYU';
  const udf5 = PAYU_ENV;

  // Compute genuine reverse hash so simulation executes genuine verification logic
  const responseDataForHash = {
    key: PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    status,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
  };

  const verification = verifyResponseHash({ ...responseDataForHash, hash: 'placeholder' }, PAYU_SALT);
  const computedHash = verification.calculatedHash;

  const mockPostData = {
    ...responseDataForHash,
    hash: computedHash,
    mihpayid,
    mode: paymentMode,
    bank_ref_num,
    error_Message: outcome === 'success' ? '' : 'Simulated payment failure / declined by customer bank',
  };

  return await handlePayUCallback(mockPostData);
}

export default {
  generatePayUPaymentData,
  handlePayUCallback,
  processCashOnDeliveryOrder,
  verifyPayUWithS2S,
  simulatePayUCallback,
};
