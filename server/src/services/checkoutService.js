import crypto from 'crypto';
import prisma from '../config/db.js';
import * as cartService from './cartService.js';
import * as addressService from './addressService.js';
import * as variantService from './variantService.js';
import * as productService from './productService.js';
import * as orderService from './orderService.js';
import * as authService from './authService.js';
import * as inventoryService from './inventoryService.js';
import * as paymentService from './paymentService.js';

/**
 * Collections by Chandni - Checkout & Order Preparation Service
 *
 * Implements Step 14:
 * - Server-authoritative checkout validation
 * - Dynamic price-change and inventory shortage warnings
 * - Delivery address snapshot immutability
 * - Idempotency protection against duplicate submissions
 * - Transactional order preparation with pending payment status
 */

const inMemoryOrders = [];

export function _getInMemoryOrders() {
  return inMemoryOrders;
}

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
 * Authoritatively validates customer cart and shipping address for checkout
 */
export async function validateCheckout({ userId, guestId, addressId, inlineAddress }) {
  if (!userId) {
    const err = new Error('Authentication required for checkout');
    err.status = 401;
    throw err;
  }

  // 1. Retrieve authoritative cart (merges guest cart into user cart if guestId provided)
  const cart = await cartService.getCart({ userId, guestId });

  if (!cart || !cart.items || cart.items.length === 0) {
    return {
      isValid: false,
      canProceed: false,
      errors: ['Your shopping bag is empty. Please add items to proceed.'],
      warnings: [],
      cart: {
        items: [],
        subtotal: 0,
        shippingAmount: 0,
        shippingLabel: 'Complimentary Artisan Delivery',
        totalAmount: 0,
        totalItems: 0,
      },
      selectedAddress: null,
    };
  }

  const errors = [];
  const warnings = [];
  let calculatedSubtotal = 0;
  let totalQuantity = 0;
  const verifiedItems = [];

  // 2. Validate every cart item authoritatively against DB / master records
  for (const item of cart.items) {
    const variant = await variantService.getVariantById(item.productVariantId);
    if (!variant || variant.isActive === false) {
      errors.push(`"${item.productTitle}" (${item.size} / ${item.color}) is no longer available.`);
      continue;
    }

    const product = await productService.getProductById(variant.productId, true);
    if (!product || product.isActive === false) {
      errors.push(`"${product?.title || 'Selected product'}" is no longer active.`);
      continue;
    }

    if (variant.productId !== product.id) {
      errors.push(`Variant for "${product.title}" mismatch.`);
      continue;
    }

    const availableStock = Number(variant.stock) || 0;
    if (availableStock <= 0) {
      errors.push(`"${product.title}" (${variant.size} / ${variant.color}) is currently out of stock.`);
      continue;
    }

    const requestedQty = parseInt(item.quantity, 10);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      errors.push(`Invalid quantity for "${product.title}".`);
      continue;
    }

    if (requestedQty > availableStock) {
      errors.push(
        `Only ${availableStock} piece(s) available for "${product.title}" (${variant.size} / ${variant.color}). Requested: ${requestedQty}.`
      );
      continue;
    }

    const liveSellingPrice = Number(variant.sellingPrice);
    if (isNaN(liveSellingPrice) || liveSellingPrice <= 0) {
      errors.push(`Pricing unavailable for "${product.title}".`);
      continue;
    }

    // Check if price changed from customer's initial view
    const initialPrice =
      item.priceSnapshot !== undefined && item.priceSnapshot !== null
        ? Number(item.priceSnapshot)
        : item.originalPrice !== undefined && item.originalPrice !== null
        ? Number(item.originalPrice)
        : null;
    if (initialPrice !== null && initialPrice !== liveSellingPrice) {
      warnings.push(
        `Price for "${product.title}" updated from ₹${initialPrice.toLocaleString('en-IN')} to ₹${liveSellingPrice.toLocaleString('en-IN')}.`
      );
    }

    const lineTotal = requestedQty * liveSellingPrice;
    calculatedSubtotal += lineTotal;
    totalQuantity += requestedQty;

    const primaryImage =
      product.primaryImage?.imageUrl ||
      product.images?.find((img) => img.isPrimary)?.imageUrl ||
      product.images?.[0]?.imageUrl ||
      item.imageUrl ||
      null;

    verifiedItems.push({
      id: item.id,
      productVariantId: variant.id,
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      quantity: requestedQty,
      unitPrice: liveSellingPrice,
      mrp: Number(variant.mrp) || liveSellingPrice,
      lineTotal,
      imageUrl: primaryImage,
      stock: availableStock,
    });
  }

  // 3. Validate Delivery Address
  let selectedAddress = null;
  if (addressId) {
    selectedAddress = await addressService.getAddressById({ id: addressId, userId });
    if (!selectedAddress) {
      errors.push('Selected delivery address was not found or is unauthorized.');
    }
  } else if (inlineAddress) {
    try {
      addressService.validateAddressInput(inlineAddress);
      selectedAddress = {
        name: inlineAddress.name.trim(),
        phone: inlineAddress.phone.trim(),
        addressLine1: inlineAddress.addressLine1.trim(),
        addressLine2: inlineAddress.addressLine2 ? inlineAddress.addressLine2.trim() : null,
        landmark: inlineAddress.landmark ? inlineAddress.landmark.trim() : null,
        city: inlineAddress.city.trim(),
        state: inlineAddress.state.trim(),
        pincode: String(inlineAddress.pincode).trim(),
        country: inlineAddress.country ? inlineAddress.country.trim() : 'India',
        addressType: addressService.normalizeAddressType(inlineAddress.addressType),
      };
    } catch (e) {
      errors.push(`Invalid delivery address: ${e.message}`);
    }
  } else {
    // If neither is explicitly passed, try to fetch customer's default address
    const addresses = await addressService.getAddressesByUserId(userId);
    selectedAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;
  }

  // 4. Delivery pricing rule: Collections by Chandni provides complimentary shipping
  const shippingAmount = 0;
  const shippingLabel = 'Complimentary Pan-India Artisan Delivery';
  const totalAmount = calculatedSubtotal + shippingAmount;

  const canProceed = errors.length === 0 && verifiedItems.length > 0 && selectedAddress !== null;

  return {
    isValid: errors.length === 0,
    canProceed,
    errors,
    warnings,
    cart: {
      items: verifiedItems,
      subtotal: calculatedSubtotal,
      shippingAmount,
      shippingLabel,
      totalAmount,
      totalQuantity,
      totalItems: verifiedItems.length,
    },
    selectedAddress,
  };
}

/**
 * Prepares an Order safely with snapshot isolation and idempotency protection
 */
export async function prepareOrder({
  userId,
  addressId,
  inlineAddress,
  idempotencyKey,
  notes,
  paymentMethod = 'PAYU',
}) {
  if (!userId) {
    const err = new Error('Authentication required to place an order');
    err.status = 401;
    throw err;
  }

  // Validate Payment Method
  const normalizedPaymentMethod = String(paymentMethod || '').trim().toUpperCase();
  if (!['PAYU', 'COD'].includes(normalizedPaymentMethod)) {
    const err = new Error(
      'Please explicitly select a payment option: Online Payment (PayU Hosted Checkout) or Cash on Delivery (COD).'
    );
    err.status = 400;
    throw err;
  }

  // 1. Idempotency Check: Prevent duplicate submissions on rapid clicks
  if (idempotencyKey) {
    const existingOrder = inMemoryOrders.find(
      (o) => o.idempotencyKey === idempotencyKey && o.userId === userId
    );
    if (existingOrder) {
      let payuParams = null;
      if (existingOrder.paymentMethod === 'PAYU' && existingOrder.paymentStatus !== 'PAID') {
        const patron = await authService.getUserById(userId);
        payuParams = await paymentService.generatePayUPaymentData({
          order: existingOrder,
          customer: patron,
        });
      }
      return {
        isDuplicate: true,
        order: existingOrder,
        paymentMethod: existingOrder.paymentMethod,
        payuParams,
        message: 'Order was already submitted with this request key.',
      };
    }
  }

  // 2. Validate authoritative checkout state
  const validation = await validateCheckout({
    userId,
    addressId,
    inlineAddress,
  });

  if (!validation.canProceed) {
    const err = new Error(
      validation.errors.join(' ') || 'Checkout validation failed. Please check items and address.'
    );
    err.status = 400;
    err.details = validation.errors;
    err.warnings = validation.warnings;
    throw err;
  }

  const { cart, selectedAddress } = validation;

  // 3. Prepare Immutable Address Snapshot
  const addressSnapshot = {
    name: selectedAddress.name,
    phone: selectedAddress.phone,
    addressLine1: selectedAddress.addressLine1,
    addressLine2: selectedAddress.addressLine2 || null,
    landmark: selectedAddress.landmark || null,
    city: selectedAddress.city,
    state: selectedAddress.state,
    pincode: selectedAddress.pincode,
    country: selectedAddress.country || 'India',
    addressType: selectedAddress.addressType || 'HOME',
  };

  // 4. Generate Order Number & ID
  const orderId = `order-${crypto.randomUUID()}`;
  const timestampSuffix = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `CBC-${timestampSuffix}-${randomSuffix}`;
  const now = new Date();

  // 5. Prepare Order Item Snapshots
  const orderItems = cart.items.map((item) => ({
    id: `orditem-${crypto.randomUUID()}`,
    orderId,
    productVariantId: item.productVariantId,
    productId: item.productId,
    productTitle: item.productTitle,
    sku: item.sku,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.lineTotal,
    imageUrl: item.imageUrl,
  }));

  const isCod = normalizedPaymentMethod === 'COD';
  const initialStatus = isCod ? 'CONFIRMED' : 'PENDING';
  const initialNote = isCod
    ? `Order placed and confirmed with Cash on Delivery (COD). Total payable amount of ₹${Number(
        cart.totalAmount
      ).toLocaleString('en-IN')} to be collected upon courier arrival.`
    : `Order placed awaiting online payment confirmation via PayU Hosted Checkout.`;

  const initialHistory = [
    {
      id: `shist-${crypto.randomUUID()}`,
      orderId,
      previousStatus: null,
      newStatus: initialStatus,
      adminUserId: null,
      adminName: isCod ? 'COD Checkout' : 'PayU Checkout',
      note: initialNote,
      isCustomerSafe: true,
      createdAt: now,
    },
  ];

  // For COD, coordinate inventory deduction upon confirmation
  let isStockDeducted = false;
  if (isCod) {
    try {
      for (const item of orderItems) {
        if (!item.productVariantId) continue;
        await inventoryService.adjustStock(item.productVariantId, {
          mode: 'DECREASE',
          quantity: item.quantity,
          reason: `Order ${orderNumber} confirmed with Cash on Delivery (COD)`,
          adminUserId: null,
        });
      }
      isStockDeducted = true;
    } catch (stockErr) {
      const err = new Error(`Stock allocation failed for COD order: ${stockErr.message}`);
      err.status = 400;
      throw err;
    }
  }

  const newOrder = {
    id: orderId,
    orderNumber,
    userId,
    status: initialStatus,
    paymentStatus: 'AWAITING_PAYMENT',
    paymentMethod: normalizedPaymentMethod,
    shippingAddress: addressSnapshot,
    idempotencyKey: idempotencyKey || null,
    subtotal: cart.subtotal,
    shippingAmount: cart.shippingAmount,
    discountAmount: 0,
    totalAmount: cart.totalAmount,
    isStockDeducted,
    items: orderItems,
    statusHistory: initialHistory,
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
  };

  // 6. DB or in-memory transactional creation
  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            id: orderId,
            orderNumber,
            userId,
            status: initialStatus,
            paymentStatus: 'AWAITING_PAYMENT',
            shippingAddress: addressSnapshot,
            idempotencyKey: idempotencyKey || null,
            subtotal: cart.subtotal,
            shippingAmount: cart.shippingAmount,
            discountAmount: 0,
            totalAmount: cart.totalAmount,
            isStockDeducted,
            items: {
              create: orderItems.map((item) => ({
                id: item.id,
                productVariantId: item.productVariantId,
                productTitle: item.productTitle,
                sku: item.sku,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
            statusHistory: {
              create: {
                id: initialHistory[0].id,
                previousStatus: null,
                newStatus: initialStatus,
                adminUserId: null,
                note: initialNote,
                isCustomerSafe: true,
                createdAt: now,
              },
            },
          },
        });
      });
    } catch (dbErr) {
      console.warn('Prisma order save fallback to in-memory:', dbErr.message);
    }
  }

  inMemoryOrders.unshift(newOrder);
  orderService.addOrderToStore(newOrder);

  // 7. Clear cart only after successful order creation
  await cartService.clearCart({ userId });

  // 8. Generate PayU Hosted Checkout parameters if online payment
  let payuParams = null;
  if (normalizedPaymentMethod === 'PAYU') {
    const patron = await authService.getUserById(userId);
    payuParams = await paymentService.generatePayUPaymentData({
      order: newOrder,
      customer: patron,
    });
  }

  return {
    success: true,
    message: isCod
      ? 'Your order has been confirmed with Cash on Delivery.'
      : 'Order prepared successfully. Proceed to PayU Hosted Checkout.',
    order: newOrder,
    paymentMethod: normalizedPaymentMethod,
    payuParams,
  };
}

/**
 * Initiates or retrieves PayU Hosted Checkout parameters for an existing order
 */
export async function initiatePayUPaymentForOrder({ orderIdentifier, userId }) {
  if (!orderIdentifier || !userId) {
    const err = new Error('Order identifier and user authorization are required');
    err.status = 400;
    throw err;
  }

  const order = await getCustomerOrder({ orderIdentifier, userId });
  if (!order) {
    const err = new Error('Order not found or unauthorized');
    err.status = 404;
    throw err;
  }

  if (order.paymentStatus === 'PAID') {
    return {
      success: true,
      alreadyPaid: true,
      message: 'This order has already been paid for.',
      order,
    };
  }

  const patron = await authService.getUserById(userId);
  const payuParams = await paymentService.generatePayUPaymentData({
    order,
    customer: patron,
  });

  return {
    success: true,
    order,
    payuParams,
  };
}

/**
 * Retrieves a customer's specific order by order number or ID ensuring user ownership
 */
export async function getCustomerOrder({ orderIdentifier, userId }) {
  if (!orderIdentifier || !userId) return null;

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          userId,
          OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
        },
        include: {
          items: true,
        },
      });
      if (order) return order;
    } catch (e) {
      // In-memory fallback
    }
  }

    return (
      inMemoryOrders.find(
        (o) =>
          o.userId === userId &&
          (o.id === orderIdentifier || o.orderNumber === orderIdentifier)
      ) || null
    );
  }

  export default {
    validateCheckout,
    prepareOrder,
    initiatePayUPaymentForOrder,
    getCustomerOrder,
    _getInMemoryOrders,
  };
