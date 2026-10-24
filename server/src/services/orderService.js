import crypto from 'crypto';
import prisma from '../config/db.js';
import * as authService from './authService.js';
import * as inventoryService from './inventoryService.js';
import * as variantService from './variantService.js';

/**
 * Collections by Chandni - Order Service
 *
 * Implements Step 16:
 * - Order Fulfillment Workflow & State Machine
 * - Order Status History with Audit Trails
 * - Inventory Coordination (Atomic Stock Deductions & Release Protection)
 * - Customer Ownership Isolation & Sanitized Milestone Tracking
 * - Dual DB (Prisma) and In-Memory fallback support
 */

// Seeded in-memory store for orders
const inMemoryOrders = [
  {
    id: 'order-seed-1',
    orderNumber: 'CBC-782103-4921',
    userId: 'customer-demo-uuid-2',
    customer: {
      id: 'customer-demo-uuid-2',
      name: 'Demo Customer',
      email: 'customer@collectionsbychandni.in',
      phone: '+919812345678',
    },
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'ONLINE_PREPAID',
    subtotal: 4999,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 4999,
    isStockDeducted: true,
    shippingAddress: {
      name: 'Demo Customer',
      phone: '+919812345678',
      addressLine1: 'Flat 402, Royal Palms Residency',
      addressLine2: 'Koregaon Park South',
      landmark: 'Near Osho Garden',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      country: 'India',
      addressType: 'HOME',
    },
    items: [
      {
        id: 'orditem-seed-1',
        orderId: 'order-seed-1',
        productVariantId: 'demo-variant-saree-1',
        productId: 'demo-prod-saree-1',
        productTitle: 'Royal Silk Banarasi Saree',
        sku: 'CBC-RSB-NVY-OS',
        size: 'One Size',
        color: 'Navy Blue & Gold Zari',
        quantity: 1,
        unitPrice: 4999,
        totalPrice: 4999,
        imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      },
    ],
    statusHistory: [
      { status: 'PENDING', timestamp: new Date('2026-09-20T10:00:00Z'), note: 'Order registered in atelier', changedBy: 'System' },
      { status: 'CONFIRMED', timestamp: new Date('2026-09-20T11:30:00Z'), note: 'Artisan handloom inspection confirmed', changedBy: 'Admin' },
      { status: 'PACKED', timestamp: new Date('2026-09-21T14:00:00Z'), note: 'Packed in bespoke heirloom box', changedBy: 'Admin' },
      { status: 'SHIPPED', timestamp: new Date('2026-09-22T09:00:00Z'), note: 'Dispatched via insured courier', changedBy: 'Admin' },
      { status: 'DELIVERED', timestamp: new Date('2026-09-24T16:45:00Z'), note: 'Delivered to patron residence', changedBy: 'Courier' },
    ],
    createdAt: new Date('2026-09-20T10:00:00Z'),
    updatedAt: new Date('2026-09-24T16:45:00Z'),
  },
  {
    id: 'order-seed-2',
    orderNumber: 'CBC-894105-3120',
    userId: 'customer-demo-uuid-2',
    customer: {
      id: 'customer-demo-uuid-2',
      name: 'Demo Customer',
      email: 'customer@collectionsbychandni.in',
      phone: '+919812345678',
    },
    status: 'CONFIRMED',
    paymentStatus: 'AWAITING_PAYMENT',
    paymentMethod: 'PENDING',
    subtotal: 3299,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 3299,
    isStockDeducted: true,
    shippingAddress: {
      name: 'Demo Customer',
      phone: '+919812345678',
      addressLine1: 'Flat 402, Royal Palms Residency',
      addressLine2: 'Koregaon Park South',
      landmark: 'Near Osho Garden',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      country: 'India',
      addressType: 'HOME',
    },
    items: [
      {
        id: 'orditem-seed-2',
        orderId: 'order-seed-2',
        productVariantId: 'var-5-1',
        productId: 'prod-5',
        productTitle: "Embroidered Women's Kurti",
        sku: 'CBC-EWK-CRM-S',
        size: 'S',
        color: 'Crimson Red',
        quantity: 1,
        unitPrice: 3299,
        totalPrice: 3299,
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      },
    ],
    statusHistory: [
      { status: 'PENDING', timestamp: new Date('2026-10-10T08:30:00Z'), note: 'Order registered via checkout', changedBy: 'System' },
      { status: 'CONFIRMED', timestamp: new Date('2026-10-10T09:15:00Z'), note: 'Confirmed for fulfillment', changedBy: 'Admin' },
    ],
    createdAt: new Date('2026-10-10T08:30:00Z'),
    updatedAt: new Date('2026-10-10T09:15:00Z'),
  },
  {
    id: 'order-seed-priya-1',
    orderNumber: 'CBC-910234-1182',
    userId: 'customer-seed-priya',
    customer: {
      id: 'customer-seed-priya',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+919820123456',
    },
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    subtotal: 3499,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 3499,
    isStockDeducted: true,
    items: [
      {
        id: 'item-p1',
        orderId: 'order-seed-priya-1',
        productVariantId: 'var-1-2',
        productId: 'prod-1',
        productTitle: "Women's Designer Kurti",
        sku: 'CBC-WDK-PNK-M',
        size: 'M',
        color: 'Blush Pink',
        quantity: 1,
        unitPrice: 2499,
        totalPrice: 2499,
      },
      {
        id: 'item-p2',
        orderId: 'order-seed-priya-1',
        productVariantId: 'var-2-1',
        productId: 'prod-2',
        productTitle: 'Pure Chanderi Zari Dupatta',
        sku: 'CBC-CZD-GLD-OS',
        size: 'One Size',
        color: 'Metallic Gold',
        quantity: 1,
        unitPrice: 1000,
        totalPrice: 1000,
      },
    ],
    statusHistory: [
      { status: 'DELIVERED', timestamp: new Date('2026-10-06T15:00:00Z'), note: 'Delivered' },
    ],
    createdAt: new Date('2026-10-03T11:00:00Z'),
    updatedAt: new Date('2026-10-06T15:00:00Z'),
  },
  {
    id: 'order-seed-ananya-1',
    orderNumber: 'CBC-940381-8821',
    userId: 'customer-seed-ananya',
    customer: {
      id: 'customer-seed-ananya',
      name: 'Ananya Desai',
      email: 'ananya.desai@example.com',
      phone: '+919876112233',
    },
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'NET_BANKING',
    subtotal: 5999,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 5999,
    isStockDeducted: true,
    items: [
      {
        id: 'item-a1',
        orderId: 'order-seed-ananya-1',
        productVariantId: 'var-3-2',
        productId: 'prod-3',
        productTitle: 'Festive Anarkali Gown',
        sku: 'CBC-FAG-MRN-M',
        size: 'M',
        color: 'Deep Maroon',
        quantity: 1,
        unitPrice: 5999,
        totalPrice: 5999,
      },
    ],
    statusHistory: [
      { status: 'CONFIRMED', timestamp: new Date('2026-10-06T12:00:00Z'), note: 'Confirmed' },
    ],
    createdAt: new Date('2026-10-06T11:30:00Z'),
    updatedAt: new Date('2026-10-06T12:00:00Z'),
  },
  {
    id: 'order-seed-meera-1',
    orderNumber: 'CBC-951820-4401',
    userId: 'customer-seed-meera',
    customer: {
      id: 'customer-seed-meera',
      name: 'Meera Iyer',
      email: 'meera.iyer@example.com',
      phone: '+919844556677',
    },
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    subtotal: 5498,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 5498,
    isStockDeducted: true,
    items: [
      {
        id: 'item-m1',
        orderId: 'order-seed-meera-1',
        productVariantId: 'var-4-1',
        productId: 'prod-4',
        productTitle: 'Kundan Polki Choker Set',
        sku: 'CBC-KPC-GLD-OS',
        size: 'One Size',
        color: 'Gold & Kundan',
        quantity: 1,
        unitPrice: 2999,
        totalPrice: 2999,
      },
      {
        id: 'item-m2',
        orderId: 'order-seed-meera-1',
        productVariantId: 'var-1-5',
        productId: 'prod-1',
        productTitle: "Women's Designer Kurti",
        sku: 'CBC-WDK-TEA-S',
        size: 'S',
        color: 'Royal Teal',
        quantity: 1,
        unitPrice: 2499,
        totalPrice: 2499,
      },
    ],
    statusHistory: [
      { status: 'SHIPPED', timestamp: new Date('2026-10-15T10:00:00Z'), note: 'Dispatched via premium express' },
    ],
    createdAt: new Date('2026-10-14T14:20:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
  },
  {
    id: 'order-seed-cancelled-1',
    orderNumber: 'CBC-962019-5512',
    userId: 'customer-seed-kavita',
    customer: {
      id: 'customer-seed-kavita',
      name: 'Kavita Patel',
      email: 'kavita.patel@example.com',
      phone: '+919811223344',
    },
    status: 'CANCELLED',
    paymentStatus: 'FAILED',
    paymentMethod: 'ONLINE_PREPAID',
    subtotal: 2499,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 2499,
    isStockDeducted: false,
    items: [
      {
        id: 'item-k1',
        orderId: 'order-seed-cancelled-1',
        productVariantId: 'var-1-1',
        productId: 'prod-1',
        productTitle: "Women's Designer Kurti",
        sku: 'CBC-WDK-PNK-S',
        size: 'S',
        color: 'Blush Pink',
        quantity: 1,
        unitPrice: 2499,
        totalPrice: 2499,
      },
    ],
    statusHistory: [
      { status: 'CANCELLED', timestamp: new Date('2026-10-16T16:30:00Z'), note: 'Payment gateway timeout cancelled' },
    ],
    createdAt: new Date('2026-10-16T16:00:00Z'),
    updatedAt: new Date('2026-10-16T16:30:00Z'),
  },
  {
    id: 'order-seed-recent-priya-2',
    orderNumber: 'CBC-970114-6623',
    userId: 'customer-seed-priya',
    customer: {
      id: 'customer-seed-priya',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+919820123456',
    },
    status: 'PACKED',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    subtotal: 3998,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 3998,
    isStockDeducted: true,
    items: [
      {
        id: 'item-p3',
        orderId: 'order-seed-recent-priya-2',
        productVariantId: 'var-2-1',
        productId: 'prod-2',
        productTitle: 'Pure Chanderi Zari Dupatta',
        sku: 'CBC-CZD-GLD-OS',
        size: 'One Size',
        color: 'Metallic Gold',
        quantity: 2,
        unitPrice: 1999,
        totalPrice: 3998,
      },
    ],
    statusHistory: [
      { status: 'PACKED', timestamp: new Date('2026-10-18T14:00:00Z'), note: 'Heirloom packaged' },
    ],
    createdAt: new Date('2026-10-18T10:15:00Z'),
    updatedAt: new Date('2026-10-18T14:00:00Z'),
  },
  {
    id: 'order-seed-today-1',
    orderNumber: 'CBC-981240-7734',
    userId: 'customer-demo-uuid-2',
    customer: {
      id: 'customer-demo-uuid-2',
      name: 'Demo Customer',
      email: 'customer@collectionsbychandni.in',
      phone: '+919812345678',
    },
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    paymentMethod: 'ONLINE_PREPAID',
    subtotal: 3299,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 3299,
    isStockDeducted: true,
    items: [
      {
        id: 'item-t1',
        orderId: 'order-seed-today-1',
        productVariantId: 'var-5-2',
        productId: 'prod-5',
        productTitle: "Embroidered Women's Kurti",
        sku: 'CBC-EWK-CRM-M',
        size: 'M',
        color: 'Crimson Red',
        quantity: 1,
        unitPrice: 3299,
        totalPrice: 3299,
      },
    ],
    statusHistory: [
      { status: 'PROCESSING', timestamp: new Date('2026-10-19T07:00:00Z'), note: 'Pattern cutting and finishing' },
    ],
    createdAt: new Date('2026-10-19T06:30:00Z'),
    updatedAt: new Date('2026-10-19T07:00:00Z'),
  },
  {
    id: 'order-seed-lastmonth-1',
    orderNumber: 'CBC-852109-2211',
    userId: 'customer-seed-ananya',
    customer: {
      id: 'customer-seed-ananya',
      name: 'Ananya Desai',
      email: 'ananya.desai@example.com',
      phone: '+919876112233',
    },
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'NET_BANKING',
    subtotal: 4999,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 4999,
    isStockDeducted: true,
    items: [
      {
        id: 'item-lm1',
        orderId: 'order-seed-lastmonth-1',
        productVariantId: 'demo-variant-saree-1',
        productId: 'demo-prod-saree-1',
        productTitle: 'Royal Silk Banarasi Saree',
        sku: 'CBC-RSB-NVY-OS',
        size: 'One Size',
        color: 'Navy Blue & Gold Zari',
        quantity: 1,
        unitPrice: 4999,
        totalPrice: 4999,
      },
    ],
    statusHistory: [
      { status: 'DELIVERED', timestamp: new Date('2026-09-15T16:00:00Z'), note: 'Delivered' },
    ],
    createdAt: new Date('2026-09-12T09:00:00Z'),
    updatedAt: new Date('2026-09-15T16:00:00Z'),
  },
  {
    id: 'order-seed-refunded-1',
    orderNumber: 'CBC-861042-3322',
    userId: 'customer-seed-kavita',
    customer: {
      id: 'customer-seed-kavita',
      name: 'Kavita Patel',
      email: 'kavita.patel@example.com',
      phone: '+919811223344',
    },
    status: 'REFUNDED',
    paymentStatus: 'REFUNDED',
    paymentMethod: 'ONLINE_PREPAID',
    subtotal: 2499,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 2499,
    isStockDeducted: true,
    items: [
      {
        id: 'item-rf1',
        orderId: 'order-seed-refunded-1',
        productVariantId: 'var-1-3',
        productId: 'prod-1',
        productTitle: "Women's Designer Kurti",
        sku: 'CBC-WDK-PNK-L',
        size: 'L',
        color: 'Blush Pink',
        quantity: 1,
        unitPrice: 2499,
        totalPrice: 2499,
      },
    ],
    statusHistory: [
      { status: 'REFUNDED', timestamp: new Date('2026-09-29T11:00:00Z'), note: 'Full payment refunded to original payment method' },
    ],
    createdAt: new Date('2026-09-28T15:00:00Z'),
    updatedAt: new Date('2026-09-29T11:00:00Z'),
  },
];

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
 * Valid state machine transitions for order fulfillment
 * Strict unidirectional progression with protected terminal states
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export const ALLOWED_PAYMENT_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'FAILED',
  'REFUNDED',
];

/**
 * Sanitizes an order object for customer visibility:
 * - Omit internal admin audit details and admin user IDs
 * - Filter status history to customer-safe entries only
 * - Sort history chronologically
 */
export function sanitizeOrderForCustomer(order) {
  if (!order) return null;

  const rawHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const customerSafeHistory = rawHistory
    .filter((h) => h.isCustomerSafe !== false)
    .map((h) => ({
      id: h.id,
      status: h.newStatus || h.status,
      previousStatus: h.previousStatus || null,
      note: h.isCustomerSafe ? (h.note || null) : null,
      timestamp: h.createdAt || h.timestamp,
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    ...order,
    statusHistory: customerSafeHistory,
  };
}

/**
 * Saves a newly created order into the orders store
 */
export function addOrderToStore(order) {
  if (!order || !order.id) return;
  const existingIdx = inMemoryOrders.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
  if (existingIdx !== -1) {
    inMemoryOrders[existingIdx] = order;
  } else {
    inMemoryOrders.unshift(order);
  }
}

/**
 * Customer: Get list of orders belonging ONLY to authenticated user
 */
export async function getCustomerOrders({ userId, page = 1, limit = 10, status }) {
  if (!userId) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const where = {
        userId,
        ...(status ? { status } : {}),
      };

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          include: {
            items: true,
            statusHistory: {
              where: { isCustomerSafe: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      return {
        orders: orders.map(sanitizeOrderForCustomer),
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

  // In-memory customer order filtering
  let filtered = inMemoryOrders.filter((o) => o.userId === userId);
  if (status) {
    filtered = filtered.filter((o) => o.status === status);
  }

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = filtered.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(startIndex, startIndex + limitNum).map(sanitizeOrderForCustomer);

  return {
    orders: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Customer: Get single order details with ownership verification
 */
export async function getCustomerOrderById({ orderIdentifier, userId }) {
  if (!orderIdentifier || !userId) {
    const err = new Error('Order identifier and user authentication required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          userId, // Strict ownership check!
          OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
        },
        include: {
          items: true,
          statusHistory: {
            where: { isCustomerSafe: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (order) return sanitizeOrderForCustomer(order);
    } catch (e) {
      // In-memory fallback
    }
  }

  // In-memory search with strict userId check
  const order = inMemoryOrders.find(
    (o) =>
      o.userId === userId &&
      (o.id === orderIdentifier || o.orderNumber === orderIdentifier)
  );

  return sanitizeOrderForCustomer(order);
}

/**
 * Admin: Search and filter all orders across the system
 */
export async function getAdminOrders({
  page = 1,
  limit = 15,
  search,
  status,
  paymentStatus,
  startDate,
  endDate,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const where = {};
      if (status) where.status = status;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          include: {
            items: true,
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      return {
        orders,
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

  // In-memory admin filtering
  let filtered = [...inMemoryOrders];

  if (status) {
    filtered = filtered.filter((o) => o.status === status);
  }

  if (paymentStatus) {
    filtered = filtered.filter((o) => o.paymentStatus === paymentStatus);
  }

  if (startDate) {
    const sDate = new Date(startDate).getTime();
    filtered = filtered.filter((o) => new Date(o.createdAt).getTime() >= sDate);
  }

  if (endDate) {
    const eDate = new Date(endDate).getTime();
    filtered = filtered.filter((o) => new Date(o.createdAt).getTime() <= eDate);
  }

  if (search) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((o) => {
      const matchOrderNum = o.orderNumber?.toLowerCase().includes(q);
      const matchCustomerName = o.customer?.name?.toLowerCase().includes(q) || o.shippingAddress?.name?.toLowerCase().includes(q);
      const matchEmail = o.customer?.email?.toLowerCase().includes(q);
      const matchPhone = o.customer?.phone?.includes(q) || o.shippingAddress?.phone?.includes(q);
      return matchOrderNum || matchCustomerName || matchEmail || matchPhone;
    });
  }

  // Attach customer details if missing
  for (const o of filtered) {
    if (!o.customer && o.userId) {
      const u = await authService.getUserById(o.userId);
      if (u) {
        o.customer = { id: u.id, name: u.name, email: u.email, phone: u.phone };
      }
    }
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = filtered.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(startIndex, startIndex + limitNum);

  return {
    orders: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Admin: Get complete order details by ID or orderNumber
 */
export async function getAdminOrderById(orderIdentifier) {
  if (!orderIdentifier) return null;

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
        },
        include: {
          items: true,
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          statusHistory: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (order) return order;
    } catch (e) {
      // In-memory fallback
    }
  }

  const order = inMemoryOrders.find(
    (o) => o.id === orderIdentifier || o.orderNumber === orderIdentifier
  );

  if (order && !order.customer && order.userId) {
    const u = await authService.getUserById(order.userId);
    if (u) {
      order.customer = { id: u.id, name: u.name, email: u.email, phone: u.phone };
    }
  }

  if (order && Array.isArray(order.statusHistory)) {
    order.statusHistory.sort(
      (a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp)
    );
  }

  return order || null;
}

/**
 * Admin: Update order fulfillment status with state machine enforcement and inventory coordination
 */
export async function updateOrderStatus({
  orderIdentifier,
  newStatus,
  note,
  isInternalNote = false,
  adminUser,
}) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    const err = new Error('Admin authorization is strictly required for order fulfillment updates');
    err.status = 403;
    throw err;
  }

  if (!orderIdentifier) {
    const err = new Error('Order identifier is required');
    err.status = 400;
    throw err;
  }

  if (!newStatus || typeof newStatus !== 'string') {
    const err = new Error('Target status is required');
    err.status = 400;
    throw err;
  }

  const targetStatus = newStatus.trim().toUpperCase();
  const validStatuses = Object.keys(ALLOWED_STATUS_TRANSITIONS);
  if (!validStatuses.includes(targetStatus)) {
    const err = new Error(
      `Invalid order status "${newStatus}". Allowed statuses: ${validStatuses.join(', ')}`
    );
    err.status = 400;
    throw err;
  }

  const order = await getAdminOrderById(orderIdentifier);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  const currentStatus = order.status;

  // Check if same status
  if (currentStatus === targetStatus) {
    return {
      success: true,
      message: `Order is already in status ${targetStatus}`,
      order,
    };
  }

  // Validate state machine transition
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    const err = new Error(
      `Illegal status transition: Cannot change status from "${currentStatus}" to "${targetStatus}". Permitted transitions from ${currentStatus}: ${
        allowedNext.length > 0 ? allowedNext.join(', ') : 'None (Terminal state)'
      }`
    );
    err.status = 400;
    throw err;
  }

  const now = new Date();
  let inventoryAction = 'NONE'; // 'DEDUCTED' | 'RESTORED' | 'NONE'

  // INVENTORY COORDINATION LOGIC:
  // 1. Moving to active fulfillment state (CONFIRMED, PROCESSING, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED)
  const isFulfillmentState = [
    'CONFIRMED',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ].includes(targetStatus);
  const shouldDeductStock = isFulfillmentState && !order.isStockDeducted;

  // 2. Moving to CANCELLED: restore stock ONLY if it was previously deducted
  const shouldRestoreStock = targetStatus === 'CANCELLED' && order.isStockDeducted === true;

  if (shouldDeductStock) {
    // PRE-CHECK: verify sufficient stock for EVERY item before making any modifications
    for (const item of order.items || []) {
      if (!item.productVariantId) continue;
      const variant = await variantService.getVariantById(item.productVariantId);
      const available = variant ? Number(variant.stock) : 0;
      if (available < item.quantity) {
        const err = new Error(
          `Insufficient stock to confirm order: "${item.productTitle}" (${item.size}/${item.color}) only has ${available} piece(s) in stock, but ${item.quantity} required.`
        );
        err.status = 400;
        throw err;
      }
    }

    // Now execute stock deduction
    for (const item of order.items || []) {
      if (!item.productVariantId) continue;
      await inventoryService.adjustStock(item.productVariantId, {
        mode: 'DECREASE',
        quantity: item.quantity,
        reason: `Order ${order.orderNumber} ${targetStatus} - stock allocated`,
        adminUserId: adminUser?.id || null,
      });
    }

    order.isStockDeducted = true;
    inventoryAction = 'DEDUCTED';
  } else if (shouldRestoreStock) {
    // Restore stock back to inventory
    for (const item of order.items || []) {
      if (!item.productVariantId) continue;
      await inventoryService.adjustStock(item.productVariantId, {
        mode: 'INCREASE',
        quantity: item.quantity,
        reason: `Order ${order.orderNumber} cancelled - stock restored`,
        adminUserId: adminUser?.id || null,
      });
    }

    order.isStockDeducted = false;
    inventoryAction = 'RESTORED';
  }

  // Create status history record
  const defaultReason = `Status transitioned from ${currentStatus} to ${targetStatus}${
    inventoryAction === 'DEDUCTED'
      ? ' (Stock allocated)'
      : inventoryAction === 'RESTORED'
      ? ' (Stock restored)'
      : ''
  }`;

  const historyEntry = {
    id: `shist-${crypto.randomUUID()}`,
    orderId: order.id,
    previousStatus: currentStatus,
    newStatus: targetStatus,
    adminUserId: adminUser?.id || null,
    adminName: adminUser?.name || 'Admin Atelier',
    note: note ? note.trim() : defaultReason,
    isCustomerSafe: !isInternalNote,
    inventoryAction,
    createdAt: now,
    timestamp: now,
  };

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const updated = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id: order.id },
          data: {
            status: targetStatus,
            isStockDeducted: order.isStockDeducted,
            updatedAt: now,
          },
          include: {
            items: true,
            user: true,
            statusHistory: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            id: historyEntry.id,
            orderId: order.id,
            previousStatus: currentStatus,
            newStatus: targetStatus,
            adminUserId: adminUser?.id || null,
            note: historyEntry.note,
            isCustomerSafe: historyEntry.isCustomerSafe,
            createdAt: now,
          },
        });

        return o;
      });

      return {
        success: true,
        message: `Order status updated to ${targetStatus}`,
        order: updated,
        inventoryAction,
      };
    } catch (e) {
      // In-memory fallback
    }
  }

  // In-memory update
  order.status = targetStatus;
  order.updatedAt = now;
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push(historyEntry);

  return {
    success: true,
    message: `Order status updated to ${targetStatus}`,
    order,
    inventoryAction,
  };
}

/**
 * Admin: Explicit manual audit payment status update
 */
export async function updateOrderPaymentStatus({ orderIdentifier, newPaymentStatus, note, adminUser }) {
  if (!orderIdentifier) {
    const err = new Error('Order identifier is required');
    err.status = 400;
    throw err;
  }

  if (!newPaymentStatus || typeof newPaymentStatus !== 'string') {
    const err = new Error('Payment status is required');
    err.status = 400;
    throw err;
  }

  const targetPaymentStatus = newPaymentStatus.trim().toUpperCase();
  if (!ALLOWED_PAYMENT_STATUSES.includes(targetPaymentStatus)) {
    const err = new Error(
      `Invalid payment status "${newPaymentStatus}". Allowed: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`
    );
    err.status = 400;
    throw err;
  }

  const order = await getAdminOrderById(orderIdentifier);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  const now = new Date();
  const historyEntry = {
    paymentStatus: targetPaymentStatus,
    timestamp: now,
    note: note ? note.trim() : `Payment status updated to ${targetPaymentStatus}`,
    changedBy: adminUser?.name || 'Admin Auditor',
  };

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: targetPaymentStatus,
          updatedAt: now,
        },
        include: { items: true, user: true },
      });
      return {
        success: true,
        message: `Payment status updated to ${targetPaymentStatus}`,
        order: updated,
      };
    } catch (e) {
      // In-memory fallback
    }
  }

  order.paymentStatus = targetPaymentStatus;
  order.updatedAt = now;
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push(historyEntry);

  return {
    success: true,
    message: `Payment status updated to ${targetPaymentStatus}`,
    order,
  };
}


export default {
  getCustomerOrders,
  getCustomerOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  updateOrderPaymentStatus,
  addOrderToStore,
  ALLOWED_STATUS_TRANSITIONS,
  ALLOWED_PAYMENT_STATUSES,
  _getInMemoryOrders,
};
