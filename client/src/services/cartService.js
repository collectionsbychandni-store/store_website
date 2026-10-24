import { apiRequest } from './api';

/**
 * Client Cart API Service for Collections by Chandni
 * Communicates with /api/cart backend endpoints.
 */

/**
 * Fetches the current user or guest cart
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getCart() {
  return await apiRequest('/api/cart', {
    method: 'GET',
  });
}

/**
 * Adds an item (product variant) to the cart
 * @param {object} params - { productId, variantId, quantity }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function addCartItem({ productId, variantId, quantity = 1 }) {
  return await apiRequest('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, variantId, quantity }),
  });
}

/**
 * Updates quantity of an existing cart item
 * @param {string} itemId
 * @param {number} quantity
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateCartItem(itemId, quantity) {
  return await apiRequest(`/api/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

/**
 * Removes a cart item
 * @param {string} itemId
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function removeCartItem(itemId) {
  return await apiRequest(`/api/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Clears the current cart
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function clearCart() {
  return await apiRequest('/api/cart', {
    method: 'DELETE',
  });
}

export default {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
