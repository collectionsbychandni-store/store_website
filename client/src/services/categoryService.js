import { apiRequest } from './api';

/**
 * Category API Service for Collections by Chandni
 */

/**
 * Fetches paginated categories with optional search and filters
 * @param {object} params - { search, page, limit, isActive, parentId }
 * @returns {Promise<{ success: boolean, data: Array, pagination: object }>}
 */
export async function getCategories(params = {}) {
  const query = new URLSearchParams();

  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
  if (params.parentId !== undefined && params.parentId !== '') query.append('parentId', params.parentId);

  const queryString = query.toString();
  const endpoint = `/api/categories${queryString ? `?${queryString}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Fetches a single category by ID
 * @param {string} id
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getCategoryById(id) {
  return await apiRequest(`/api/categories/${id}`, {
    method: 'GET',
  });
}

/**
 * Creates a new category
 * @param {object} data - { name, description, imageUrl, parentId, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function createCategory(data) {
  return await apiRequest('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing category
 * @param {string} id
 * @param {object} data - { name, description, imageUrl, parentId, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateCategory(id, data) {
  return await apiRequest(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Activates or deactivates a category
 * @param {string} id
 * @param {boolean} isActive
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateCategoryStatus(id, isActive) {
  return await apiRequest(`/api/categories/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

/**
 * Deletes a category
 * @param {string} id
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deleteCategory(id) {
  return await apiRequest(`/api/categories/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Uploads a category image file to the server (max 5 MB, JPEG/PNG/WebP)
 * @param {File} file
 * @returns {Promise<{ success: boolean, data: { imageUrl: string, publicId?: string } }>}
 */
export async function uploadCategoryImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  return await apiRequest('/api/categories/upload', {
    method: 'POST',
    body: formData,
  });
}

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  uploadCategoryImage,
};

