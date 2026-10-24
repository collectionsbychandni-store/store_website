import prisma from '../config/db.js';
import * as orderService from './orderService.js';
import * as customerService from './customerService.js';
import * as productService from './productService.js';
import * as categoryService from './categoryService.js';

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

/**
 * Collections by Chandni - Sales Reports & Business Analytics Service
 * Step 20: Sales Reports and Business Analytics
 *
 * Enforces:
 * - Timezone: Asia/Kolkata (IST = UTC + 5:30) for exact date-boundary resolution.
 * - Revenue Rules: Strict segregation of Paid Orders vs. Total Orders.
 * - Non-Revenue: Cancelled and Failed payment orders excluded from Gross Merchandise Sales.
 * - Historical Snapshot Pricing: Uses immutable OrderItem unitPrice & totalPrice.
 * - Formula-Injection Safe RFC 4180 CSV Exporting (CWE-1236 protection).
 */

// -----------------------------------------------------------------------------
// Timezone and Date Boundary Utilities (Asia/Kolkata: UTC+5:30)
// -----------------------------------------------------------------------------
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns current timestamp in Asia/Kolkata as a Date object
 */
export function getNowInIst() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET_MS);
}

/**
 * Formats a Date object to 'YYYY-MM-DD' in Asia/Kolkata
 */
export function formatIstDateKey(date) {
  if (!date) return '';
  const d = new Date(date);
  const istTime = new Date(d.getTime() + IST_OFFSET_MS);
  return istTime.toISOString().split('T')[0];
}

/**
 * Formats a Date object to readable short label in Asia/Kolkata (e.g. '19 Oct')
 */
export function formatIstDateLabel(dateKey) {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/**
 * Converts an IST 'YYYY-MM-DD' string to exact UTC Date boundaries
 * start = 00:00:00.000 IST -> UTC Date
 * end   = 23:59:59.999 IST -> UTC Date
 */
export function parseIstDateStringToUtc(dateStr, isEnd = false) {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Valid date string (YYYY-MM-DD) is required');
  }
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('Invalid date values provided in date string');
  }

  if (isEnd) {
    // 23:59:59.999 in IST = 18:29:59.999 UTC of the same calendar day
    return new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
  } else {
    // 00:00:00.000 in IST = 18:30:00.000 UTC of the previous calendar day
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
  }
}

/**
 * Resolves date boundaries for any reporting preset or custom range
 * Presets: 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom'
 */
export function resolveDateRange({ preset = '30d', startDate, endDate } = {}) {
  const nowIst = getNowInIst();
  const currentYear = nowIst.getUTCFullYear();
  const currentMonth = nowIst.getUTCMonth(); // 0-indexed
  const currentDay = nowIst.getUTCDate();

  let startUtc;
  let endUtc;
  let startStr;
  let endStr;

  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

  switch (preset) {
    case 'today': {
      startStr = todayStr;
      endStr = todayStr;
      startUtc = parseIstDateStringToUtc(todayStr, false);
      endUtc = parseIstDateStringToUtc(todayStr, true);
      break;
    }
    case '7d': {
      // 6 days before today in IST
      const past = new Date(nowIst);
      past.setUTCDate(past.getUTCDate() - 6);
      startStr = `${past.getUTCFullYear()}-${String(past.getUTCMonth() + 1).padStart(2, '0')}-${String(past.getUTCDate()).padStart(2, '0')}`;
      endStr = todayStr;
      startUtc = parseIstDateStringToUtc(startStr, false);
      endUtc = parseIstDateStringToUtc(endStr, true);
      break;
    }
    case 'this_month': {
      startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      endStr = todayStr;
      startUtc = parseIstDateStringToUtc(startStr, false);
      endUtc = parseIstDateStringToUtc(endStr, true);
      break;
    }
    case 'last_month': {
      // Previous month calculation in IST
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const lastMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      // Last day of previous month
      const daysInLastMonth = new Date(Date.UTC(lastMonthYear, lastMonthIdx + 1, 0)).getUTCDate();

      startStr = `${lastMonthYear}-${String(lastMonthIdx + 1).padStart(2, '0')}-01`;
      endStr = `${lastMonthYear}-${String(lastMonthIdx + 1).padStart(2, '0')}-${String(daysInLastMonth).padStart(2, '0')}`;
      startUtc = parseIstDateStringToUtc(startStr, false);
      endUtc = parseIstDateStringToUtc(endStr, true);
      break;
    }
    case 'custom': {
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate (YYYY-MM-DD) are required for custom date range');
      }
      startStr = startDate.trim();
      endStr = endDate.trim();
      startUtc = parseIstDateStringToUtc(startStr, false);
      endUtc = parseIstDateStringToUtc(endStr, true);
      if (startUtc > endUtc) {
        throw new Error('startDate cannot be after endDate');
      }
      break;
    }
    case '30d':
    default: {
      // 29 days before today in IST
      const past = new Date(nowIst);
      past.setUTCDate(past.getUTCDate() - 29);
      startStr = `${past.getUTCFullYear()}-${String(past.getUTCMonth() + 1).padStart(2, '0')}-${String(past.getUTCDate()).padStart(2, '0')}`;
      endStr = todayStr;
      startUtc = parseIstDateStringToUtc(startStr, false);
      endUtc = parseIstDateStringToUtc(endStr, true);
      break;
    }
  }

  const daysCount = Math.max(1, Math.round((endUtc.getTime() - startUtc.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    preset,
    startUtc,
    endUtc,
    startStr,
    endStr,
    daysCount,
    timezone: 'Asia/Kolkata',
  };
}

/**
 * Loads raw orders within date range from DB or in-memory fallback
 */
async function fetchOrdersInDateRange(startUtc, endUtc) {
  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    try {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startUtc,
            lte: endUtc,
          },
        },
        include: {
          items: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return orders;
    } catch (e) {
      console.warn('Prisma query failed, falling back to memory store:', e.message);
    }
  }

  // In-memory fallback
  const memOrders = orderService._getInMemoryOrders ? orderService._getInMemoryOrders() : [];
  return memOrders.filter((o) => {
    const created = new Date(o.createdAt);
    return created >= startUtc && created <= endUtc;
  });
}

/**
 * Business Rule Filter: Is order an eligible paid revenue order?
 * Strict check: Must have paymentStatus === 'PAID' AND status is neither CANCELLED nor FAILED.
 */
export function isEligiblePaidOrder(order) {
  if (!order) return false;
  const isPaid = order.paymentStatus === 'PAID';
  const isNotCancelledOrFailed = order.status !== 'CANCELLED' && order.status !== 'FAILED';
  return isPaid && isNotCancelledOrFailed;
}

/**
 * 1. Sales Summary Metrics
 * Calculates:
 * - Total orders placed
 * - Paid orders count
 * - Units sold (eligible paid orders)
 * - Gross merchandise sales (INR)
 * - Recorded refunds (INR)
 * - Net sales (Gross Sales - Refunds)
 * - Average order value (Gross Sales / Paid Orders)
 */
export async function getSalesSummary(params = {}) {
  const range = resolveDateRange(params);
  const orders = await fetchOrdersInDateRange(range.startUtc, range.endUtc);

  let totalOrdersCount = orders.length;
  let paidOrdersCount = 0;
  let unpaidOrdersCount = 0;
  let cancelledOrdersCount = 0;
  let refundedOrdersCount = 0;

  let totalUnitsSold = 0;
  let grossSales = 0;
  let totalRefundAmount = 0;

  for (const o of orders) {
    if (isEligiblePaidOrder(o)) {
      paidOrdersCount += 1;
      const orderSubtotal = Number(o.subtotal !== undefined ? o.subtotal : o.totalAmount);
      grossSales += orderSubtotal;

      const items = o.items || [];
      for (const item of items) {
        totalUnitsSold += Number(item.quantity || 1);
      }
    } else if (o.status === 'REFUNDED' || o.paymentStatus === 'REFUNDED') {
      refundedOrdersCount += 1;
      totalRefundAmount += Number(o.totalAmount || o.subtotal || 0);
    } else if (o.status === 'CANCELLED' || o.paymentStatus === 'FAILED') {
      cancelledOrdersCount += 1;
    } else {
      unpaidOrdersCount += 1;
    }
  }

  const netSales = Math.max(0, grossSales - totalRefundAmount);
  const averageOrderValue = paidOrdersCount > 0 ? Math.round(grossSales / paidOrdersCount) : 0;

  return {
    period: {
      preset: range.preset,
      startDate: range.startStr,
      endDate: range.endStr,
      timezone: range.timezone,
      daysCount: range.daysCount,
    },
    metrics: {
      totalOrders: totalOrdersCount,
      paidOrders: paidOrdersCount,
      unpaidOrders: unpaidOrdersCount,
      cancelledOrders: cancelledOrdersCount,
      refundedOrders: refundedOrdersCount,
      unitsSold: totalUnitsSold,
      grossSales: Math.round(grossSales),
      refundAmount: Math.round(totalRefundAmount),
      netSales: Math.round(netSales),
      averageOrderValue,
      grossSalesFormatted: `₹${Math.round(grossSales).toLocaleString('en-IN')}`,
      refundAmountFormatted: `₹${Math.round(totalRefundAmount).toLocaleString('en-IN')}`,
      netSalesFormatted: `₹${Math.round(netSales).toLocaleString('en-IN')}`,
      aovFormatted: `₹${averageOrderValue.toLocaleString('en-IN')}`,
    },
    rules: {
      grossSalesRule: 'Sum of item purchase amounts for paid orders with verified payment status. Excludes shipping and taxes.',
      paidOrderRule: 'Distinct orders with paymentStatus === PAID and order status neither CANCELLED nor FAILED.',
      refundRule: 'Sum of total order value for orders marked as REFUNDED. (Line-item partial refunds are not tracked in the current database schema).',
      netSalesRule: 'Gross Merchandise Sales minus Recorded Refunds.',
      aovRule: 'Gross Merchandise Sales divided by Paid Orders count.',
    },
  };
}

/**
 * 2. Sales Trends Over Time (Chart Visualization Data)
 * Returns daily buckets with revenue, orders, and units sold.
 * Missing dates inside the range are filled with 0.
 */
export async function getSalesTrends(params = {}) {
  const range = resolveDateRange(params);
  const orders = await fetchOrdersInDateRange(range.startUtc, range.endUtc);

  // Generate complete list of date keys for the range
  const dateBuckets = {};
  const current = new Date(range.startUtc.getTime() + IST_OFFSET_MS);
  const endLimit = new Date(range.endUtc.getTime() + IST_OFFSET_MS);

  while (current <= endLimit) {
    const key = current.toISOString().split('T')[0];
    dateBuckets[key] = {
      date: key,
      label: formatIstDateLabel(key),
      sales: 0,
      orders: 0,
      units: 0,
    };
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Aggregate eligible orders into date buckets
  for (const o of orders) {
    if (isEligiblePaidOrder(o)) {
      const dateKey = formatIstDateKey(o.createdAt);
      if (dateBuckets[dateKey]) {
        const orderSales = Number(o.subtotal !== undefined ? o.subtotal : o.totalAmount);
        dateBuckets[dateKey].sales += Math.round(orderSales);
        dateBuckets[dateKey].orders += 1;

        const items = o.items || [];
        for (const it of items) {
          dateBuckets[dateKey].units += Number(it.quantity || 1);
        }
      }
    }
  }

  const trends = Object.values(dateBuckets).sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: {
      preset: range.preset,
      startDate: range.startStr,
      endDate: range.endStr,
      timezone: range.timezone,
    },
    totalDataPoints: trends.length,
    trends,
  };
}

/**
 * 3. Best-Selling Products Performance Report
 * Uses immutable historical order-item prices and titles recorded at purchase.
 */
export async function getProductPerformance(params = {}) {
  const range = resolveDateRange(params);
  const orders = await fetchOrdersInDateRange(range.startUtc, range.endUtc);

  const productMap = {};

  for (const o of orders) {
    if (isEligiblePaidOrder(o)) {
      const items = o.items || [];
      for (const item of items) {
        const key = item.sku || item.productTitle || item.productVariantId || item.id;
        if (!productMap[key]) {
          productMap[key] = {
            sku: item.sku || 'N/A',
            productTitle: item.productTitle || 'Bespoke Item',
            size: item.size || 'Standard',
            color: item.color || '',
            unitsSold: 0,
            grossSales: 0,
            distinctOrders: new Set(),
            unitPrice: Number(item.unitPrice || 0),
          };
        }

        const qty = Number(item.quantity || 1);
        const itemTotal = Number(item.totalPrice !== undefined ? item.totalPrice : (item.unitPrice * qty));

        productMap[key].unitsSold += qty;
        productMap[key].grossSales += itemTotal;
        productMap[key].distinctOrders.add(o.id || o.orderNumber);
      }
    }
  }

  let products = Object.values(productMap).map((p) => ({
    sku: p.sku,
    productTitle: p.productTitle,
    size: p.size,
    color: p.color,
    unitsSold: p.unitsSold,
    grossSales: Math.round(p.grossSales),
    grossSalesFormatted: `₹${Math.round(p.grossSales).toLocaleString('en-IN')}`,
    ordersCount: p.distinctOrders.size,
    avgSellingPrice: p.unitsSold > 0 ? Math.round(p.grossSales / p.unitsSold) : 0,
  }));

  // Sort
  const sortBy = params.sortBy === 'grossSales' ? 'grossSales' : 'unitsSold';
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

  products.sort((a, b) => {
    return sortOrder === 'asc' ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
  });

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.max(1, parseInt(params.limit, 10) || 10);
  const total = products.length;
  const paginated = products.slice((page - 1) * limit, page * limit);

  return {
    period: {
      preset: range.preset,
      startDate: range.startStr,
      endDate: range.endStr,
      timezone: range.timezone,
    },
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
    notice: 'Product performance calculated exclusively from immutable historical order item prices and titles recorded at time of transaction.',
  };
}

/**
 * 4. Category Performance Report
 * Groups sales by current product catalog category hierarchy.
 */
export async function getCategoryPerformance(params = {}) {
  const range = resolveDateRange(params);
  const orders = await fetchOrdersInDateRange(range.startUtc, range.endUtc);

  // Load category map
  let categories = [];
  try {
    const catsRes = await categoryService.getCategories();
    categories = catsRes.data || [];
  } catch (e) {
    categories = [];
  }

  let products = [];
  try {
    const prodRes = await productService.getProducts({}, true);
    products = prodRes.data || [];
  } catch (e) {
    products = [];
  }

  // Create product-to-category lookup
  const prodCategoryMap = {};
  products.forEach((p) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    prodCategoryMap[p.id] = cat ? cat.name : 'Boutique Collection';
    prodCategoryMap[p.title] = cat ? cat.name : 'Boutique Collection';
  });

  const categorySalesMap = {};
  let overallGross = 0;

  for (const o of orders) {
    if (isEligiblePaidOrder(o)) {
      const items = o.items || [];
      for (const item of items) {
        let catName = prodCategoryMap[item.productId] || prodCategoryMap[item.productTitle] || 'Boutique Collection';

        // Direct keyword matching if category name not in product map
        if (catName === 'Boutique Collection') {
          const title = (item.productTitle || '').toLowerCase();
          if (title.includes('saree')) catName = 'Sarees';
          else if (title.includes('kurti')) catName = 'Kurtis';
          else if (title.includes('gown') || title.includes('dress')) catName = 'Dresses';
          else if (title.includes('choker') || title.includes('jewellery') || title.includes('polki')) catName = 'Jewellery';
          else if (title.includes('dupatta') || title.includes('stole')) catName = 'Accessories';
        }

        if (!categorySalesMap[catName]) {
          categorySalesMap[catName] = {
            categoryName: catName,
            unitsSold: 0,
            grossSales: 0,
            ordersCount: new Set(),
          };
        }

        const qty = Number(item.quantity || 1);
        const itemTotal = Number(item.totalPrice !== undefined ? item.totalPrice : (item.unitPrice * qty));

        categorySalesMap[catName].unitsSold += qty;
        categorySalesMap[catName].grossSales += itemTotal;
        categorySalesMap[catName].ordersCount.add(o.id || o.orderNumber);
        overallGross += itemTotal;
      }
    }
  }

  const categoryList = Object.values(categorySalesMap).map((c) => {
    const share = overallGross > 0 ? (c.grossSales / overallGross) * 100 : 0;
    return {
      categoryName: c.categoryName,
      unitsSold: c.unitsSold,
      grossSales: Math.round(c.grossSales),
      grossSalesFormatted: `₹${Math.round(c.grossSales).toLocaleString('en-IN')}`,
      shareOfSales: Math.round(share * 10) / 10,
      shareFormatted: `${(Math.round(share * 10) / 10).toFixed(1)}%`,
      ordersCount: c.ordersCount.size,
    };
  });

  categoryList.sort((a, b) => b.grossSales - a.grossSales);

  return {
    period: {
      preset: range.preset,
      startDate: range.startStr,
      endDate: range.endStr,
      timezone: range.timezone,
    },
    data: categoryList,
    totalGrossSales: Math.round(overallGross),
    notice: 'Category reporting connects line items to the current catalog taxonomy. (Historical category snapshots prior to taxonomy adjustments are not preserved).',
  };
}

/**
 * 5. Order and Payment Status Breakdown
 */
export async function getOrderBreakdown(params = {}) {
  const range = resolveDateRange(params);
  const orders = await fetchOrdersInDateRange(range.startUtc, range.endUtc);

  const statusMap = {};
  const paymentStatusMap = {};
  const paymentMethodMap = {};
  const totalOrders = orders.length;

  for (const o of orders) {
    const amount = Number(o.totalAmount || o.subtotal || 0);

    // Order Fulfillment Status
    const st = o.status || 'PENDING';
    if (!statusMap[st]) statusMap[st] = { status: st, count: 0, amount: 0 };
    statusMap[st].count += 1;
    statusMap[st].amount += amount;

    // Payment Status
    const ps = o.paymentStatus || 'AWAITING_PAYMENT';
    if (!paymentStatusMap[ps]) paymentStatusMap[ps] = { paymentStatus: ps, count: 0, amount: 0 };
    paymentStatusMap[ps].count += 1;
    paymentStatusMap[ps].amount += amount;

    // Payment Method
    const pm = o.paymentMethod || 'OTHER';
    if (!paymentMethodMap[pm]) paymentMethodMap[pm] = { paymentMethod: pm, count: 0, amount: 0 };
    paymentMethodMap[pm].count += 1;
    paymentMethodMap[pm].amount += amount;
  }

  const formatBreakdownList = (map) => {
    return Object.values(map)
      .map((item) => ({
        ...item,
        amount: Math.round(item.amount),
        amountFormatted: `₹${Math.round(item.amount).toLocaleString('en-IN')}`,
        shareOfOrders: totalOrders > 0 ? Math.round((item.count / totalOrders) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    period: {
      preset: range.preset,
      startDate: range.startStr,
      endDate: range.endStr,
      timezone: range.timezone,
    },
    totalOrders,
    byOrderStatus: formatBreakdownList(statusMap),
    byPaymentStatus: formatBreakdownList(paymentStatusMap),
    byPaymentMethod: formatBreakdownList(paymentMethodMap),
  };
}

/**
 * 6. Customer Purchasing & Cohort Metrics
 */
export async function getCustomerMetrics(params = {}) {
  const range = resolveDateRange(params);
  const orders = await fetchOrdersInDateRange(range.startUtc, range.endUtc);

  const dbConnected = await isDatabaseAlive();
  let newCustomersCount = 0;

  if (dbConnected) {
    try {
      newCustomersCount = await prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: {
            gte: range.startUtc,
            lte: range.endUtc,
          },
        },
      });
    } catch (e) {
      newCustomersCount = 0;
    }
  } else {
    // In-memory fallback
    const memCust = customerService._getInMemoryCustomers ? customerService._getInMemoryCustomers() : [];
    newCustomersCount = memCust.filter((c) => {
      const created = new Date(c.createdAt);
      return created >= range.startUtc && created <= range.endUtc && c.role === 'CUSTOMER';
    }).length;
  }

  // Purchasing customers during period
  const purchasingCustomerIds = new Set();
  let eligiblePaidOrdersCount = 0;

  for (const o of orders) {
    if (isEligiblePaidOrder(o)) {
      eligiblePaidOrdersCount += 1;
      if (o.userId) purchasingCustomerIds.add(o.userId);
    }
  }

  // Check lifetime orders to count repeat patrons
  let allOrders = [];
  if (dbConnected) {
    try {
      allOrders = await prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'FAILED'] },
        },
        select: { userId: true },
      });
    } catch (e) {
      allOrders = orderService._getInMemoryOrders ? orderService._getInMemoryOrders() : [];
    }
  } else {
    allOrders = orderService._getInMemoryOrders ? orderService._getInMemoryOrders() : [];
  }

  const customerOrderCounts = {};
  allOrders.forEach((o) => {
    if (isEligiblePaidOrder(o) && o.userId) {
      customerOrderCounts[o.userId] = (customerOrderCounts[o.userId] || 0) + 1;
    }
  });

  const repeatCustomersCount = Array.from(purchasingCustomerIds).filter(
    (id) => (customerOrderCounts[id] || 0) >= 2
  ).length;

  const purchasingCustomersCount = purchasingCustomerIds.size;
  const avgOrdersPerCustomer =
    purchasingCustomersCount > 0
      ? (eligiblePaidOrdersCount / purchasingCustomersCount).toFixed(2)
      : '0.00';

  return {
    period: {
      preset: range.preset,
      startDate: range.startStr,
      endDate: range.endStr,
      timezone: range.timezone,
    },
    metrics: {
      newRegistrations: newCustomersCount,
      purchasingCustomers: purchasingCustomersCount,
      repeatCustomers: repeatCustomersCount,
      repeatCustomerRate:
        purchasingCustomersCount > 0
          ? `${Math.round((repeatCustomersCount / purchasingCustomersCount) * 100)}%`
          : '0%',
      avgOrdersPerCustomer,
      eligiblePaidOrders: eligiblePaidOrdersCount,
    },
  };
}

/**
 * 7. CSV Export Utilities
 * Protected against spreadsheet formula injection (CWE-1236)
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value).replace(/\r\n|\r|\n/g, ' ');
  // Prevent formula injection if first character triggers spreadsheet execution
  if (/^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates downloadable CSV for specified report type
 */
export async function generateReportCsv(reportType = 'sales-summary', params = {}) {
  const range = resolveDateRange(params);
  const today = formatIstDateKey(new Date());

  if (reportType === 'sales-summary') {
    const summary = await getSalesSummary(params);
    const m = summary.metrics;

    const headers = ['Metric', 'Value', 'Calculation Rule'];
    const rows = [
      headers.map(sanitizeCsvCell).join(','),
      [sanitizeCsvCell('Reporting Period'), sanitizeCsvCell(`${summary.period.startDate} to ${summary.period.endDate} (Asia/Kolkata)`), sanitizeCsvCell('Selected range')].join(','),
      [sanitizeCsvCell('Total Orders Placed'), sanitizeCsvCell(m.totalOrders), sanitizeCsvCell('Distinct orders created in period')].join(','),
      [sanitizeCsvCell('Verified Paid Orders'), sanitizeCsvCell(m.paidOrders), sanitizeCsvCell(summary.rules.paidOrderRule)].join(','),
      [sanitizeCsvCell('Unpaid / Pending Orders'), sanitizeCsvCell(m.unpaidOrders), sanitizeCsvCell('Orders with payment awaiting verification')].join(','),
      [sanitizeCsvCell('Cancelled / Failed Orders'), sanitizeCsvCell(m.cancelledOrders), sanitizeCsvCell('Excluded from paid sales metrics')].join(','),
      [sanitizeCsvCell('Units Sold'), sanitizeCsvCell(m.unitsSold), sanitizeCsvCell('Total item quantities on eligible paid orders')].join(','),
      [sanitizeCsvCell('Gross Merchandise Sales (INR)'), sanitizeCsvCell(m.grossSales), sanitizeCsvCell(summary.rules.grossSalesRule)].join(','),
      [sanitizeCsvCell('Recorded Refunds (INR)'), sanitizeCsvCell(m.refundAmount), sanitizeCsvCell(summary.rules.refundRule)].join(','),
      [sanitizeCsvCell('Net Sales (INR)'), sanitizeCsvCell(m.netSales), sanitizeCsvCell(summary.rules.netSalesRule)].join(','),
      [sanitizeCsvCell('Average Order Value (INR)'), sanitizeCsvCell(m.averageOrderValue), sanitizeCsvCell(summary.rules.aovRule)].join(','),
    ];

    const filename = `collections-by-chandni-sales-summary-${range.startStr}-to-${range.endStr}.csv`;
    return { csvContent: rows.join('\r\n'), filename, rowCount: rows.length - 1 };
  }

  if (reportType === 'products') {
    const productsRes = await getProductPerformance({ ...params, limit: 1000 });
    const headers = ['Product Title', 'SKU', 'Size', 'Color', 'Units Sold', 'Gross Sales (INR)', 'Orders Count', 'Avg Selling Price (INR)'];
    const rows = [headers.map(sanitizeCsvCell).join(',')];

    for (const p of productsRes.data) {
      rows.push([
        sanitizeCsvCell(p.productTitle),
        sanitizeCsvCell(p.sku),
        sanitizeCsvCell(p.size),
        sanitizeCsvCell(p.color),
        sanitizeCsvCell(p.unitsSold),
        sanitizeCsvCell(p.grossSales),
        sanitizeCsvCell(p.ordersCount),
        sanitizeCsvCell(p.avgSellingPrice),
      ].join(','));
    }

    const filename = `collections-by-chandni-product-performance-${range.startStr}-to-${range.endStr}.csv`;
    return { csvContent: rows.join('\r\n'), filename, rowCount: rows.length - 1 };
  }

  if (reportType === 'categories') {
    const catsRes = await getCategoryPerformance(params);
    const headers = ['Category Name', 'Units Sold', 'Gross Sales (INR)', 'Share of Sales (%)', 'Orders Count'];
    const rows = [headers.map(sanitizeCsvCell).join(',')];

    for (const c of catsRes.data) {
      rows.push([
        sanitizeCsvCell(c.categoryName),
        sanitizeCsvCell(c.unitsSold),
        sanitizeCsvCell(c.grossSales),
        sanitizeCsvCell(`${c.shareOfSales}%`),
        sanitizeCsvCell(c.ordersCount),
      ].join(','));
    }

    const filename = `collections-by-chandni-category-performance-${range.startStr}-to-${range.endStr}.csv`;
    return { csvContent: rows.join('\r\n'), filename, rowCount: rows.length - 1 };
  }

  if (reportType === 'order-breakdown') {
    const breakdown = await getOrderBreakdown(params);
    const headers = ['Category Type', 'Status / Method', 'Orders Count', 'Total Amount (INR)', 'Share of Orders (%)'];
    const rows = [headers.map(sanitizeCsvCell).join(',')];

    // Order status
    breakdown.byOrderStatus.forEach((item) => {
      rows.push([
        sanitizeCsvCell('Order Fulfillment Status'),
        sanitizeCsvCell(item.status),
        sanitizeCsvCell(item.count),
        sanitizeCsvCell(item.amount),
        sanitizeCsvCell(`${item.shareOfOrders}%`),
      ].join(','));
    });

    // Payment status
    breakdown.byPaymentStatus.forEach((item) => {
      rows.push([
        sanitizeCsvCell('Payment Status'),
        sanitizeCsvCell(item.paymentStatus),
        sanitizeCsvCell(item.count),
        sanitizeCsvCell(item.amount),
        sanitizeCsvCell(`${item.shareOfOrders}%`),
      ].join(','));
    });

    // Payment method
    breakdown.byPaymentMethod.forEach((item) => {
      rows.push([
        sanitizeCsvCell('Payment Method'),
        sanitizeCsvCell(item.paymentMethod),
        sanitizeCsvCell(item.count),
        sanitizeCsvCell(item.amount),
        sanitizeCsvCell(`${item.shareOfOrders}%`),
      ].join(','));
    });

    const filename = `collections-by-chandni-order-breakdown-${range.startStr}-to-${range.endStr}.csv`;
    return { csvContent: rows.join('\r\n'), filename, rowCount: rows.length - 1 };
  }

  throw new Error(`Unsupported reportType: ${reportType}`);
}

export default {
  getNowInIst,
  formatIstDateKey,
  formatIstDateLabel,
  parseIstDateStringToUtc,
  resolveDateRange,
  isEligiblePaidOrder,
  getSalesSummary,
  getSalesTrends,
  getProductPerformance,
  getCategoryPerformance,
  getOrderBreakdown,
  getCustomerMetrics,
  sanitizeCsvCell,
  generateReportCsv,
};
