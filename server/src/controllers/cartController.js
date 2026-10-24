import * as cartService from '../services/cartService.js';

/**
 * Controller for Shopping Cart Endpoints
 * Supports both authenticated users and guest sessions.
 */

/**
 * Helper to resolve cart session (userId or guestId) and set response headers
 */
function resolveSession(req, res) {
  const userId = req.user?.id || null;
  let guestId = req.headers['x-cart-session-id'] || req.headers['x-guest-cart-id'] || null;

  if (typeof guestId === 'string') {
    guestId = guestId.trim();
  }

  // If user is guest and no valid guestId supplied, generate a new secure UUID
  if (!userId && (!guestId || !cartService.isValidGuestId(guestId))) {
    guestId = cartService.generateGuestId();
  }

  if (guestId) {
    res.setHeader('X-Cart-Session-Id', guestId);
    res.setHeader('Access-Control-Expose-Headers', 'X-Cart-Session-Id');
  }

  return { userId, guestId };
}

/**
 * GET /api/cart
 * Returns the current guest or authenticated customer's cart
 */
export async function getCart(req, res, next) {
  try {
    const { userId, guestId } = resolveSession(req, res);
    const cart = await cartService.getCart({ userId, guestId });

    return res.status(200).json({
      success: true,
      data: cart,
      guestId,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving cart',
    });
  }
}

/**
 * POST /api/cart/items
 * Adds a product variant to the cart or increments quantity
 */
export async function addCartItem(req, res, next) {
  try {
    const { userId, guestId } = resolveSession(req, res);
    const { productId, variantId, quantity = 1 } = req.body || {};

    if (!variantId) {
      return res.status(400).json({
        success: false,
        message: 'Product variant ID is required',
      });
    }

    const cart = await cartService.addItemToCart({
      userId,
      guestId,
      productId,
      variantId,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: 'Item added to shopping bag successfully',
      data: cart,
      guestId,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error adding item to cart',
    });
  }
}

/**
 * PATCH /api/cart/items/:id
 * Updates an existing cart item's quantity
 */
export async function updateCartItem(req, res, next) {
  try {
    const { userId, guestId } = resolveSession(req, res);
    const { id } = req.params;
    const { quantity } = req.body || {};

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required',
      });
    }

    const cart = await cartService.updateCartItemQuantity({
      userId,
      guestId,
      itemId: id,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: cart,
      guestId,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating cart item',
    });
  }
}

/**
 * DELETE /api/cart/items/:id
 * Removes a cart item
 */
export async function removeCartItem(req, res, next) {
  try {
    const { userId, guestId } = resolveSession(req, res);
    const { id } = req.params;

    const cart = await cartService.removeCartItem({
      userId,
      guestId,
      itemId: id,
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from shopping bag',
      data: cart,
      guestId,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error removing cart item',
    });
  }
}

/**
 * DELETE /api/cart
 * Clears the current cart
 */
export async function clearCart(req, res, next) {
  try {
    const { userId, guestId } = resolveSession(req, res);
    const cart = await cartService.clearCart({ userId, guestId });

    return res.status(200).json({
      success: true,
      message: 'Shopping bag cleared successfully',
      data: cart,
      guestId,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error clearing cart',
    });
  }
}
