import prisma from '../config/db.js';
import * as productService from './productService.js';

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
// Seed-aligned In-Memory Store for Variants & Adjustments
// -----------------------------------------------------------------------------
const INITIAL_DEMO_VARIANTS = [
  // Product 1: Women's Designer Kurti
  { id: 'var-1-1', productId: 'prod-1', size: 'S', color: 'Blush Pink', sku: 'CBC-WDK-PNK-S', mrp: 3499.0, sellingPrice: 2499.0, stock: 15, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:00:00Z'), updatedAt: new Date('2026-09-29T11:00:00Z'), hasOrders: true },
  { id: 'var-1-2', productId: 'prod-1', size: 'M', color: 'Blush Pink', sku: 'CBC-WDK-PNK-M', mrp: 3499.0, sellingPrice: 2499.0, stock: 20, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:00:00Z'), updatedAt: new Date('2026-09-29T11:00:00Z'), hasOrders: true },
  { id: 'var-1-3', productId: 'prod-1', size: 'L', color: 'Blush Pink', sku: 'CBC-WDK-PNK-L', mrp: 3499.0, sellingPrice: 2499.0, stock: 12, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:00:00Z'), updatedAt: new Date('2026-09-29T11:00:00Z'), hasOrders: false },
  { id: 'var-1-4', productId: 'prod-1', size: 'XL', color: 'Blush Pink', sku: 'CBC-WDK-PNK-XL', mrp: 3499.0, sellingPrice: 2499.0, stock: 8, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:00:00Z'), updatedAt: new Date('2026-09-29T11:00:00Z'), hasOrders: false },
  { id: 'var-1-5', productId: 'prod-1', size: 'S', color: 'Royal Teal', sku: 'CBC-WDK-TEA-S', mrp: 3499.0, sellingPrice: 2499.0, stock: 10, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:00:00Z'), updatedAt: new Date('2026-09-29T11:00:00Z'), hasOrders: false },
  { id: 'var-1-6', productId: 'prod-1', size: 'M', color: 'Royal Teal', sku: 'CBC-WDK-TEA-M', mrp: 3499.0, sellingPrice: 2499.0, stock: 18, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:00:00Z'), updatedAt: new Date('2026-09-29T11:00:00Z'), hasOrders: false },
  { id: 'var-1-7', productId: 'prod-1', size: 'L', color: 'Royal Teal', sku: 'CBC-WDK-TEA-L', mrp: 3499.0, sellingPrice: 2499.0, stock: 14, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:00:00Z'), updatedAt: new Date('2026-09-29T11:00:00Z'), hasOrders: false },

  // Product 2: Floral Print Kurti
  { id: 'var-2-1', productId: 'prod-2', size: 'S', color: 'Sage Green', sku: 'CBC-FPK-SGE-S', mrp: 2199.0, sellingPrice: 1599.0, stock: 25, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:05:00Z'), updatedAt: new Date('2026-09-29T11:05:00Z'), hasOrders: true },
  { id: 'var-2-2', productId: 'prod-2', size: 'M', color: 'Sage Green', sku: 'CBC-FPK-SGE-M', mrp: 2199.0, sellingPrice: 1599.0, stock: 30, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:05:00Z'), updatedAt: new Date('2026-09-29T11:05:00Z'), hasOrders: false },
  { id: 'var-2-3', productId: 'prod-2', size: 'L', color: 'Sage Green', sku: 'CBC-FPK-SGE-L', mrp: 2199.0, sellingPrice: 1599.0, stock: 20, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:05:00Z'), updatedAt: new Date('2026-09-29T11:05:00Z'), hasOrders: false },
  { id: 'var-2-4', productId: 'prod-2', size: 'XL', color: 'Sage Green', sku: 'CBC-FPK-SGE-XL', mrp: 2199.0, sellingPrice: 1599.0, stock: 10, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:05:00Z'), updatedAt: new Date('2026-09-29T11:05:00Z'), hasOrders: false },
  { id: 'var-2-5', productId: 'prod-2', size: 'M', color: 'Indigo Blue', sku: 'CBC-FPK-IND-M', mrp: 2199.0, sellingPrice: 1599.0, stock: 22, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:05:00Z'), updatedAt: new Date('2026-09-29T11:05:00Z'), hasOrders: false },
  { id: 'var-2-6', productId: 'prod-2', size: 'L', color: 'Indigo Blue', sku: 'CBC-FPK-IND-L', mrp: 2199.0, sellingPrice: 1599.0, stock: 15, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:05:00Z'), updatedAt: new Date('2026-09-29T11:05:00Z'), hasOrders: false },

  // Product 3: Elegant Party Wear Dress
  { id: 'var-3-1', productId: 'prod-3', size: 'XS', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-XS', mrp: 5999.0, sellingPrice: 4299.0, stock: 3, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:10:00Z'), updatedAt: new Date('2026-09-29T11:10:00Z'), hasOrders: true },
  { id: 'var-3-2', productId: 'prod-3', size: 'S', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-S', mrp: 5999.0, sellingPrice: 4299.0, stock: 12, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:10:00Z'), updatedAt: new Date('2026-09-29T11:10:00Z'), hasOrders: false },
  { id: 'var-3-3', productId: 'prod-3', size: 'M', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-M', mrp: 5999.0, sellingPrice: 4299.0, stock: 16, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:10:00Z'), updatedAt: new Date('2026-09-29T11:10:00Z'), hasOrders: false },
  { id: 'var-3-4', productId: 'prod-3', size: 'L', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-L', mrp: 5999.0, sellingPrice: 4299.0, stock: 0, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:10:00Z'), updatedAt: new Date('2026-09-29T11:10:00Z'), hasOrders: false },
  { id: 'var-3-5', productId: 'prod-3', size: 'M', color: 'Emerald Green', sku: 'CBC-EPD-EMR-M', mrp: 5999.0, sellingPrice: 4299.0, stock: 14, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:10:00Z'), updatedAt: new Date('2026-09-29T11:10:00Z'), hasOrders: false },
  { id: 'var-3-6', productId: 'prod-3', size: 'L', color: 'Emerald Green', sku: 'CBC-EPD-EMR-L', mrp: 5999.0, sellingPrice: 4299.0, stock: 4, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:10:00Z'), updatedAt: new Date('2026-09-29T11:10:00Z'), hasOrders: false },

  // Product 4: Cotton Casual Kurti
  { id: 'var-4-1', productId: 'prod-4', size: 'S', color: 'Ivory White', sku: 'CBC-CCK-IVR-S', mrp: 1599.0, sellingPrice: 1199.0, stock: 30, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:15:00Z'), updatedAt: new Date('2026-09-29T11:15:00Z'), hasOrders: false },
  { id: 'var-4-2', productId: 'prod-4', size: 'M', color: 'Ivory White', sku: 'CBC-CCK-IVR-M', mrp: 1599.0, sellingPrice: 1199.0, stock: 40, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:15:00Z'), updatedAt: new Date('2026-09-29T11:15:00Z'), hasOrders: false },
  { id: 'var-4-3', productId: 'prod-4', size: 'L', color: 'Ivory White', sku: 'CBC-CCK-IVR-L', mrp: 1599.0, sellingPrice: 1199.0, stock: 25, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:15:00Z'), updatedAt: new Date('2026-09-29T11:15:00Z'), hasOrders: false },
  { id: 'var-4-4', productId: 'prod-4', size: 'XL', color: 'Ivory White', sku: 'CBC-CCK-IVR-XL', mrp: 1599.0, sellingPrice: 1199.0, stock: 15, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:15:00Z'), updatedAt: new Date('2026-09-29T11:15:00Z'), hasOrders: false },
  { id: 'var-4-5', productId: 'prod-4', size: 'M', color: 'Dusty Peach', sku: 'CBC-CCK-PCH-M', mrp: 1599.0, sellingPrice: 1199.0, stock: 2, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:15:00Z'), updatedAt: new Date('2026-09-29T11:15:00Z'), hasOrders: false },
  { id: 'var-4-6', productId: 'prod-4', size: 'L', color: 'Dusty Peach', sku: 'CBC-CCK-PCH-L', mrp: 1599.0, sellingPrice: 1199.0, stock: 20, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:15:00Z'), updatedAt: new Date('2026-09-29T11:15:00Z'), hasOrders: false },

  // Product 5: Embroidered Women's Kurti
  { id: 'var-5-1', productId: 'prod-5', size: 'S', color: 'Crimson Red', sku: 'CBC-EWK-CRM-S', mrp: 4499.0, sellingPrice: 3299.0, stock: 12, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:20:00Z'), updatedAt: new Date('2026-09-29T11:20:00Z'), hasOrders: false },
  { id: 'var-5-2', productId: 'prod-5', size: 'M', color: 'Crimson Red', sku: 'CBC-EWK-CRM-M', mrp: 4499.0, sellingPrice: 3299.0, stock: 18, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:20:00Z'), updatedAt: new Date('2026-09-29T11:20:00Z'), hasOrders: false },
  { id: 'var-5-3', productId: 'prod-5', size: 'L', color: 'Crimson Red', sku: 'CBC-EWK-CRM-L', mrp: 4499.0, sellingPrice: 3299.0, stock: 14, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:20:00Z'), updatedAt: new Date('2026-09-29T11:20:00Z'), hasOrders: false },
  { id: 'var-5-4', productId: 'prod-5', size: 'XL', color: 'Crimson Red', sku: 'CBC-EWK-CRM-XL', mrp: 4499.0, sellingPrice: 3299.0, stock: 9, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:20:00Z'), updatedAt: new Date('2026-09-29T11:20:00Z'), hasOrders: false },
  { id: 'var-5-5', productId: 'prod-5', size: 'M', color: 'Golden Mustard', sku: 'CBC-EWK-MST-M', mrp: 4499.0, sellingPrice: 3299.0, stock: 16, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:20:00Z'), updatedAt: new Date('2026-09-29T11:20:00Z'), hasOrders: false },
  { id: 'var-5-6', productId: 'prod-5', size: 'L', color: 'Golden Mustard', sku: 'CBC-EWK-MST-L', mrp: 4499.0, sellingPrice: 3299.0, stock: 0, lowStockThreshold: 5, isActive: true, createdAt: new Date('2026-09-29T11:20:00Z'), updatedAt: new Date('2026-09-29T11:20:00Z'), hasOrders: false },
];

const INITIAL_DEMO_ADJUSTMENTS = [
  {
    id: 'adj-seed-1',
    variantId: 'var-1-1',
    previousQuantity: 10,
    newQuantity: 15,
    quantityDelta: 5,
    reason: 'Initial stock intake from Jaipur handloom workshop',
    adminUserId: 'admin-seed-uuid-1',
    createdAt: new Date('2026-10-01T10:00:00Z'),
  },
  {
    id: 'adj-seed-2',
    variantId: 'var-3-1',
    previousQuantity: 8,
    newQuantity: 3,
    quantityDelta: -5,
    reason: 'Damaged piece quarantined during atelier quality check',
    adminUserId: 'admin-seed-uuid-1',
    createdAt: new Date('2026-10-05T14:30:00Z'),
  },
  {
    id: 'adj-seed-3',
    variantId: 'var-5-6',
    previousQuantity: 5,
    newQuantity: 0,
    quantityDelta: -5,
    reason: 'Sold out at festive atelier exhibition booth',
    adminUserId: 'admin-seed-uuid-1',
    createdAt: new Date('2026-10-12T16:45:00Z'),
  },
];

let inMemoryVariants = [...INITIAL_DEMO_VARIANTS];
let inMemoryAdjustments = [...INITIAL_DEMO_ADJUSTMENTS];

export function _getInMemoryVariants() {
  return inMemoryVariants;
}

export function _getInMemoryAdjustments() {
  return inMemoryAdjustments;
}

/**
 * Computes standard stockStatus string
 */
export function computeStockStatus(stock, threshold = 5, isActive = true) {
  if (!isActive) return 'INACTIVE';
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/**
 * Enriches variant object with computed stockStatus and alias fields
 */
export function formatVariant(v) {
  const stock = Number(v.stock ?? v.stockQuantity ?? 0);
  const threshold = Number(v.lowStockThreshold ?? 5);
  const mrp = Number(v.mrp);
  const sellingPrice = Number(v.sellingPrice);

  return {
    ...v,
    stock,
    stockQuantity: stock,
    lowStockThreshold: threshold,
    mrp,
    sellingPrice,
    stockStatus: computeStockStatus(stock, threshold, v.isActive),
  };
}

// -----------------------------------------------------------------------------
// Service Methods
// -----------------------------------------------------------------------------

/**
 * Get all variants belonging to a specific product
 */
export async function getVariantsByProductId(productId) {
  if (!productId) {
    const err = new Error('Product ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ size: 'asc' }, { color: 'asc' }],
    });

    return variants.map(formatVariant);
  }

  // In-memory fallback
  const product = await productService.getProductById(productId, true);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  const matches = inMemoryVariants
    .filter((v) => v.productId === productId)
    .map(formatVariant);

  return matches;
}

/**
 * Get a single variant by ID
 */
export async function getVariantById(id) {
  if (!id) {
    const err = new Error('Variant ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, title: true, slug: true, categoryId: true },
        },
      },
    });

    if (!variant) return null;
    return formatVariant(variant);
  }

  // In-memory fallback
  const v = inMemoryVariants.find((item) => item.id === id);
  if (!v) return null;

  const product = await productService.getProductById(v.productId, true);

  return {
    ...formatVariant(v),
    product: product
      ? { id: product.id, title: product.title, slug: product.slug, categoryId: product.categoryId }
      : null,
  };
}

/**
 * Create a variant for a product
 */
export async function createVariant(productId, {
  size = 'One Size',
  color = 'Standard',
  sku,
  mrp,
  sellingPrice,
  stock = 0,
  stockQuantity,
  lowStockThreshold = 5,
  isActive = true,
}) {
  if (!productId) {
    const err = new Error('Product ID is required');
    err.status = 400;
    throw err;
  }

  // 1. Verify product existence
  const product = await productService.getProductById(productId, true);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  // 2. Validate SKU
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    const err = new Error('SKU is required');
    err.status = 400;
    throw err;
  }
  const cleanSku = sku.trim().toUpperCase();

  // 3. Validate Prices
  const numMrp = Number(mrp);
  const numSellingPrice = Number(sellingPrice);

  if (isNaN(numMrp) || numMrp < 0) {
    const err = new Error('MRP must be a non-negative number');
    err.status = 400;
    throw err;
  }

  if (isNaN(numSellingPrice) || numSellingPrice < 0) {
    const err = new Error('Selling price must be a non-negative number');
    err.status = 400;
    throw err;
  }

  if (numSellingPrice > numMrp) {
    const err = new Error('Selling price cannot exceed MRP');
    err.status = 400;
    throw err;
  }

  // 4. Validate Stock & Threshold
  const rawStock = stockQuantity !== undefined ? stockQuantity : stock;
  const numStock = parseInt(rawStock, 10);
  if (isNaN(numStock) || numStock < 0) {
    const err = new Error('Stock quantity must be a non-negative integer');
    err.status = 400;
    throw err;
  }

  const numThreshold = parseInt(lowStockThreshold, 10);
  if (isNaN(numThreshold) || numThreshold < 0) {
    const err = new Error('Low stock threshold must be a non-negative integer');
    err.status = 400;
    throw err;
  }

  const cleanSize = (size || 'One Size').trim();
  const cleanColor = (color || 'Standard').trim();

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    // Check SKU uniqueness
    const skuExists = await prisma.productVariant.findUnique({ where: { sku: cleanSku } });
    if (skuExists) {
      const err = new Error(`SKU "${cleanSku}" already exists`);
      err.status = 400;
      throw err;
    }

    // Check size + color uniqueness for this product
    const comboExists = await prisma.productVariant.findFirst({
      where: {
        productId,
        size: cleanSize,
        color: cleanColor,
      },
    });
    if (comboExists) {
      const err = new Error(`A variant with size "${cleanSize}" and color "${cleanColor}" already exists for this product`);
      err.status = 400;
      throw err;
    }

    const created = await prisma.productVariant.create({
      data: {
        productId,
        sku: cleanSku,
        size: cleanSize,
        color: cleanColor,
        mrp: numMrp,
        sellingPrice: numSellingPrice,
        stock: numStock,
        lowStockThreshold: numThreshold,
        isActive: Boolean(isActive),
      },
    });

    return formatVariant(created);
  }

  // In-memory create
  const skuExists = inMemoryVariants.find((v) => v.sku === cleanSku);
  if (skuExists) {
    const err = new Error(`SKU "${cleanSku}" already exists`);
    err.status = 400;
    throw err;
  }

  const comboExists = inMemoryVariants.find(
    (v) => v.productId === productId && v.size.toLowerCase() === cleanSize.toLowerCase() && v.color.toLowerCase() === cleanColor.toLowerCase()
  );
  if (comboExists) {
    const err = new Error(`A variant with size "${cleanSize}" and color "${cleanColor}" already exists for this product`);
    err.status = 400;
    throw err;
  }

  const newVariant = {
    id: `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId,
    sku: cleanSku,
    size: cleanSize,
    color: cleanColor,
    mrp: numMrp,
    sellingPrice: numSellingPrice,
    stock: numStock,
    lowStockThreshold: numThreshold,
    isActive: Boolean(isActive),
    createdAt: new Date(),
    updatedAt: new Date(),
    hasOrders: false,
  };

  inMemoryVariants.push(newVariant);
  return formatVariant(newVariant);
}

/**
 * Update an existing variant
 */
export async function updateVariant(id, {
  size,
  color,
  sku,
  mrp,
  sellingPrice,
  stock,
  stockQuantity,
  lowStockThreshold,
  isActive,
}) {
  if (!id) {
    const err = new Error('Variant ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  let existing = null;
  if (dbConnected) {
    existing = await prisma.productVariant.findUnique({ where: { id } });
  } else {
    existing = inMemoryVariants.find((v) => v.id === id);
  }

  if (!existing) {
    const err = new Error('Variant not found');
    err.status = 404;
    throw err;
  }

  const updateData = { updatedAt: new Date() };

  // Validate SKU if provided
  if (sku !== undefined) {
    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      const err = new Error('SKU cannot be empty');
      err.status = 400;
      throw err;
    }
    const cleanSku = sku.trim().toUpperCase();

    if (dbConnected) {
      const conflict = await prisma.productVariant.findFirst({
        where: { sku: cleanSku, NOT: { id } },
      });
      if (conflict) {
        const err = new Error(`SKU "${cleanSku}" already exists on another variant`);
        err.status = 400;
        throw err;
      }
    } else {
      const conflict = inMemoryVariants.find((v) => v.sku === cleanSku && v.id !== id);
      if (conflict) {
        const err = new Error(`SKU "${cleanSku}" already exists on another variant`);
        err.status = 400;
        throw err;
      }
    }
    updateData.sku = cleanSku;
  }

  // Validate Prices
  const finalMrp = mrp !== undefined ? Number(mrp) : Number(existing.mrp);
  const finalSellingPrice = sellingPrice !== undefined ? Number(sellingPrice) : Number(existing.sellingPrice);

  if (mrp !== undefined) {
    if (isNaN(finalMrp) || finalMrp < 0) {
      const err = new Error('MRP must be a non-negative number');
      err.status = 400;
      throw err;
    }
    updateData.mrp = finalMrp;
  }

  if (sellingPrice !== undefined) {
    if (isNaN(finalSellingPrice) || finalSellingPrice < 0) {
      const err = new Error('Selling price must be a non-negative number');
      err.status = 400;
      throw err;
    }
    updateData.sellingPrice = finalSellingPrice;
  }

  if (finalSellingPrice > finalMrp) {
    const err = new Error('Selling price cannot exceed MRP');
    err.status = 400;
    throw err;
  }

  // Validate Stock
  const rawStock = stockQuantity !== undefined ? stockQuantity : stock;
  if (rawStock !== undefined) {
    const numStock = parseInt(rawStock, 10);
    if (isNaN(numStock) || numStock < 0) {
      const err = new Error('Stock quantity must be a non-negative integer');
      err.status = 400;
      throw err;
    }
    updateData.stock = numStock;
  }

  // Validate Threshold
  if (lowStockThreshold !== undefined) {
    const numThreshold = parseInt(lowStockThreshold, 10);
    if (isNaN(numThreshold) || numThreshold < 0) {
      const err = new Error('Low stock threshold must be a non-negative integer');
      err.status = 400;
      throw err;
    }
    updateData.lowStockThreshold = numThreshold;
  }

  // Validate Size & Color combination
  const finalSize = size !== undefined ? (size || 'One Size').trim() : existing.size;
  const finalColor = color !== undefined ? (color || 'Standard').trim() : existing.color;

  if (size !== undefined || color !== undefined) {
    if (dbConnected) {
      const comboConflict = await prisma.productVariant.findFirst({
        where: {
          productId: existing.productId,
          size: finalSize,
          color: finalColor,
          NOT: { id },
        },
      });
      if (comboConflict) {
        const err = new Error(`A variant with size "${finalSize}" and color "${finalColor}" already exists for this product`);
        err.status = 400;
        throw err;
      }
    } else {
      const comboConflict = inMemoryVariants.find(
        (v) =>
          v.productId === existing.productId &&
          v.id !== id &&
          v.size.toLowerCase() === finalSize.toLowerCase() &&
          v.color.toLowerCase() === finalColor.toLowerCase()
      );
      if (comboConflict) {
        const err = new Error(`A variant with size "${finalSize}" and color "${finalColor}" already exists for this product`);
        err.status = 400;
        throw err;
      }
    }
    updateData.size = finalSize;
    updateData.color = finalColor;
  }

  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  if (dbConnected) {
    const updated = await prisma.productVariant.update({
      where: { id },
      data: updateData,
    });
    return formatVariant(updated);
  }

  // In-memory update
  const idx = inMemoryVariants.findIndex((v) => v.id === id);
  inMemoryVariants[idx] = {
    ...inMemoryVariants[idx],
    ...updateData,
  };

  return formatVariant(inMemoryVariants[idx]);
}

/**
 * Toggle or update variant active status
 */
export async function updateVariantStatus(id, isActive) {
  if (typeof isActive !== 'boolean') {
    const err = new Error('isActive must be a boolean');
    err.status = 400;
    throw err;
  }
  return await updateVariant(id, { isActive });
}

/**
 * Safely delete a variant
 * Throws 409 if variant is referenced in order records
 */
export async function deleteVariant(id) {
  if (!id) {
    const err = new Error('Variant ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!variant) {
      const err = new Error('Variant not found');
      err.status = 404;
      throw err;
    }

    if (variant._count.orderItems > 0) {
      const err = new Error(
        'Cannot delete variant because it is referenced in existing customer orders. You may deactivate the variant instead to preserve historical records.'
      );
      err.status = 409;
      throw err;
    }

    await prisma.productVariant.delete({ where: { id } });
    return true;
  }

  // In-memory delete
  const variant = inMemoryVariants.find((v) => v.id === id);
  if (!variant) {
    const err = new Error('Variant not found');
    err.status = 404;
    throw err;
  }

  if (variant.hasOrders) {
    const err = new Error(
      'Cannot delete variant because it is referenced in existing customer orders. You may deactivate the variant instead to preserve historical records.'
    );
    err.status = 409;
    throw err;
  }

  inMemoryVariants = inMemoryVariants.filter((v) => v.id !== id);
  return true;
}

export default {
  computeStockStatus,
  formatVariant,
  getVariantsByProductId,
  getVariantById,
  createVariant,
  updateVariant,
  updateVariantStatus,
  deleteVariant,
  _getInMemoryVariants: () => inMemoryVariants,
  _getInMemoryAdjustments: () => inMemoryAdjustments,
};
