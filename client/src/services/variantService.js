import { apiRequest } from './api';

/**
 * Product Variant Service for Collections by Chandni
 */

/**
 * Fetches all variants for a given product
 * @param {string} productId
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
export async function getVariantsByProductId(productId) {
  return await apiRequest(`/api/products/${productId}/variants`, {
    method: 'GET',
  });
}

/**
 * Fetches a single variant by ID
 * @param {string} id
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getVariantById(id) {
  return await apiRequest(`/api/variants/${id}`, {
    method: 'GET',
  });
}

/**
 * Creates a new variant for a product
 * @param {string} productId
 * @param {object} data - { size, color, sku, mrp, sellingPrice, stock, lowStockThreshold, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function createVariant(productId, data) {
  return await apiRequest(`/api/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing variant
 * @param {string} id
 * @param {object} data - { size, color, sku, mrp, sellingPrice, stock, lowStockThreshold, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateVariant(id, data) {
  return await apiRequest(`/api/variants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Activates or deactivates a variant
 * @param {string} id
 * @param {boolean} isActive
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateVariantStatus(id, isActive) {
  return await apiRequest(`/api/variants/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

/**
 * Deletes a variant safely (fails with 409 if ordered)
 * @param {string} id
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deleteVariant(id) {
  return await apiRequest(`/api/variants/${id}`, {
    method: 'DELETE',
  });
}

export default {
  getVariantsByProductId,
  getVariantById,
  createVariant,
  updateVariant,
  updateVariantStatus,
  deleteVariant,
};
