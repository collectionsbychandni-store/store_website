import prisma from '../config/db.js';
import * as variantService from './variantService.js';
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
 * Computes standard stock status:
 * - INACTIVE: when variant is inactive
 * - OUT_OF_STOCK: stock quantity <= 0
 * - LOW_STOCK: stock > 0 and stock <= lowStockThreshold
 * - IN_STOCK: stock > lowStockThreshold
 */
export function computeVariantStockStatus(stock, threshold = 5, isActive = true) {
  if (!isActive) return 'INACTIVE';
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/**
 * Formula Injection Protection (CSV Injection / CWE-1236)
 * Prepend a single quote if string begins with =, +, -, @, \t, or \r
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Replace newlines with space to prevent row splitting
  str = str.replace(/\r\n|\r|\n/g, ' ');
  // Prevent spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Internal helper to retrieve enriched active & inactive variants
 */
async function fetchEnrichedVariants() {
  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const allVariants = await prisma.productVariant.findMany({
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            brand: true,
            categoryId: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return allVariants.map((v) => {
      const formattedV = variantService.formatVariant(v);
      const stock = Number(v.stock ?? 0);
      const threshold = Number(v.lowStockThreshold ?? 5);
      const isActive = Boolean(v.isActive);
      const stockStatus = computeVariantStockStatus(stock, threshold, isActive);

      return {
        ...formattedV,
        stock,
        stockQuantity: stock,
        lowStockThreshold: threshold,
        isActive,
        stockStatus,
        productTitle: v.product?.title || 'Unknown Product',
        productSlug: v.product?.slug || '',
        productBrand: v.product?.brand || 'Collections by Chandni',
        categoryName: v.product?.category?.name || 'Uncategorized',
        categorySlug: v.product?.category?.slug || '',
        categoryId: v.product?.categoryId || '',
      };
    });
  }

  // In-memory fallback
  const inMemVariants = variantService._getInMemoryVariants();
  const products = await productService.getProducts({ limit: 100 }, true);
  const productMap = new Map((products.data || []).map((p) => [p.id, p]));

  return inMemVariants.map((v) => {
    const p = productMap.get(v.productId);
    const formattedV = variantService.formatVariant(v);
    const stock = Number(v.stock ?? 0);
    const threshold = Number(v.lowStockThreshold ?? 5);
    const isActive = Boolean(v.isActive);
    const stockStatus = computeVariantStockStatus(stock, threshold, isActive);

    return {
      ...formattedV,
      stock,
      stockQuantity: stock,
      lowStockThreshold: threshold,
      isActive,
      stockStatus,
      productTitle: p?.title || 'Unknown Product',
      productSlug: p?.slug || '',
      productBrand: p?.brand || 'Collections by Chandni',
      categoryName: p?.category?.name || 'Uncategorized',
      categorySlug: p?.category?.slug || '',
      categoryId: p?.categoryId || '',
    };
  });
}

/**
 * Calculates summary metrics from actual database records:
 * - Total active variants
 * - Total available units (active variants)
 * - Number of low-stock variants (stock > 0 and stock <= threshold)
 * - Number of out-of-stock variants (stock <= 0)
 * - Estimated retail inventory value at current selling prices
 * Note: Inactive variants are excluded from operational stock alerts.
 */
export function calculateInventorySummary(variants = []) {
  const activeVariants = variants.filter((v) => v.isActive);
  const inactiveVariants = variants.filter((v) => !v.isActive);

  const totalVariants = activeVariants.length;
  const totalInactiveVariants = inactiveVariants.length;
  const totalUnitsInStock = activeVariants.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0);
  const lowStockCount = activeVariants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).length;
  const outOfStockCount = activeVariants.filter((v) => v.stock <= 0).length;
  const inStockCount = activeVariants.filter((v) => v.stock > v.lowStockThreshold).length;

  // Estimated retail value using current selling price for active units in stock
  const estimatedRetailValue = activeVariants.reduce((sum, v) => {
    const units = Math.max(0, Number(v.stock || 0));
    const price = Number(v.sellingPrice || 0);
    return sum + units * price;
  }, 0);

  return {
    totalVariants,
    totalInactiveVariants,
    totalUnitsInStock,
    lowStockCount,
    outOfStockCount,
    inStockCount,
    estimatedRetailValue: Math.round(estimatedRetailValue * 100) / 100,
    valuationNotice: 'Estimated valuation based on active catalog retail selling prices (INR). Wholesale acquisition cost is not recorded in the product schema.',
  };
}

/**
 * Retrieves inventory items across products with filtering, search, sorting & summary KPIs
 */
export async function getInventory({
  search = '',
  productId,
  categoryId,
  stockStatus,
  page = 1,
  limit = 10,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const validSortBy = ['stock', 'sku', 'sellingPrice', 'createdAt', 'productTitle'].includes(sortBy) ? sortBy : 'createdAt';
  const validSortOrder = sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  let variants = await fetchEnrichedVariants();

  // Summary KPIs calculated across active variants in the catalog
  const summary = calculateInventorySummary(variants);

  // Search filter
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    variants = variants.filter(
      (v) =>
        v.sku.toLowerCase().includes(s) ||
        v.productTitle.toLowerCase().includes(s) ||
        v.color.toLowerCase().includes(s) ||
        v.size.toLowerCase().includes(s) ||
        (v.categoryName && v.categoryName.toLowerCase().includes(s))
    );
  }

  // Product filter
  if (productId && typeof productId === 'string' && productId.trim()) {
    variants = variants.filter((v) => v.productId === productId.trim());
  }

  // Category filter
  if (categoryId && typeof categoryId === 'string' && categoryId.trim()) {
    variants = variants.filter((v) => v.categoryId === categoryId.trim());
  }

  // Stock status filter
  if (stockStatus && stockStatus !== 'ALL') {
    const statusUpper = stockStatus.toUpperCase();
    if (statusUpper === 'INACTIVE') {
      variants = variants.filter((v) => !v.isActive);
    } else {
      variants = variants.filter((v) => v.stockStatus === statusUpper);
    }
  }

  // Sorting
  variants.sort((a, b) => {
    let valA = a[validSortBy];
    let valB = b[validSortBy];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return validSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return validSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = variants.length;
  const paginatedData = limitNum >= 9999 ? variants : variants.slice(skip, skip + limitNum);

  return {
    data: paginatedData,
    summary,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 0,
    },
  };
}

/**
 * Retrieves low-stock and out-of-stock operational alerts
 * Inactive variants are excluded from operational stock alerts.
 */
export async function getLowStockAlerts({
  search = '',
  categoryId,
  stockStatus = 'ALL_ALERTS',
  page = 1,
  limit = 20,
  sortBy = 'stock',
  sortOrder = 'asc',
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const skip = (pageNum - 1) * limitNum;

  const validSortBy = ['stock', 'sku', 'productTitle', 'sellingPrice'].includes(sortBy) ? sortBy : 'stock';
  const validSortOrder = sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  let variants = await fetchEnrichedVariants();

  // Exclude inactive variants from operational alerts per Step 17 requirement
  let alerts = variants.filter((v) => v.isActive && v.stock <= v.lowStockThreshold);

  // Overall summary of alerts
  const totalAlerts = alerts.length;
  const outOfStockCount = alerts.filter((v) => v.stock <= 0).length;
  const lowStockCount = alerts.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).length;

  // Filter by alert category
  if (stockStatus === 'OUT_OF_STOCK') {
    alerts = alerts.filter((v) => v.stock <= 0);
  } else if (stockStatus === 'LOW_STOCK') {
    alerts = alerts.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold);
  }

  // Category filter
  if (categoryId && typeof categoryId === 'string' && categoryId.trim()) {
    alerts = alerts.filter((v) => v.categoryId === categoryId.trim());
  }

  // Search filter
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    alerts = alerts.filter(
      (v) =>
        v.sku.toLowerCase().includes(s) ||
        v.productTitle.toLowerCase().includes(s) ||
        v.color.toLowerCase().includes(s) ||
        v.size.toLowerCase().includes(s) ||
        (v.categoryName && v.categoryName.toLowerCase().includes(s))
    );
  }

  // Sort by lowest available stock by default
  alerts.sort((a, b) => {
    let valA = a[validSortBy];
    let valB = b[validSortBy];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return validSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return validSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = alerts.length;
  const paginatedData = limitNum >= 9999 ? alerts : alerts.slice(skip, skip + limitNum);

  return {
    data: paginatedData,
    summary: {
      totalAlerts,
      outOfStockCount,
      lowStockCount,
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 0,
    },
  };
}

/**
 * Retrieves aggregated inventory reports:
 * - Current inventory by product
 * - Variant-level stock
 * - Stock grouped by category
 * - Low-stock report
 * - Out-of-stock report
 */
export async function getInventoryReports({ categoryId } = {}) {
  let variants = await fetchEnrichedVariants();

  if (categoryId && typeof categoryId === 'string' && categoryId.trim()) {
    variants = variants.filter((v) => v.categoryId === categoryId.trim());
  }

  const activeVariants = variants.filter((v) => v.isActive);
  const summary = calculateInventorySummary(variants);

  // Group by Product
  const productMap = new Map();
  for (const v of activeVariants) {
    const pId = v.productId || 'unknown';
    if (!productMap.has(pId)) {
      productMap.set(pId, {
        productId: pId,
        productTitle: v.productTitle,
        productSlug: v.productSlug,
        categoryName: v.categoryName,
        categoryId: v.categoryId,
        variantCount: 0,
        totalUnits: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        inStockCount: 0,
        estimatedRetailValue: 0,
      });
    }
    const item = productMap.get(pId);
    item.variantCount += 1;
    item.totalUnits += Math.max(0, v.stock);
    if (v.stock <= 0) {
      item.outOfStockCount += 1;
    } else if (v.stock <= v.lowStockThreshold) {
      item.lowStockCount += 1;
    } else {
      item.inStockCount += 1;
    }
    item.estimatedRetailValue += Math.max(0, v.stock) * Number(v.sellingPrice || 0);
  }

  const byProduct = Array.from(productMap.values()).sort((a, b) => {
    // Sort products with alert items first, then by total units
    const alertDiff = (b.outOfStockCount + b.lowStockCount) - (a.outOfStockCount + a.lowStockCount);
    if (alertDiff !== 0) return alertDiff;
    return a.totalUnits - b.totalUnits;
  });

  // Group by Category
  const categoryMap = new Map();
  for (const v of activeVariants) {
    const cId = v.categoryId || 'uncategorized';
    if (!categoryMap.has(cId)) {
      categoryMap.set(cId, {
        categoryId: cId,
        categoryName: v.categoryName || 'Uncategorized',
        categorySlug: v.categorySlug || '',
        productIds: new Set(),
        variantCount: 0,
        totalUnits: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        inStockCount: 0,
        estimatedRetailValue: 0,
      });
    }
    const cat = categoryMap.get(cId);
    if (v.productId) cat.productIds.add(v.productId);
    cat.variantCount += 1;
    cat.totalUnits += Math.max(0, v.stock);
    if (v.stock <= 0) {
      cat.outOfStockCount += 1;
    } else if (v.stock <= v.lowStockThreshold) {
      cat.lowStockCount += 1;
    } else {
      cat.inStockCount += 1;
    }
    cat.estimatedRetailValue += Math.max(0, v.stock) * Number(v.sellingPrice || 0);
  }

  const byCategory = Array.from(categoryMap.values()).map((c) => ({
    ...c,
    productCount: c.productIds.size,
    productIds: undefined,
  })).sort((a, b) => b.totalUnits - a.totalUnits);

  // Detailed alert lists
  const lowStockList = activeVariants
    .filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock);

  const outOfStockList = activeVariants
    .filter((v) => v.stock <= 0)
    .sort((a, b) => a.sku.localeCompare(b.sku));

  return {
    summary,
    byProduct,
    byCategory,
    lowStockList,
    outOfStockList,
  };
}

/**
 * Retrieves stock adjustment history / audit trail
 */
export async function getAdjustments({
  variantId,
  search = '',
  page = 1,
  limit = 20,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const skip = (pageNum - 1) * limitNum;

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const where = {};
    if (variantId && typeof variantId === 'string' && variantId.trim()) {
      where.variantId = variantId.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      where.OR = [
        { reason: { contains: s, mode: 'insensitive' } },
        { variant: { sku: { contains: s, mode: 'insensitive' } } },
        { variant: { product: { title: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.inventoryAdjustment.count({ where }),
      prisma.inventoryAdjustment.findMany({
        where,
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              product: {
                select: { id: true, title: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const formatted = records.map((r) => ({
      id: r.id,
      variantId: r.variantId,
      sku: r.variant?.sku || 'N/A',
      productTitle: r.variant?.product?.title || 'Unknown Product',
      size: r.variant?.size || '',
      color: r.variant?.color || '',
      previousQuantity: r.previousQuantity,
      newQuantity: r.newQuantity,
      quantityDelta: r.quantityDelta,
      reason: r.reason || 'Manual inventory adjustment',
      adminUserId: r.adminUserId,
      createdAt: r.createdAt,
    }));

    return {
      data: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
    };
  }

  // In-memory fallback
  let adjustments = [...variantService._getInMemoryAdjustments()];
  const inMemVariants = variantService._getInMemoryVariants();
  const products = await productService.getProducts({ limit: 100 }, true);
  const productMap = new Map((products.data || []).map((p) => [p.id, p]));
  const variantMap = new Map(inMemVariants.map((v) => [v.id, v]));

  if (variantId && typeof variantId === 'string' && variantId.trim()) {
    adjustments = adjustments.filter((a) => a.variantId === variantId.trim());
  }

  const enriched = adjustments.map((a) => {
    const v = variantMap.get(a.variantId);
    const p = v ? productMap.get(v.productId) : null;
    return {
      id: a.id,
      variantId: a.variantId,
      sku: v?.sku || 'N/A',
      productTitle: p?.title || 'Unknown Product',
      size: v?.size || '',
      color: v?.color || '',
      previousQuantity: a.previousQuantity,
      newQuantity: a.newQuantity,
      quantityDelta: a.quantityDelta,
      reason: a.reason || 'Manual inventory adjustment',
      adminUserId: a.adminUserId,
      createdAt: a.createdAt,
    };
  });

  let filtered = enriched;
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.sku.toLowerCase().includes(s) ||
        a.productTitle.toLowerCase().includes(s) ||
        (a.reason && a.reason.toLowerCase().includes(s))
    );
  }

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = filtered.length;
  const paginatedData = filtered.slice(skip, skip + limitNum);

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
 * Adjusts inventory stock quantity safely and creates an audit record
 */
export async function adjustStock(variantId, {
  mode,
  quantity,
  adjustment,
  reason = 'Admin manual adjustment',
  adminUserId = null,
}) {
  if (!variantId) {
    const err = new Error('Variant ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  let existing = null;
  if (dbConnected) {
    existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
  } else {
    const inMem = variantService._getInMemoryVariants();
    existing = inMem.find((v) => v.id === variantId);
  }

  if (!existing) {
    const err = new Error('Variant not found');
    err.status = 404;
    throw err;
  }

  const currentStock = Number(existing.stock);
  let newStock = currentStock;

  // Determine target stock based on mode or inputs
  if (mode === 'SET' || (quantity !== undefined && mode !== 'INCREASE' && mode !== 'DECREASE' && adjustment === undefined)) {
    const q = parseInt(quantity, 10);
    if (isNaN(q) || q < 0) {
      const err = new Error('Quantity must be a non-negative integer');
      err.status = 400;
      throw err;
    }
    newStock = q;
  } else if (mode === 'INCREASE') {
    const delta = parseInt(quantity, 10);
    if (isNaN(delta) || delta <= 0) {
      const err = new Error('Increase amount must be a positive integer');
      err.status = 400;
      throw err;
    }
    newStock = currentStock + delta;
  } else if (mode === 'DECREASE') {
    const delta = parseInt(quantity, 10);
    if (isNaN(delta) || delta <= 0) {
      const err = new Error('Decrease amount must be a positive integer');
      err.status = 400;
      throw err;
    }
    newStock = currentStock - delta;
  } else if (adjustment !== undefined) {
    const adj = parseInt(adjustment, 10);
    if (isNaN(adj)) {
      const err = new Error('Adjustment must be an integer');
      err.status = 400;
      throw err;
    }
    newStock = currentStock + adj;
  } else {
    const err = new Error('Please specify a valid quantity, mode, or adjustment');
    err.status = 400;
    throw err;
  }

  // Prevent negative stock
  if (newStock < 0) {
    const err = new Error(`Stock quantity cannot be negative. Current stock is ${currentStock}, adjustment resulted in ${newStock}.`);
    err.status = 400;
    throw err;
  }

  const delta = newStock - currentStock;

  if (dbConnected) {
    // Execute atomic update and adjustment recording
    const [updated, auditRecord] = await prisma.$transaction([
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock, updatedAt: new Date() },
      }),
      prisma.inventoryAdjustment.create({
        data: {
          variantId,
          previousQuantity: currentStock,
          newQuantity: newStock,
          quantityDelta: delta,
          reason: reason ? reason.trim() : null,
          adminUserId: adminUserId || null,
        },
      }),
    ]);

    return {
      variant: variantService.formatVariant(updated),
      adjustment: auditRecord,
    };
  }

  // In-memory update
  const inMem = variantService._getInMemoryVariants();
  const idx = inMem.findIndex((v) => v.id === variantId);
  inMem[idx].stock = newStock;
  inMem[idx].updatedAt = new Date();

  const auditRecord = {
    id: `adj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    variantId,
    previousQuantity: currentStock,
    newQuantity: newStock,
    quantityDelta: delta,
    reason: reason ? reason.trim() : 'Manual stock update',
    adminUserId: adminUserId || null,
    createdAt: new Date(),
  };

  const adjustments = variantService._getInMemoryAdjustments();
  adjustments.push(auditRecord);

  return {
    variant: variantService.formatVariant(inMem[idx]),
    adjustment: auditRecord,
  };
}

/**
 * Generates CSV string for filtered inventory results
 * Protected against spreadsheet formula injection (CWE-1236)
 */
export async function generateInventoryCsv({
  search = '',
  productId,
  categoryId,
  stockStatus = 'ALL',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) {
  // Fetch matching records (unpaginated)
  const res = await getInventory({
    search,
    productId,
    categoryId,
    stockStatus,
    sortBy,
    sortOrder,
    page: 1,
    limit: 10000,
  });

  const records = res.data || [];

  const headers = [
    'Product Name',
    'Category',
    'SKU',
    'Size',
    'Color',
    'MRP (INR)',
    'Selling Price (INR)',
    'Available Stock',
    'Low-Stock Threshold',
    'Stock Status',
  ];

  const rows = [headers.map(sanitizeCsvCell).join(',')];

  for (const item of records) {
    const row = [
      sanitizeCsvCell(item.productTitle),
      sanitizeCsvCell(item.categoryName),
      sanitizeCsvCell(item.sku),
      sanitizeCsvCell(item.size),
      sanitizeCsvCell(item.color),
      sanitizeCsvCell(item.mrp !== null && item.mrp !== undefined ? Number(item.mrp).toFixed(2) : ''),
      sanitizeCsvCell(item.sellingPrice !== null && item.sellingPrice !== undefined ? Number(item.sellingPrice).toFixed(2) : ''),
      sanitizeCsvCell(item.stock),
      sanitizeCsvCell(item.lowStockThreshold),
      sanitizeCsvCell(item.stockStatus),
    ];
    rows.push(row.join(','));
  }

  const today = new Date().toISOString().split('T')[0];
  const filename = `collections-by-chandni-inventory-${today}.csv`;
  const csvContent = rows.join('\r\n');

  return {
    csvContent,
    filename,
    recordCount: records.length,
  };
}

export default {
  computeVariantStockStatus,
  calculateInventorySummary,
  getInventory,
  getLowStockAlerts,
  getInventoryReports,
  getAdjustments,
  adjustStock,
  sanitizeCsvCell,
  generateInventoryCsv,
};
