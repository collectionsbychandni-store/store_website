import { apiRequest } from './api';

/**
 * Product API Service for Collections by Chandni
 */

/**
 * Fetches paginated products with optional search, category, status, and featured filters
 * @param {object} params - { search, categoryId, size, color, minPrice, maxPrice, availability, isActive, featured, page, limit, sortBy, sortOrder }
 * @returns {Promise<{ success: boolean, data: Array, pagination: object }>}
 */
export async function getProducts(params = {}) {
  const query = new URLSearchParams();

  if (params.search) query.append('search', params.search);
  if (params.categoryId) query.append('categoryId', params.categoryId);
  if (params.size) query.append('size', params.size);
  if (params.color) query.append('color', params.color);
  if (params.minPrice !== undefined && params.minPrice !== '') query.append('minPrice', params.minPrice);
  if (params.maxPrice !== undefined && params.maxPrice !== '') query.append('maxPrice', params.maxPrice);
  if (params.availability && params.availability !== 'all') query.append('availability', params.availability);
  if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
  if (params.featured !== undefined && params.featured !== '') query.append('featured', params.featured);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const endpoint = `/api/products${queryString ? `?${queryString}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Fetches product filter metadata (available sizes, colors, price range bounds, active categories)
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getProductFilterOptions() {
  return await apiRequest('/api/products/filter-options', {
    method: 'GET',
  });
}

/**
 * Fetches a single product by ID or slug
 * @param {string} id
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getProductById(id) {
  return await apiRequest(`/api/products/${id}`, {
    method: 'GET',
  });
}

/**
 * Fetches a single product by slug
 * @param {string} slug
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getProductBySlug(slug) {
  return await apiRequest(`/api/products/${slug}`, {
    method: 'GET',
  });
}

/**
 * Creates a new product
 * @param {object} data - { title, description, categoryId, brand, featured, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function createProduct(data) {
  return await apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing product
 * @param {string} id
 * @param {object} data - { title, description, categoryId, brand, featured, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateProduct(id, data) {
  return await apiRequest(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Activates or deactivates a product
 * @param {string} id
 * @param {boolean} isActive
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateProductStatus(id, isActive) {
  return await apiRequest(`/api/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

/**
 * Deletes a product safely
 * @param {string} id
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deleteProduct(id) {
  return await apiRequest(`/api/products/${id}`, {
    method: 'DELETE',
  });
}

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};
