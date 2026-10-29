import * as productService from './productService.js';
import * as categoryService from './categoryService.js';
import * as orderService from './orderService.js';
import * as customerService from './customerService.js';
import * as reportService from './reportService.js';

/**
 * Collections by Chandni - Admin Dashboard Service
 * Computes live, actual operational metrics from persistent store & database.
 * Replaces all hardcoded static demo data with actual business data.
 */
export async function getDashboardSummary() {
  const [
    productsRes,
    categoriesRes,
    ordersRes,
    customersRes,
    summaryRes,
    trendsRes,
    topProdRes,
  ] = await Promise.all([
    productService.getProducts({ limit: 100 }, true).catch(() => ({ data: [] })),
    categoryService.getCategories().catch(() => ({ data: [] })),
    orderService.getAdminOrders({ limit: 10 }).catch(() => ({ orders: [], pagination: { total: 0 } })),
    customerService.getCustomers({ limit: 100 }).catch(() => ({ data: [] })),
    reportService.getSalesSummary({ preset: '30d' }).catch(() => ({ metrics: {} })),
    reportService.getSalesTrends({ preset: '30d' }).catch(() => ({ trends: [] })),
    reportService.getProductPerformance({ preset: '30d' }).catch(() => ({ data: [] })),
  ]);

  const products = productsRes?.data || [];
  const categories = categoriesRes?.data || [];
  const orders = ordersRes?.orders || [];
  const totalOrdersCount = ordersRes?.pagination?.total || orders.length;
  const customers = customersRes?.data || [];
  const metrics = summaryRes?.metrics || {};

  // Count active products
  const activeProducts = products.filter((p) => p.isActive !== false);

  // Count dispatch queue (orders needing fulfillment)
  const dispatchQueueCount = orders.filter((o) =>
    ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'].includes(o.status)
  ).length;

  // Actual Gross Sales
  const grossSales = metrics.grossSales !== undefined ? metrics.grossSales : 0;
  const grossSalesFormatted = `₹${Math.round(grossSales).toLocaleString('en-IN')}`;

  // Recent Orders formatted for the dashboard table
  const recentOrders = orders.slice(0, 5).map((o) => {
    const customerName =
      o.customer?.name ||
      o.customerDetails?.name ||
      o.shippingAddress?.name ||
      (o.userId ? 'Patron' : 'Walk-in Patron');
    const customerEmail = o.customer?.email || o.customerDetails?.email || '';

    // First item summary
    const firstItem = o.items?.[0];
    const itemsCount = o.items?.length || 1;
    let itemsSummary = firstItem ? firstItem.productTitle : 'Artisan Piece';
    if (firstItem?.size || firstItem?.color) {
      itemsSummary += ` (${[firstItem.size, firstItem.color].filter(Boolean).join(' / ')})`;
    }
    if (itemsCount > 1) {
      itemsSummary += ` + ${itemsCount - 1} more`;
    }

    return {
      id: o.orderNumber || o.id,
      orderNumber: o.orderNumber || o.id,
      customer: {
        name: customerName,
        email: customerEmail,
      },
      date: new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      createdAt: o.createdAt,
      items: itemsSummary,
      amount: Number(o.totalAmount || o.subtotal || 0),
      paymentStatus: o.paymentStatus || 'AWAITING_PAYMENT',
      paymentMethod: o.paymentMethod || 'OTHER',
      orderStatus: o.status || 'PENDING',
      source: o.source || 'ONLINE',
    };
  });

  // Top Products list
  let topProducts = (topProdRes?.data || []).slice(0, 5).map((tp, idx) => ({
    id: tp.id || `prod-${idx}`,
    title: tp.productTitle || 'Artisan Garment',
    category: tp.categoryName || 'Boutique Collection',
    sku: tp.sku || 'N/A',
    unitsSold: tp.unitsSold || 0,
    revenue: tp.grossSales || 0,
    price: tp.unitPrice || 0,
  }));

  // If no sales yet, show catalog products with active stock
  if (topProducts.length === 0 && activeProducts.length > 0) {
    topProducts = activeProducts.slice(0, 5).map((p) => {
      const minPrice = p.variants?.reduce(
        (min, v) => Math.min(min, Number(v.sellingPrice || v.price || 0)),
        Infinity
      );
      const totalStock = p.variants?.reduce(
        (sum, v) => sum + Number(v.stockQuantity ?? v.stock ?? 0),
        0
      );
      return {
        id: p.id,
        title: p.title,
        category: p.category?.name || 'Couture',
        sku: p.sku || p.variants?.[0]?.sku || 'CBC-CAT',
        unitsSold: 0,
        revenue: 0,
        price: isFinite(minPrice) ? minPrice : (p.price || 0),
        totalStock: totalStock !== undefined ? totalStock : p.stockQuantity || 0,
      };
    });
  }

  // Monthly trends chart data
  const rawTrends = trendsRes?.trends || [];
  let chartData = rawTrends.map((t) => ({
    month: t.label || t.date,
    revenue: Number(t.sales || 0),
    orders: Number(t.orders || 0),
  }));

  // If daily trends returned, summarize or display last 7-12 points
  if (chartData.length > 12) {
    chartData = chartData.slice(-12);
  }

  return {
    success: true,
    stats: {
      totalProducts: activeProducts.length,
      categoriesCount: categories.length,
      totalOrders: totalOrdersCount,
      dispatchQueueCount,
      totalCustomers: customers.length,
      totalSales: grossSales,
      totalSalesFormatted: grossSalesFormatted,
      paidOrdersCount: metrics.paidOrders || 0,
      averageOrderValue: metrics.averageOrderValue || 0,
      aovFormatted: metrics.aovFormatted || '₹0',
      posSalesCount: metrics.posSales?.count || 0,
      onlineSalesCount: metrics.onlineSales?.count || 0,
    },
    recentOrders,
    topProducts,
    chartData,
  };
}

export default {
  getDashboardSummary,
};
