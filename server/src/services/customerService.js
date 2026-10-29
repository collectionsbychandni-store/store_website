import prisma from '../config/db.js';
import * as authService from './authService.js';
import * as addressService from './addressService.js';
import * as orderService from './orderService.js';

let lastDbCheckTime = 0;
let lastDbAliveStatus = false;

async function isDatabaseAlive() {
  const now = Date.now();
  if (now - lastDbCheckTime < 10000) {
    return lastDbAliveStatus;
  }
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 500)
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

// -----------------------------------------------------------------------------
// Live Customer Directory (Dev & Fallback)
// -----------------------------------------------------------------------------
const INITIAL_DEMO_CUSTOMERS = [];

let inMemoryCustomers = [];

export function _refreshInMemoryCustomers() {
  try {
    const authUsers = authService._getInMemoryUsers();
    inMemoryCustomers = authUsers.filter((u) => u.role === 'CUSTOMER');
  } catch (e) {
    inMemoryCustomers = [];
  }
}
_refreshInMemoryCustomers();

// Empty initial addresses and orders for clean production launch
const DEMO_EXTRA_ADDRESSES = [];
const DEMO_EXTRA_ORDERS = [];

// Helper to calculate customer order spending based on defined rules:
// Successful spending excludes CANCELLED, RETURNED, and REFUNDED orders.
export function calculateCustomerSpending(orders = []) {
  const nonFailedOrders = orders.filter(
    (o) => !['CANCELLED', 'RETURNED', 'REFUNDED'].includes(o.status)
  );

  const completedOrders = orders.filter((o) =>
    ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status)
  );

  const totalSpent = nonFailedOrders.reduce((sum, o) => {
    return sum + Number(o.totalAmount || 0);
  }, 0);

  return {
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    totalSpent: Math.round(totalSpent * 100) / 100,
    spendingFormatted: `₹${Math.round(totalSpent).toLocaleString('en-IN')}`,
  };
}

/**
 * Retrieves paginated customers with search, filtering, and order aggregates
 * Strictly excludes ADMIN accounts.
 */
export async function getCustomers({
  search = '',
  status = 'ALL',
  startDate,
  endDate,
  page = 1,
  limit = 10,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const validSortBy = ['createdAt', 'name', 'orderCount', 'totalSpent'].includes(sortBy)
    ? sortBy
    : 'createdAt';
  const validSortOrder = sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    try {
      const where = {
        role: 'CUSTOMER', // Strictly exclude admin users
      };

      // Filter by Active / Inactive status
      if (status === 'ACTIVE') {
        where.isActive = true;
      } else if (status === 'INACTIVE') {
        where.isActive = false;
      }

      // Search by name, email, or phone
      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim();
        where.OR = [
          { name: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s, mode: 'insensitive' } },
        ];
      }

      // Registration date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) where.createdAt.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setUTCHours(23, 59, 59, 999);
            where.createdAt.lte = end;
          }
        }
      }

      const [total, rawCustomers] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            orders: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                createdAt: true,
              },
            },
          },
          orderBy:
            validSortBy === 'orderCount' || validSortBy === 'totalSpent'
              ? [{ createdAt: 'desc' }]
              : [{ [validSortBy]: validSortOrder }],
        }),
      ]);

      // Format and calculate spending & order metrics
      let formatted = rawCustomers.map((c) => {
        const metrics = calculateCustomerSpending(c.orders || []);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || null,
          role: c.role,
          isActive: Boolean(c.isActive),
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          orderCount: metrics.totalOrders,
          completedOrders: metrics.completedOrders,
          totalSpent: metrics.totalSpent,
          spendingFormatted: metrics.spendingFormatted,
        };
      });

      // Custom sorting if computed by orderCount or totalSpent
      if (validSortBy === 'orderCount') {
        formatted.sort((a, b) =>
          validSortOrder === 'asc' ? a.orderCount - b.orderCount : b.orderCount - a.orderCount
        );
      } else if (validSortBy === 'totalSpent') {
        formatted.sort((a, b) =>
          validSortOrder === 'asc' ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent
        );
      }

      const paginatedData = formatted.slice(skip, skip + limitNum);

      return {
        data: paginatedData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 0,
        },
      };
    } catch (dbErr) {
      console.warn('Customer directory DB query warning (falling back to in-memory):', dbErr.message);
    }
  }

  // In-Memory Fallback
  let customers = [...inMemoryCustomers];

  // Exclude admins strictly
  customers = customers.filter((c) => c.role === 'CUSTOMER');

  // Status filter
  if (status === 'ACTIVE') {
    customers = customers.filter((c) => c.isActive === true);
  } else if (status === 'INACTIVE') {
    customers = customers.filter((c) => c.isActive === false);
  }

  // Search filter
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        (c.phone && c.phone.toLowerCase().includes(s))
    );
  }

  // Date range filter
  if (startDate) {
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) {
      customers = customers.filter((c) => new Date(c.createdAt) >= s);
    }
  }
  if (endDate) {
    const e = new Date(endDate);
    if (!isNaN(e.getTime())) {
      e.setUTCHours(23, 59, 59, 999);
      customers = customers.filter((c) => new Date(c.createdAt) <= e);
    }
  }

  // Get orders to compute customer stats
  let allOrders = [];
  try {
    const memOrders = orderService._getInMemoryOrders ? orderService._getInMemoryOrders() : [];
    allOrders = [...memOrders, ...DEMO_EXTRA_ORDERS];
  } catch (e) {
    allOrders = [...DEMO_EXTRA_ORDERS];
  }

  let formatted = customers.map((c) => {
    const customerOrders = allOrders.filter((o) => o.userId === c.id);
    const metrics = calculateCustomerSpending(customerOrders);

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || null,
      role: c.role,
      isActive: Boolean(c.isActive),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      orderCount: metrics.totalOrders,
      completedOrders: metrics.completedOrders,
      totalSpent: metrics.totalSpent,
      spendingFormatted: metrics.spendingFormatted,
    };
  });

  // Sorting
  formatted.sort((a, b) => {
    let valA = a[validSortBy];
    let valB = b[validSortBy];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return validSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return validSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = formatted.length;
  const paginatedData = formatted.slice(skip, skip + limitNum);

  return {
    data: paginatedData,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 0,
    },
  };
}

/**
 * Retrieves store customer KPI summary metrics
 * Strictly excludes admin accounts.
 */
export async function getCustomerStats() {
  const dbConnected = await isDatabaseAlive();
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  if (dbConnected) {
    try {
      const [totalCustomers, activeCustomers, inactiveCustomers, newThisMonth] = await Promise.all([
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({ where: { role: 'CUSTOMER', isActive: true } }),
        prisma.user.count({ where: { role: 'CUSTOMER', isActive: false } }),
        prisma.user.count({
          where: {
            role: 'CUSTOMER',
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

      return {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        newThisMonth,
      };
    } catch (e) {
      console.warn('Customer stats DB query warning (falling back to in-memory):', e.message);
    }
  }

  // In-memory stats
  const customers = inMemoryCustomers.filter((c) => c.role === 'CUSTOMER');
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.isActive === true).length;
  const inactiveCustomers = customers.filter((c) => c.isActive === false).length;
  const newThisMonth = customers.filter(
    (c) => new Date(c.createdAt) >= startOfMonth
  ).length;

  return {
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    newThisMonth,
  };
}

/**
 * Retrieves detailed customer profile including saved addresses and order history
 */
export async function getCustomerById(id) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Customer ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          },
          orders: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              subtotal: true,
              shippingAmount: true,
              discountAmount: true,
              totalAmount: true,
              createdAt: true,
              _count: {
                select: { items: true },
              },
            },
          },
        },
      });

      if (!user) {
        const err = new Error('Customer not found');
        err.status = 404;
        throw err;
      }

      if (user.role === 'ADMIN') {
        const err = new Error('Admin profiles cannot be viewed in the customer directory');
        err.status = 403;
        throw err;
      }

      const spending = calculateCustomerSpending(user.orders || []);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        isActive: Boolean(user.isActive),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        addresses: (user.addresses || []).map((a) => ({
          id: a.id,
          name: a.name,
          phone: a.phone,
          addressLine1: a.addressLine1,
          addressLine2: a.addressLine2 || '',
          landmark: a.landmark || '',
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          country: a.country || 'India',
          addressType: a.addressType || 'HOME',
          isDefault: Boolean(a.isDefault),
        })),
        orders: (user.orders || []).map((o) => {
          const inferredPaymentStatus =
            o.paymentStatus ||
            (['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status)
              ? 'PAID'
              : ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(o.status)
              ? 'REFUNDED'
              : 'AWAITING_PAYMENT');
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            paymentStatus: inferredPaymentStatus,
            subtotal: Number(o.subtotal || o.totalAmount),
            shippingAmount: Number(o.shippingAmount || 0),
            discountAmount: Number(o.discountAmount || 0),
            totalAmount: Number(o.totalAmount),
            itemsCount: o._count?.items || 0,
            createdAt: o.createdAt,
          };
        }),
        summary: spending,
      };
    } catch (dbErr) {
      if (dbErr.status === 404 || dbErr.status === 403) throw dbErr;
      console.warn('Customer by ID DB query warning (falling back to in-memory):', dbErr.message);
    }
  }

  // In-Memory Fallback
  let user = inMemoryCustomers.find((c) => c.id === id);
  if (!user) {
    try {
      const authUsers = authService._getInMemoryUsers ? authService._getInMemoryUsers() : [];
      const maybeUser = authUsers.find((u) => u.id === id);
      if (maybeUser && maybeUser.role === 'ADMIN') {
        const err = new Error('Admin profiles cannot be viewed in the customer directory');
        err.status = 403;
        throw err;
      }
    } catch (e) {
      if (e.status === 403) throw e;
    }
  }

  if (!user) {
    const err = new Error('Customer not found');
    err.status = 404;
    throw err;
  }

  if (user.role === 'ADMIN') {
    const err = new Error('Admin profiles cannot be viewed in the customer directory');
    err.status = 403;
    throw err;
  }

  // Fetch addresses
  let allAddresses = [];
  try {
    const memAddrs = addressService._getInMemoryAddresses ? addressService._getInMemoryAddresses() : [];
    allAddresses = [...memAddrs, ...DEMO_EXTRA_ADDRESSES];
  } catch (e) {
    allAddresses = [...DEMO_EXTRA_ADDRESSES];
  }
  const userAddresses = allAddresses.filter((a) => a.userId === id);

  // Fetch orders
  let allOrders = [];
  try {
    const memOrders = orderService._getInMemoryOrders ? orderService._getInMemoryOrders() : [];
    allOrders = [...memOrders, ...DEMO_EXTRA_ORDERS];
  } catch (e) {
    allOrders = [...DEMO_EXTRA_ORDERS];
  }
  const userOrders = allOrders.filter((o) => o.userId === id);
  userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const spending = calculateCustomerSpending(userOrders);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    addresses: userAddresses,
    orders: userOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      subtotal: Number(o.subtotal || o.totalAmount),
      shippingAmount: Number(o.shippingAmount || 0),
      discountAmount: Number(o.discountAmount || 0),
      totalAmount: Number(o.totalAmount),
      itemsCount: o.items?.length || 1,
      createdAt: o.createdAt,
    })),
    summary: spending,
  };
}

/**
 * Updates customer account active status
 * Security enforcement:
 * - Prevents modifying admin accounts through customer-management actions.
 * - Deactivating prevents subsequent login and session authentication.
 */
export async function updateCustomerStatus(id, isActive) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Customer ID is required');
    err.status = 400;
    throw err;
  }

  if (typeof isActive !== 'boolean') {
    const err = new Error('isActive must be a boolean');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      const err = new Error('Customer not found');
      err.status = 404;
      throw err;
    }

    // Security requirement: Prevent modifying admin accounts through customer-management actions
    if (targetUser.role === 'ADMIN') {
      const err = new Error('Admin accounts cannot be modified through customer management actions');
      err.status = 403;
      throw err;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  // In-Memory Fallback
  let user = inMemoryCustomers.find((c) => c.id === id);
  if (!user) {
    try {
      const authUsers = authService._getInMemoryUsers ? authService._getInMemoryUsers() : [];
      const maybeUser = authUsers.find((u) => u.id === id);
      if (maybeUser && maybeUser.role === 'ADMIN') {
        const err = new Error('Admin accounts cannot be modified through customer management actions');
        err.status = 403;
        throw err;
      }
    } catch (e) {
      if (e.status === 403) throw e;
    }
  }

  if (!user) {
    const err = new Error('Customer not found');
    err.status = 404;
    throw err;
  }

  if (user.role === 'ADMIN') {
    const err = new Error('Admin accounts cannot be modified through customer management actions');
    err.status = 403;
    throw err;
  }

  user.isActive = isActive;
  user.updatedAt = new Date();

  // Also update in authService._getInMemoryUsers()
  try {
    const authUsers = authService._getInMemoryUsers();
    const authUser = authUsers.find((u) => u.id === id);
    if (authUser) {
      authUser.isActive = isActive;
      authUser.updatedAt = new Date();
    }
  } catch (e) {
    // Ignore error
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default {
  calculateCustomerSpending,
  getCustomers,
  getCustomerStats,
  getCustomerById,
  updateCustomerStatus,
};
