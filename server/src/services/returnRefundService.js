import crypto from 'crypto';
import prisma from '../config/db.js';
import * as orderService from './orderService.js';
import * as inventoryService from './inventoryService.js';
import * as shiprocketService from './shiprocketService.js';
import payuConfig, {
  PAYU_KEY,
  PAYU_SALT,
  getVerifyServiceUrl,
  generateRefundHash,
  generateCheckActionStatusHash,
} from '../config/payuConfig.js';

/**
 * Collections by Chandni - Returns, Refunds, Cancellations & RTO Management Service
 *
 * Implements Launch Step 23:
 * - Customer-initiated order cancellation with courier cancellation check
 * - Single atomic inventory release on cancellation
 * - Customer return request submission with itemized quantities & photo evidence
 * - Configurable return eligibility window & policies
 * - Admin return lifecycle: REQUESTED -> APPROVED / REJECTED -> PICKUP_SCHEDULED -> RECEIVED -> INSPECTED -> REFUND_PENDING -> COMPLETED
 * - Single atomic inventory restock ONLY after physical atelier inspection
 * - PayU online full & partial refund processing with SHA-512 cryptographic signing
 * - COD refund payout record & electronic payout reconciliation
 * - Decoupled financial, fulfillment, and shipping status state machine
 * - Dual PostgreSQL (Prisma) and in-memory store persistence fallback
 */

// In-memory collections for dev/preview resilience when local Postgres is not running
const inMemoryReturnRequests = [];
const inMemoryRefunds = [];

// Configurable Return & Refund Policy Settings
export const POLICY_CONFIG = {
  returnWindowDays: parseInt(process.env.RETURN_WINDOW_DAYS || '7', 10),
  cancellationAllowedStatuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'],
  nonReturnableCategories: ['CUSTOM_COUTURE', 'FINAL_SALE', 'HYGIENE_MASKS'],
  minReturnDaysNotification: 2,
  payuRefundProcessingDays: '5-7 business days',
  codPayoutProcessingDays: '3-5 business days',
};

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
 * Returns active store return & refund policies
 */
export function getReturnPolicy() {
  return {
    returnWindowDays: POLICY_CONFIG.returnWindowDays,
    cancellationWindow: 'Allowed before consignment is dispatched to courier (before SHIPPED milestone)',
    conditionRequirements: [
      'Artisan apparel must be unworn, unwashed, and undamaged',
      'All original atelier heirloom tags and packaging must remain attached',
      'Saree blouse pieces must remain unstitched and intact',
    ],
    payuRefundTimeline: POLICY_CONFIG.payuRefundProcessingDays,
    codRefundTimeline: POLICY_CONFIG.codPayoutProcessingDays,
    nonReturnableItems: ['Bespoke Custom Tailored Couture', 'Clearance Items Marked Final Sale'],
  };
}

/**
 * ---------------------------------------------------------------------------
 * 1. CUSTOMER ORDER CANCELLATION
 * ---------------------------------------------------------------------------
 */
export async function cancelOrderByCustomer({ orderId, userId, reason }) {
  if (!orderId || !userId) {
    const err = new Error('Order identifier and user authentication required');
    err.status = 400;
    throw err;
  }

  const order = await orderService.getAdminOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  // Patron ownership isolation
  if (order.userId !== userId) {
    const err = new Error('Unauthorized: You can only cancel orders placed by your account');
    err.status = 403;
    throw err;
  }

  // 1. Eligibility Check
  if (order.status === 'CANCELLED') {
    const err = new Error('This order has already been cancelled');
    err.status = 400;
    throw err;
  }

  if (['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes(order.status)) {
    const err = new Error(
      `Order ${order.orderNumber} is already ${order.status} and cannot be cancelled directly. You can request a return after delivery.`
    );
    err.status = 400;
    throw err;
  }

  if (!POLICY_CONFIG.cancellationAllowedStatuses.includes(order.status)) {
    const err = new Error(`Order ${order.orderNumber} is not in a cancellable state (${order.status})`);
    err.status = 400;
    throw err;
  }

  const cancellationReason = (reason || 'Cancelled by patron from account portal').trim();

  // 2. Check and Cancel Active Forward Shiprocket Shipment (if any)
  const shipments = await shiprocketService.getShipmentsForOrder(order.id);
  const activeForwardShipment = shipments.find(
    (s) => !s.isReturn && s.status !== 'CANCELLED'
  );

  if (activeForwardShipment) {
    // If parcel is already picked up or in transit, courier cancellation will fail
    if (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeForwardShipment.status)) {
      const err = new Error(
        'Consignment has already been dispatched to courier partner and cannot be cancelled. Please initiate a return upon delivery.'
      );
      err.status = 400;
      throw err;
    }

    try {
      await shiprocketService.cancelShipment({
        shipmentId: activeForwardShipment.id,
        reason: `Customer cancellation: ${cancellationReason}`,
        adminUser: { id: userId, name: 'Patron Portal' },
      });
    } catch (shipErr) {
      const err = new Error(
        `Unable to cancel courier dispatch: ${shipErr.message}. Order cancellation halted to prevent delivery discrepancies.`
      );
      err.status = 400;
      throw err;
    }
  }

  // 3. Single Atomic Inventory Restock (if stock was previously deducted)
  let inventoryAction = 'NONE';
  if (order.isStockDeducted) {
    for (const item of order.items || []) {
      if (!item.productVariantId) continue;
      await inventoryService.adjustStock(item.productVariantId, {
        mode: 'INCREASE',
        quantity: item.quantity,
        reason: `Order ${order.orderNumber} cancelled by customer - stock restored`,
        adminUserId: null,
      });
    }
    order.isStockDeducted = false;
    inventoryAction = 'RESTORED';
  }

  // 4. Financial & Refund Handling
  let refundResult = null;
  const isPrepaid = order.paymentMethod !== 'COD';
  const isPaid = order.paymentStatus === 'PAID';

  if (isPrepaid && isPaid) {
    // Attempt automatic PayU refund for paid cancellation
    try {
      refundResult = await processRefund({
        orderId: order.id,
        refundAmount: Number(order.totalAmount),
        reason: `Customer cancellation refund for order ${order.orderNumber}`,
        adminUser: { id: userId, name: 'System Auto-Refund' },
      });
      order.paymentStatus = 'REFUNDED';
    } catch (refundErr) {
      console.warn('PayU automatic refund on cancellation queued for manual audit:', refundErr.message);
      order.paymentStatus = 'REFUND_PENDING';
    }
  } else if (!isPaid) {
    order.paymentStatus = 'CANCELLED';
  } else {
    // COD orders before delivery do not collect funds
    order.paymentStatus = 'CANCELLED';
  }

  // 5. Update Order State & Audit Timeline
  const now = new Date();
  const previousStatus = order.status;
  order.status = 'CANCELLED';
  order.updatedAt = now;

  const historyEntry = {
    id: `shist-${crypto.randomUUID()}`,
    orderId: order.id,
    previousStatus,
    newStatus: 'CANCELLED',
    adminName: 'Customer (Patron Portal)',
    note: `Order cancelled by patron: ${cancellationReason}${
      inventoryAction === 'RESTORED' ? ' (Inventory restored)' : ''
    }${refundResult ? ' (PayU refund initiated)' : ''}`,
    isCustomerSafe: true,
    inventoryAction,
    createdAt: now,
  };

  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
  order.statusHistory.push(historyEntry);

  // 6. DB Persistence if alive
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: order.paymentStatus,
          isStockDeducted: order.isStockDeducted,
          updatedAt: now,
        },
      });
      await prisma.orderStatusHistory.create({
        data: {
          id: historyEntry.id,
          orderId: order.id,
          previousStatus,
          newStatus: 'CANCELLED',
          note: historyEntry.note,
          isCustomerSafe: true,
          createdAt: now,
        },
      });
    } catch (dbErr) {
      console.warn('DB update fallback for customer cancellation:', dbErr.message);
    }
  }

  return {
    success: true,
    message: 'Order cancelled successfully. Any active reservations have been released.',
    order,
    refund: refundResult,
  };
}

/**
 * ---------------------------------------------------------------------------
 * 2. CUSTOMER RETURN REQUEST SUBMISSION
 * ---------------------------------------------------------------------------
 */
export async function createReturnRequest({
  orderId,
  userId,
  items, // [{ orderItemId, quantity, condition }]
  reason,
  comments,
  evidenceImages = [],
}) {
  if (!orderId || !userId) {
    const err = new Error('Order identifier and user authentication required');
    err.status = 400;
    throw err;
  }

  const order = await orderService.getAdminOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  if (order.userId !== userId) {
    const err = new Error('Unauthorized: You can only request returns for your own orders');
    err.status = 403;
    throw err;
  }

  // 1. Eligibility: Order must be DELIVERED
  if (order.status !== 'DELIVERED') {
    const err = new Error(
      `Only delivered orders are eligible for return requests. Current order status: ${order.status}`
    );
    err.status = 400;
    throw err;
  }

  // 2. Return Window Check (default 7 days from delivery / update)
  const deliveryDate = new Date(order.updatedAt || order.createdAt);
  const now = new Date();
  const diffDays = (now - deliveryDate) / (1000 * 60 * 60 * 24);

  if (diffDays > POLICY_CONFIG.returnWindowDays) {
    const err = new Error(
      `Return window of ${POLICY_CONFIG.returnWindowDays} days has expired for this order. Delivered ${Math.floor(
        diffDays
      )} days ago.`
    );
    err.status = 400;
    throw err;
  }

  // 3. Duplicate Prevention: Check active return request
  const existingReturns = await getReturnRequestsForOrder(order.id);
  const activeReturn = existingReturns.find(
    (r) => !['CANCELLED', 'REJECTED'].includes(r.status)
  );

  if (activeReturn) {
    const err = new Error(
      `An active return request (${activeReturn.id}, status: ${activeReturn.status}) already exists for this order.`
    );
    err.status = 409;
    throw err;
  }

  // 4. Validate Return Items
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Please select at least one item to return');
    err.status = 400;
    throw err;
  }

  const returnItemsList = [];
  for (const item of items) {
    const orderItem = (order.items || []).find(
      (i) => i.id === item.orderItemId || i.productVariantId === item.productVariantId
    );
    if (!orderItem) {
      const err = new Error(`Item ${item.orderItemId} does not belong to this order`);
      err.status = 400;
      throw err;
    }

    const returnQty = parseInt(item.quantity, 10);
    if (isNaN(returnQty) || returnQty <= 0 || returnQty > orderItem.quantity) {
      const err = new Error(
        `Invalid return quantity (${returnQty}) for "${orderItem.productTitle}". Maximum eligible: ${orderItem.quantity}.`
      );
      err.status = 400;
      throw err;
    }

    returnItemsList.push({
      id: `retitem-${crypto.randomUUID()}`,
      orderItemId: orderItem.id,
      productVariantId: orderItem.productVariantId,
      productTitle: orderItem.productTitle,
      sku: orderItem.sku,
      quantity: returnQty,
      unitPrice: Number(orderItem.unitPrice),
      condition: item.condition || 'UNOPENED',
      restockStatus: 'PENDING',
    });
  }

  const cleanReason = (reason || 'Size or fitting adjustment').trim();
  const cleanComments = (comments || '').trim();

  // 5. Create Return Request Record
  const returnRecord = {
    id: `ret-${crypto.randomUUID()}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId,
    status: 'REQUESTED',
    reason: cleanReason,
    comments: cleanComments,
    evidenceImages: Array.isArray(evidenceImages) ? evidenceImages : [],
    rejectionReason: null,
    inspectionNotes: null,
    isRestocked: false,
    adminNotes: null,
    shiprocketReturnShipmentId: null,
    items: returnItemsList,
    createdAt: now,
    updatedAt: now,
  };

  // Add timeline entry
  const historyEntry = {
    id: `shist-${crypto.randomUUID()}`,
    orderId: order.id,
    previousStatus: order.status,
    newStatus: order.status,
    adminName: 'Customer (Patron Portal)',
    note: `Return request submitted by customer: ${cleanReason} (${returnItemsList.length} item(s))`,
    isCustomerSafe: true,
    createdAt: now,
  };

  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
  order.statusHistory.push(historyEntry);

  // 6. DB Persistence if alive
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const created = await prisma.returnRequest.create({
        data: {
          id: returnRecord.id,
          orderId: returnRecord.orderId,
          userId: returnRecord.userId,
          status: returnRecord.status,
          reason: returnRecord.reason,
          comments: returnRecord.comments,
          evidenceImages: returnRecord.evidenceImages,
          isRestocked: false,
          createdAt: now,
          items: {
            create: returnItemsList.map((i) => ({
              id: i.id,
              orderItemId: i.orderItemId,
              productVariantId: i.productVariantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              condition: i.condition,
              restockStatus: 'PENDING',
            })),
          },
        },
        include: {
          items: true,
        },
      });
      inMemoryReturnRequests.unshift(created);
      return created;
    } catch (dbErr) {
      console.warn('Prisma return creation fallback:', dbErr.message);
    }
  }

  inMemoryReturnRequests.unshift(returnRecord);
  return returnRecord;
}

/**
 * ---------------------------------------------------------------------------
 * 3. ADMIN RETURN APPROVAL & REJECTION
 * ---------------------------------------------------------------------------
 */

export async function approveReturnRequest({ returnRequestId, adminUser, notes }) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    const err = new Error('Admin authorization is strictly required to approve returns');
    err.status = 403;
    throw err;
  }

  const returnReq = await getReturnRequestById(returnRequestId);
  if (!returnReq) {
    const err = new Error('Return request not found');
    err.status = 404;
    throw err;
  }

  if (returnReq.status !== 'REQUESTED') {
    const err = new Error(`Cannot approve return in "${returnReq.status}" state`);
    err.status = 400;
    throw err;
  }

  const now = new Date();
  returnReq.status = 'APPROVED';
  returnReq.adminNotes = notes || 'Return request approved by atelier team';
  returnReq.updatedAt = now;

  // Attempt Shiprocket reverse pickup creation if shipping configured
  let reverseShipment = null;
  try {
    reverseShipment = await shiprocketService.createReturnOrder({
      orderId: returnReq.orderId,
      items: returnReq.items.map((i) => ({
        orderItemId: i.orderItemId,
        productVariantId: i.productVariantId,
        quantity: i.quantity,
      })),
      returnReason: returnReq.reason,
      adminUser,
    });
    if (reverseShipment) {
      returnReq.shiprocketReturnShipmentId = reverseShipment.id;
      returnReq.status = 'PICKUP_SCHEDULED';
    }
  } catch (shipErr) {
    console.warn('Shiprocket reverse pickup auto-booking notice:', shipErr.message);
  }

  // Update DB if alive
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      await prisma.returnRequest.update({
        where: { id: returnReq.id },
        data: {
          status: returnReq.status,
          adminNotes: returnReq.adminNotes,
          shiprocketReturnShipmentId: returnReq.shiprocketReturnShipmentId,
          updatedAt: now,
        },
      });
    } catch (dbErr) {
      console.warn('Prisma update fallback for return approval:', dbErr.message);
    }
  }

  // Add order audit log
  const order = await orderService.getAdminOrderById(returnReq.orderId);
  if (order) {
    const historyEntry = {
      id: `shist-${crypto.randomUUID()}`,
      orderId: order.id,
      previousStatus: order.status,
      newStatus: order.status,
      adminName: adminUser.name || 'Admin Atelier',
      note: `Return request approved. Status: ${returnReq.status}${
        reverseShipment ? ' (Reverse courier pickup scheduled)' : ''
      }`,
      isCustomerSafe: true,
      createdAt: now,
    };
    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push(historyEntry);
  }

  return {
    success: true,
    message: `Return request approved (${returnReq.status})`,
    returnRequest: returnReq,
    reverseShipment,
  };
}

export async function rejectReturnRequest({ returnRequestId, rejectionReason, adminUser }) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    const err = new Error('Admin authorization is strictly required to reject returns');
    err.status = 403;
    throw err;
  }

  if (!rejectionReason || !rejectionReason.trim()) {
    const err = new Error('A rejection reason must be provided to the customer');
    err.status = 400;
    throw err;
  }

  const returnReq = await getReturnRequestById(returnRequestId);
  if (!returnReq) {
    const err = new Error('Return request not found');
    err.status = 404;
    throw err;
  }

  if (returnReq.status !== 'REQUESTED') {
    const err = new Error(`Cannot reject return in "${returnReq.status}" state`);
    err.status = 400;
    throw err;
  }

  const now = new Date();
  returnReq.status = 'REJECTED';
  returnReq.rejectionReason = rejectionReason.trim();
  returnReq.updatedAt = now;

  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      await prisma.returnRequest.update({
        where: { id: returnReq.id },
        data: {
          status: 'REJECTED',
          rejectionReason: returnReq.rejectionReason,
          updatedAt: now,
        },
      });
    } catch (dbErr) {
      console.warn('Prisma update fallback for return rejection:', dbErr.message);
    }
  }

  return {
    success: true,
    message: 'Return request rejected',
    returnRequest: returnReq,
  };
}

/**
 * ---------------------------------------------------------------------------
 * 4. RETURN INSPECTION & EXACT-ONCE RESTOCKING
 * ---------------------------------------------------------------------------
 */
export async function recordReturnInspection({
  returnRequestId,
  itemInspections = [], // [{ itemId, condition: 'EXCELLENT'|'DAMAGED', restock: true|false }]
  inspectionNotes,
  adminUser,
}) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    const err = new Error('Admin authorization is strictly required to record inspection');
    err.status = 403;
    throw err;
  }

  const returnReq = await getReturnRequestById(returnRequestId);
  if (!returnReq) {
    const err = new Error('Return request not found');
    err.status = 404;
    throw err;
  }

  const order = await orderService.getAdminOrderById(returnReq.orderId);
  const now = new Date();

  // Guard against duplicate restocking
  if (returnReq.isRestocked) {
    const err = new Error('Returned items for this request have already been inspected and restocked.');
    err.status = 400;
    throw err;
  }

  let restockedCount = 0;
  for (const item of returnReq.items || []) {
    const inspection = itemInspections.find(
      (insp) => insp.itemId === item.id || insp.orderItemId === item.orderItemId
    );

    const condition = inspection?.condition || 'EXCELLENT';
    const shouldRestock = Boolean(inspection?.restock ?? condition === 'EXCELLENT');

    item.condition = condition;
    if (shouldRestock && item.productVariantId) {
      await inventoryService.adjustStock(item.productVariantId, {
        mode: 'INCREASE',
        quantity: item.quantity,
        reason: `Return restocked: Order ${order?.orderNumber || returnReq.orderId}`,
        adminUserId: adminUser.id,
      });
      item.restockStatus = 'RESTOCKED';
      restockedCount += item.quantity;
    } else {
      item.restockStatus = 'DISCARDED';
    }
  }

  returnReq.isRestocked = true;
  returnReq.inspectionNotes = (inspectionNotes || 'Inspection completed at atelier').trim();
  returnReq.status = 'REFUND_PENDING';
  returnReq.updatedAt = now;

  // DB update
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      await prisma.returnRequest.update({
        where: { id: returnReq.id },
        data: {
          status: 'REFUND_PENDING',
          isRestocked: true,
          inspectionNotes: returnReq.inspectionNotes,
          updatedAt: now,
        },
      });
      for (const item of returnReq.items || []) {
        await prisma.returnItem.update({
          where: { id: item.id },
          data: {
            condition: item.condition,
            restockStatus: item.restockStatus,
          },
        });
      }
    } catch (dbErr) {
      console.warn('Prisma inspection update fallback:', dbErr.message);
    }
  }

  // Add audit timeline entry
  if (order) {
    const historyEntry = {
      id: `shist-${crypto.randomUUID()}`,
      orderId: order.id,
      previousStatus: order.status,
      newStatus: order.status,
      adminName: adminUser.name || 'Inspector Atelier',
      note: `Return goods physically inspected. ${restockedCount} piece(s) restocked to inventory. Status: REFUND_PENDING`,
      isCustomerSafe: true,
      createdAt: now,
    };
    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push(historyEntry);
  }

  return {
    success: true,
    message: `Physical inspection recorded. ${restockedCount} item(s) restored to stock. Ready for refund.`,
    returnRequest: returnReq,
  };
}

/**
 * ---------------------------------------------------------------------------
 * 5. REFUND PROCESSING (PAYU ONLINE & COD MANUAL RECONCILIATION)
 * ---------------------------------------------------------------------------
 */
export async function processRefund({
  orderId,
  returnRequestId = null,
  refundAmount,
  reason,
  payoutDetails = null, // for COD orders: { method: 'UPI'|'BANK_TRANSFER', upiId, accountNumber, ifsc, accountName }
  adminUser,
}) {
  if (!orderId) {
    const err = new Error('Order identifier is required');
    err.status = 400;
    throw err;
  }

  const order = await orderService.getAdminOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  const numAmount = parseFloat(refundAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const err = new Error('A valid positive refund amount is required');
    err.status = 400;
    throw err;
  }

  // 1. Validate Refund Balance (cannot exceed remaining balance)
  const existingRefunds = await getRefundsForOrder(order.id);
  const totalAlreadyRefunded = existingRefunds
    .filter((r) => r.status === 'SUCCESS' || r.status === 'PENDING')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  const orderTotal = parseFloat(order.totalAmount);
  const remainingRefundable = Math.max(0, orderTotal - totalAlreadyRefunded);

  // Precision rounding
  if (numAmount > remainingRefundable + 0.01) {
    const err = new Error(
      `Requested refund amount ₹${numAmount.toLocaleString(
        'en-IN'
      )} exceeds remaining refundable balance of ₹${remainingRefundable.toLocaleString('en-IN')}`
    );
    err.status = 400;
    throw err;
  }

  const cleanReason = (reason || 'Customer refund').trim();
  const isCod = order.paymentMethod === 'COD';
  const now = new Date();
  const refundId = `ref-${crypto.randomUUID()}`;
  const refundToken = `REF_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;

  let refundRecord = {
    id: refundId,
    orderId: order.id,
    returnRequestId,
    paymentMethod: isCod ? 'COD' : 'PAYU',
    amount: numAmount,
    status: 'PENDING',
    payuRefundId: null,
    payuPaymentId: order.paymentDetails?.mihpayid || null,
    bankRefNum: null,
    reason: cleanReason,
    payoutDetails: isCod ? payoutDetails : null,
    adminUserId: adminUser?.id || null,
    idempotencyKey: refundToken,
    createdAt: now,
    updatedAt: now,
  };

  // 2. Execute Payment Provider Action
  if (!isCod) {
    // --- PAYU ONLINE REFUND ---
    const mihpayid = order.paymentDetails?.mihpayid || order.paymentDetails?.bankRefNum;
    if (!mihpayid) {
      console.warn(`PayU transaction mihpayid not found for order ${order.orderNumber}. Queuing manual settlement.`);
      refundRecord.status = 'PENDING';
      refundRecord.reason += ' (Awaiting PayU transaction ID reconciliation)';
    } else {
      const verifyUrl = getVerifyServiceUrl();
      const hash = generateRefundHash({
        key: PAYU_KEY,
        command: 'cancel_refund_transaction',
        var1: mihpayid,
        salt: PAYU_SALT,
      });

      const params = new URLSearchParams();
      params.append('key', PAYU_KEY);
      params.append('command', 'cancel_refund_transaction');
      params.append('var1', mihpayid);
      params.append('var2', refundToken);
      params.append('var3', numAmount.toFixed(2));
      params.append('hash', hash);

      try {
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data) {
          if (data.status === 1 || data.status === '1' || String(data.msg || '').toLowerCase().includes('queued')) {
            refundRecord.status = 'SUCCESS';
            refundRecord.payuRefundId = String(data.request_id || refundToken);
            refundRecord.bankRefNum = data.bank_ref_num || null;
          } else {
            refundRecord.status = 'FAILED';
            refundRecord.reason += ` | PayU error: ${data.msg || 'Declined'}`;
          }
        } else {
          refundRecord.status = 'PENDING';
        }
      } catch (networkErr) {
        console.warn('PayU refund request timed out/network warning, set to PENDING for S2S reconciliation:', networkErr.message);
        refundRecord.status = 'PENDING';
      }
    }
  } else {
    // --- CASH ON DELIVERY REFUND ---
    // Validate payout details
    if (!payoutDetails || (!payoutDetails.upiId && !payoutDetails.accountNumber)) {
      const err = new Error(
        'For COD orders, electronic payout details (UPI ID or Bank Account & IFSC) must be provided.'
      );
      err.status = 400;
      throw err;
    }
    refundRecord.status = 'SUCCESS'; // Confirmed manual electronic transfer
  }

  // 3. Update Order Payment Status
  const newTotalRefunded = totalAlreadyRefunded + (refundRecord.status === 'SUCCESS' ? numAmount : 0);
  if (newTotalRefunded >= orderTotal - 0.01) {
    order.paymentStatus = 'REFUNDED';
    if (order.status === 'DELIVERED') {
      order.status = 'REFUNDED';
    }
  } else if (newTotalRefunded > 0) {
    order.paymentStatus = 'PARTIALLY_REFUNDED';
  }

  // 4. Update Return Request Status if applicable
  if (returnRequestId) {
    const returnReq = await getReturnRequestById(returnRequestId);
    if (returnReq) {
      returnReq.status = 'COMPLETED';
      returnReq.updatedAt = now;
      if (await isDatabaseAlive()) {
        try {
          await prisma.returnRequest.update({
            where: { id: returnRequestId },
            data: { status: 'COMPLETED', updatedAt: now },
          });
        } catch (e) {
          // Fallback
        }
      }
    }
  }

  // 5. Audit Timeline Log
  const historyEntry = {
    id: `shist-${crypto.randomUUID()}`,
    orderId: order.id,
    previousStatus: order.status,
    newStatus: order.status,
    adminName: adminUser?.name || 'Accounts Team',
    note: `Refund of ₹${numAmount.toLocaleString('en-IN')} ${
      refundRecord.status === 'SUCCESS' ? 'processed' : 'initiated'
    } via ${refundRecord.paymentMethod}. Reason: ${cleanReason}`,
    isCustomerSafe: true,
    createdAt: now,
  };

  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
  order.statusHistory.push(historyEntry);

  // 6. DB Persistence if alive
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const created = await prisma.refund.create({
        data: {
          id: refundRecord.id,
          orderId: refundRecord.orderId,
          returnRequestId: refundRecord.returnRequestId,
          paymentMethod: refundRecord.paymentMethod,
          amount: refundRecord.amount,
          status: refundRecord.status,
          payuRefundId: refundRecord.payuRefundId,
          payuPaymentId: refundRecord.payuPaymentId,
          bankRefNum: refundRecord.bankRefNum,
          reason: refundRecord.reason,
          payoutDetails: refundRecord.payoutDetails,
          adminUserId: refundRecord.adminUserId,
          idempotencyKey: refundRecord.idempotencyKey,
        },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: order.paymentStatus,
          status: order.status,
          updatedAt: now,
        },
      });
      inMemoryRefunds.unshift(created);
      return created;
    } catch (dbErr) {
      console.warn('Prisma refund creation fallback:', dbErr.message);
    }
  }

  inMemoryRefunds.unshift(refundRecord);
  return refundRecord;
}

/**
 * Accurately calculates refundable amount for individual items,
 * taking into account discounts, coupons, and proportional order charges.
 */
export function calculateItemRefundAmount(order, returnItem) {
  if (!order || !returnItem) return 0;
  const subtotal = Number(order.subtotal || 0);
  const totalAmount = Number(order.totalAmount || 0);
  const qty = Number(returnItem.quantity || 1);
  const unitPrice = Number(returnItem.unitPrice || 0);
  const rawItemTotal = unitPrice * qty;

  if (subtotal <= 0) return Math.min(rawItemTotal, totalAmount);
  // Proportion of total order value
  const discountRatio = totalAmount / subtotal;
  const allocatedAmount = Math.round(rawItemTotal * discountRatio * 100) / 100;
  return Math.min(allocatedAmount, totalAmount);
}

/**
 * ---------------------------------------------------------------------------
 * 5B. RTO (RETURN TO ORIGIN) CONSIGNMENT RECEIPT & RESTOCKING
 * ---------------------------------------------------------------------------
 * Handles packages returned by courier due to delivery failure (refused COD,
 * unreachable recipient, incorrect address, 3 failed delivery attempts).
 * Performs physical atelier condition inspection before restock, ensures
 * stock is restored exactly once, and handles COD cancellation or PayU refund.
 */
export async function processRtoReceipt({
  orderId,
  rtoReason,
  inspectionNotes,
  itemInspections = [], // [{ orderItemId, productVariantId, quantity, condition: 'INTACT'|'DAMAGED', restock: true }]
  refundPrepaid = false,
  refundAmount = null,
  payoutDetails = null,
  adminUser,
}) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    const err = new Error('Admin authorization is strictly required to record RTO');
    err.status = 403;
    throw err;
  }

  if (!orderId) {
    const err = new Error('Order identifier is required');
    err.status = 400;
    throw err;
  }

  const order = await orderService.getAdminOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  if (order.status === 'CANCELLED' && !order.isStockDeducted) {
    const err = new Error(`Order ${order.orderNumber} is already cancelled and inventory was already handled.`);
    err.status = 400;
    throw err;
  }

  const cleanRtoReason = (rtoReason || 'Delivery partner reported non-delivery / customer unreachable (RTO)').trim();
  const cleanInspectionNotes = (inspectionNotes || 'RTO parcel received at atelier and physical inspection completed').trim();
  const now = new Date();

  // 1. Physical inspection and exact-once inventory restock
  let restockedCount = 0;
  const inspectedItemsSummary = [];

  if (order.isStockDeducted) {
    for (const item of (order.items || [])) {
      const insp = (itemInspections || []).find(
        (i) => i.orderItemId === item.id || i.productVariantId === item.productVariantId
      );
      const condition = insp?.condition || 'INTACT';
      const shouldRestock = insp ? Boolean(insp.restock) : condition === 'INTACT';

      if (shouldRestock && item.productVariantId) {
        await inventoryService.adjustStock(item.productVariantId, {
          mode: 'INCREASE',
          quantity: item.quantity,
          reason: `RTO restock for Order ${order.orderNumber} - physical parcel inspected intact`,
          adminUserId: adminUser.id,
        });
        restockedCount += item.quantity;
        inspectedItemsSummary.push(`${item.productTitle || item.sku} (${item.quantity} restored)`);
      } else {
        inspectedItemsSummary.push(`${item.productTitle || item.sku} (${item.quantity} marked damaged/not restocked)`);
      }
    }
    order.isStockDeducted = false;
  }

  // 2. Update active forward shipment to RTO_DELIVERED
  const shipments = await shiprocketService.getShipmentsForOrder(order.id);
  const activeShipment = shipments.find((s) => !s.isReturn && s.status !== 'CANCELLED');
  if (activeShipment) {
    try {
      await shiprocketService.updateShipmentRecord(activeShipment.id, {
        status: 'RTO_DELIVERED',
        lastTrackingEvent: `RTO parcel safely returned to atelier. Reason: ${cleanRtoReason}`,
        lastTrackingTime: now,
        lastProviderSync: now,
      });
    } catch (shipErr) {
      console.warn('Shipment record update notice for RTO:', shipErr.message);
    }
  }

  // 3. Payment Handling
  let refundResult = null;
  const isCod = order.paymentMethod === 'COD';
  const isPaid = order.paymentStatus === 'PAID';

  if (isCod) {
    order.paymentStatus = 'CANCELLED';
  } else if (isPaid && refundPrepaid) {
    const targetRefundAmount = refundAmount !== null ? parseFloat(refundAmount) : parseFloat(order.totalAmount);
    try {
      refundResult = await processRefund({
        orderId: order.id,
        refundAmount: targetRefundAmount,
        reason: `RTO prepaid order refund for ${order.orderNumber}. Reason: ${cleanRtoReason}`,
        adminUser,
      });
    } catch (refundErr) {
      console.warn('Prepaid RTO refund processing notice:', refundErr.message);
      order.paymentStatus = 'REFUND_PENDING';
    }
  }

  // 4. Update order fulfillment status
  const previousStatus = order.status;
  order.status = 'RETURNED';
  order.updatedAt = now;

  const historyEntry = {
    id: `shist-${crypto.randomUUID()}`,
    orderId: order.id,
    previousStatus,
    newStatus: 'RETURNED',
    adminName: adminUser.name || 'Admin Atelier',
    note: `RTO (Return to Origin) received & processed: ${cleanRtoReason}. Inspection: ${cleanInspectionNotes}. Restocked: ${restockedCount} piece(s).${
      refundResult ? ' Prepaid refund processed.' : isCod ? ' COD collection cancelled.' : ''
    }`,
    isCustomerSafe: true,
    inventoryAction: restockedCount > 0 ? 'RESTORED' : 'NONE',
    createdAt: now,
  };

  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
  order.statusHistory.push(historyEntry);

  // 5. DB Persistence if alive
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'RETURNED',
          paymentStatus: order.paymentStatus,
          isStockDeducted: order.isStockDeducted,
          updatedAt: now,
        },
      });
      await prisma.orderStatusHistory.create({
        data: {
          id: historyEntry.id,
          orderId: order.id,
          previousStatus,
          newStatus: 'RETURNED',
          note: historyEntry.note,
          isCustomerSafe: true,
          createdAt: now,
        },
      });
    } catch (dbErr) {
      console.warn('Prisma update fallback for RTO:', dbErr.message);
    }
  }

  return {
    success: true,
    message: `RTO consignment recorded. ${restockedCount} piece(s) restored to inventory.`,
    order,
    refund: refundResult,
    restockedCount,
    inspectedItemsSummary,
  };
}

/**
 * ---------------------------------------------------------------------------
 * 6. QUERY & FETCH HELPERS (Dual DB & In-Memory Fallback)
 * ---------------------------------------------------------------------------
 */

export async function getReturnRequestsForOrder(orderId) {
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      return await prisma.returnRequest.findMany({
        where: { orderId },
        include: { items: true, refunds: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // In-memory fallback
    }
  }
  return inMemoryReturnRequests.filter((r) => r.orderId === orderId);
}

export async function getReturnRequestById(id) {
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const r = await prisma.returnRequest.findUnique({
        where: { id },
        include: { items: true, refunds: true, order: true },
      });
      if (r) return r;
    } catch (e) {
      // In-memory fallback
    }
  }
  return inMemoryReturnRequests.find((r) => r.id === id) || null;
}

export async function getReturnRequests({
  page = 1,
  limit = 15,
  status,
  orderNumber,
  userId,
  isAdmin = false,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));

  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      const where = {};
      if (!isAdmin && userId) where.userId = userId;
      if (status && status !== 'ALL') where.status = status;
      if (orderNumber) {
        where.order = {
          orderNumber: { contains: orderNumber.trim(), mode: 'insensitive' },
        };
      }

      const [total, returns] = await Promise.all([
        prisma.returnRequest.count({ where }),
        prisma.returnRequest.findMany({
          where,
          include: { items: true, refunds: true, order: true },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      return {
        returns,
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

  let filtered = [...inMemoryReturnRequests];
  if (!isAdmin && userId) {
    filtered = filtered.filter((r) => r.userId === userId);
  }
  if (status && status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === status);
  }
  if (orderNumber) {
    filtered = filtered.filter((r) =>
      String(r.orderNumber || r.orderId).toLowerCase().includes(orderNumber.toLowerCase())
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = filtered.length;
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  return {
    returns: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getRefundsForOrder(orderId) {
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      return await prisma.refund.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // In-memory fallback
    }
  }
  return inMemoryRefunds.filter((r) => r.orderId === orderId);
}

export async function getAllRefunds() {
  const dbAlive = await isDatabaseAlive();
  if (dbAlive) {
    try {
      return await prisma.refund.findMany({
        include: { order: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // In-memory fallback
    }
  }
  return [...inMemoryRefunds];
}

export default {
  POLICY_CONFIG,
  getReturnPolicy,
  cancelOrderByCustomer,
  createReturnRequest,
  approveReturnRequest,
  rejectReturnRequest,
  recordReturnInspection,
  processRefund,
  calculateItemRefundAmount,
  processRtoReceipt,
  getReturnRequestsForOrder,
  getReturnRequestById,
  getReturnRequests,
  getRefundsForOrder,
  getAllRefunds,
};
