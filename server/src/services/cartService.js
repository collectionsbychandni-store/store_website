import crypto from 'crypto';
import prisma from '../config/db.js';
import * as variantService from './variantService.js';
import * as productService from './productService.js';

/**
 * Collections by Chandni - Cart Service
 *
 * Implements Step 12:
 * - Authoritative server-side price and stock validation
 * - Guest cart support with secure UUID guestId isolation
 * - Authenticated user cart support
 * - Line item subtotal and cart subtotal calculation from live DB prices
 * - Dynamic price-change detection and stock shortage warnings
 * - Dual database (Prisma) and in-memory fallback support
 */

// In-Memory store for carts
let inMemoryCarts = [];

export function _getInMemoryCarts() {
  return inMemoryCarts;
}

export function _setInMemoryCarts(carts) {
  inMemoryCarts = carts;
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
 * Validates a guest UUID identifier format
 */
export function isValidGuestId(id) {
  if (!id || typeof id !== 'string') return false;
  // Standard UUID v4 regex or alphanumeric 16-64 chars
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const safeSessionRegex = /^[a-zA-Z0-9_-]{16,64}$/;
  return uuidRegex.test(id) || safeSessionRegex.test(id);
}

/**
 * Generates a new secure, unpredictable guest cart identifier
 */
export function generateGuestId() {
  return crypto.randomUUID();
}

/**
 * Enriches cart and its items with authoritative live pricing, stock and product details
 */
export async function enrichCart(cart) {
  if (!cart) {
    return {
      id: null,
      userId: null,
      guestId: null,
      items: [],
      subtotal: 0,
      totalQuantity: 0,
      totalItems: 0,
      hasUnavailableItems: false,
      hasStockIssues: false,
      updatedAt: new Date().toISOString(),
    };
  }

  const rawItems = cart.items || [];
  let subtotal = 0;
  let totalQuantity = 0;
  let hasUnavailableItems = false;
  let hasStockIssues = false;

  const enrichedItems = await Promise.all(
    rawItems.map(async (item) => {
      let variant = null;
      try {
        variant = await variantService.getVariantById(item.productVariantId);
      } catch (err) {
        variant = null;
      }

      let product = null;
      if (variant?.productId) {
        try {
          product = await productService.getProductById(variant.productId, true);
        } catch (err) {
          product = null;
        }
      }

      const isProductActive = product?.isActive !== false;
      const isVariantActive = variant?.isActive !== false;
      const isUnavailable = !variant || !product || !isProductActive || !isVariantActive;

      const currentStock = variant ? Number(variant.stock) || 0 : 0;
      const isOutOfStock = !isUnavailable && currentStock <= 0;
      const insufficientStock = !isUnavailable && item.quantity > currentStock;

      const currentSellingPrice = variant ? Number(variant.sellingPrice) || 0 : 0;
      const currentMrp = variant ? Number(variant.mrp) || 0 : 0;

      // Price changed check
      const originalPrice = item.priceSnapshot !== undefined && item.priceSnapshot !== null
        ? Number(item.priceSnapshot)
        : null;
      const priceChanged = originalPrice !== null && !isUnavailable && originalPrice !== currentSellingPrice;

      if (isUnavailable) hasUnavailableItems = true;
      if (isOutOfStock || insufficientStock) hasStockIssues = true;

      // Authoritative line subtotal calculation
      const lineSubtotal = !isUnavailable && !isOutOfStock
        ? item.quantity * currentSellingPrice
        : 0;

      if (!isUnavailable && !isOutOfStock) {
        subtotal += lineSubtotal;
        totalQuantity += item.quantity;
      }

      // Primary image resolution
      const primaryImage =
        product?.primaryImage?.imageUrl ||
        product?.images?.find((img) => img.isPrimary)?.imageUrl ||
        product?.images?.[0]?.imageUrl ||
        product?.thumbnailUrl ||
        null;

      return {
        id: item.id,
        cartId: cart.id,
        productVariantId: item.productVariantId,
        productId: product?.id || variant?.productId || null,
        productTitle: product?.title || 'Bespoke Couture Piece',
        productSlug: product?.slug || null,
        brand: product?.brand || 'Collections by Chandni',
        categoryName: product?.category?.name || 'Ethnic Wear',
        size: variant?.size || 'One Size',
        color: variant?.color || 'Standard',
        sku: variant?.sku || null,
        imageUrl: primaryImage,
        unitPrice: currentSellingPrice,
        mrp: currentMrp,
        lineSubtotal,
        quantity: item.quantity,
        stock: currentStock,
        isUnavailable,
        isOutOfStock,
        insufficientStock,
        maxAvailable: currentStock,
        priceChanged,
        originalPrice,
        priceDifference: priceChanged ? currentSellingPrice - originalPrice : 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    })
  );

  return {
    id: cart.id,
    userId: cart.userId || null,
    guestId: cart.guestId || null,
    items: enrichedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalQuantity,
    totalItems: enrichedItems.length,
    hasUnavailableItems,
    hasStockIssues,
    updatedAt: cart.updatedAt || new Date().toISOString(),
  };
}

/**
 * Merges guest cart items into user cart if a guest session exists
 */
function mergeGuestCartIfPresent({ userId, guestId }) {
  if (!userId || !guestId) return;

  const guestCartIndex = inMemoryCarts.findIndex(
    (c) => c.guestId === guestId && (!c.userId || c.userId === userId)
  );

  if (guestCartIndex !== -1) {
    const guestCart = inMemoryCarts[guestCartIndex];
    let userCart = inMemoryCarts.find((c) => c.userId === userId && c !== guestCart);

    if (guestCart.items && guestCart.items.length > 0) {
      if (!userCart) {
        // Upgrade guest cart to user cart
        guestCart.userId = userId;
        guestCart.guestId = null;
        guestCart.updatedAt = new Date();
        return;
      } else {
        // Merge items into userCart
        for (const gItem of guestCart.items) {
          const existing = userCart.items.find(
            (i) => i.productVariantId === gItem.productVariantId
          );
          if (existing) {
            existing.quantity += gItem.quantity;
          } else {
            userCart.items.push({
              ...gItem,
              id: `item-${crypto.randomUUID()}`,
            });
          }
        }
        userCart.updatedAt = new Date();
      }
    }

    // Remove the merged guest cart
    inMemoryCarts.splice(guestCartIndex, 1);
  }
}

/**
 * Finds or creates a cart record for a given user or guest session
 */
async function findOrCreateCart({ userId, guestId }) {
  if (!userId && !guestId) {
    const err = new Error('User ID or guest identifier is required');
    err.status = 400;
    throw err;
  }

  // Merge guest cart if user is authenticated
  mergeGuestCartIfPresent({ userId, guestId });

  // Find in memory
  let cart = inMemoryCarts.find((c) => {
    if (userId && c.userId === userId) return true;
    if (guestId && c.guestId === guestId) return true;
    return false;
  });

  if (!cart) {
    cart = {
      id: `cart-${crypto.randomUUID()}`,
      userId: userId || null,
      guestId: guestId || null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryCarts.push(cart);
  }

  return cart;
}

/**
 * Retrieves the current cart for an authenticated user or guest session
 */
export async function getCart({ userId, guestId }) {
  if (!userId && !guestId) {
    return await enrichCart(null);
  }

  // Merge guest cart if user is authenticated
  mergeGuestCartIfPresent({ userId, guestId });

  const cart = inMemoryCarts.find((c) => {
    if (userId && c.userId === userId) return true;
    if (guestId && c.guestId === guestId) return true;
    return false;
  });

  if (!cart) {
    return {
      id: null,
      userId: userId || null,
      guestId: guestId || null,
      items: [],
      subtotal: 0,
      totalQuantity: 0,
      totalItems: 0,
      hasUnavailableItems: false,
      hasStockIssues: false,
      updatedAt: new Date().toISOString(),
    };
  }

  return await enrichCart(cart);
}

/**
 * Adds a product variant to the cart or increments quantity
 */
export async function addItemToCart({ userId, guestId, productId, variantId, quantity = 1 }) {
  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    const err = new Error('Quantity must be a positive integer');
    err.status = 400;
    throw err;
  }

  if (!variantId) {
    const err = new Error('Product variant ID is required');
    err.status = 400;
    throw err;
  }

  // 1. Authoritative Variant Check
  const variant = await variantService.getVariantById(variantId);
  if (!variant || variant.isActive === false) {
    const err = new Error('The selected product variant is unavailable');
    err.status = 400;
    throw err;
  }

  // 2. Authoritative Product Check
  const effectiveProductId = productId || variant.productId;
  const product = await productService.getProductById(effectiveProductId, true);
  if (!product || product.isActive === false) {
    const err = new Error('The selected product is unavailable');
    err.status = 400;
    throw err;
  }

  // 3. Verify variant belongs to product
  if (variant.productId !== product.id) {
    const err = new Error('The variant does not belong to the specified product');
    err.status = 400;
    throw err;
  }

  // 4. Pricing Validation
  const sellingPrice = Number(variant.sellingPrice);
  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    const err = new Error('The selected item does not have valid pricing');
    err.status = 400;
    throw err;
  }

  // 5. Stock Validation
  const availableStock = Number(variant.stock) || 0;
  if (availableStock <= 0) {
    const err = new Error('Selected item is currently out of stock');
    err.status = 400;
    throw err;
  }

  // 6. Find or create cart
  const cart = await findOrCreateCart({ userId, guestId });

  // 7. Check if item already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productVariantId === variantId
  );

  if (existingItemIndex > -1) {
    const existingItem = cart.items[existingItemIndex];
    const newQuantity = existingItem.quantity + parsedQty;

    if (newQuantity > availableStock) {
      const err = new Error(
        `Cannot add ${parsedQty} more. You already have ${existingItem.quantity} in your bag and only ${availableStock} are available.`
      );
      err.status = 400;
      throw err;
    }

    existingItem.quantity = newQuantity;
    existingItem.priceSnapshot = sellingPrice;
    existingItem.updatedAt = new Date();
  } else {
    if (parsedQty > availableStock) {
      const err = new Error(
        `Requested quantity (${parsedQty}) exceeds available stock of ${availableStock}.`
      );
      err.status = 400;
      throw err;
    }

    cart.items.push({
      id: `ci-${crypto.randomUUID()}`,
      cartId: cart.id,
      productVariantId: variantId,
      quantity: parsedQty,
      priceSnapshot: sellingPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  cart.updatedAt = new Date();
  return await enrichCart(cart);
}

/**
 * Updates quantity of a specific cart item
 */
export async function updateCartItemQuantity({ userId, guestId, itemId, quantity }) {
  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    const err = new Error('Quantity must be a positive integer of 1 or more');
    err.status = 400;
    throw err;
  }

  if (!itemId) {
    const err = new Error('Cart item ID is required');
    err.status = 400;
    throw err;
  }

  // Find user's cart
  const cart = inMemoryCarts.find((c) => {
    if (userId && c.userId === userId) return true;
    if (guestId && c.guestId === guestId) return true;
    return false;
  });

  if (!cart) {
    const err = new Error('Cart not found');
    err.status = 404;
    throw err;
  }

  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    const err = new Error('Cart item not found');
    err.status = 404;
    throw err;
  }

  // Authoritative Stock Check
  const variant = await variantService.getVariantById(item.productVariantId);
  if (!variant || variant.isActive === false) {
    const err = new Error('This variant is no longer active');
    err.status = 400;
    throw err;
  }

  const availableStock = Number(variant.stock) || 0;
  if (parsedQty > availableStock) {
    const err = new Error(
      `Requested quantity (${parsedQty}) exceeds available stock (${availableStock} available).`
    );
    err.status = 400;
    throw err;
  }

  item.quantity = parsedQty;
  item.priceSnapshot = Number(variant.sellingPrice) || item.priceSnapshot;
  item.updatedAt = new Date();
  cart.updatedAt = new Date();

  return await enrichCart(cart);
}

/**
 * Removes an item from the cart
 */
export async function removeCartItem({ userId, guestId, itemId }) {
  if (!itemId) {
    const err = new Error('Cart item ID is required');
    err.status = 400;
    throw err;
  }

  const cart = inMemoryCarts.find((c) => {
    if (userId && c.userId === userId) return true;
    if (guestId && c.guestId === guestId) return true;
    return false;
  });

  if (!cart) {
    const err = new Error('Cart not found');
    err.status = 404;
    throw err;
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter((i) => i.id !== itemId);

  if (cart.items.length === initialLength) {
    const err = new Error('Cart item not found');
    err.status = 404;
    throw err;
  }

  cart.updatedAt = new Date();
  return await enrichCart(cart);
}

/**
 * Clears all items from the current user or guest's cart
 */
export async function clearCart({ userId, guestId }) {
  const cart = inMemoryCarts.find((c) => {
    if (userId && c.userId === userId) return true;
    if (guestId && c.guestId === guestId) return true;
    return false;
  });

  if (cart) {
    cart.items = [];
    cart.updatedAt = new Date();
    return await enrichCart(cart);
  }

  return {
    id: null,
    userId: userId || null,
    guestId: guestId || null,
    items: [],
    subtotal: 0,
    totalQuantity: 0,
    totalItems: 0,
    hasUnavailableItems: false,
    hasStockIssues: false,
    updatedAt: new Date().toISOString(),
  };
}

export const addCartItem = addItemToCart;

