import { apiRequest } from './api';

/**
 * Banner Service for Collections by Chandni
 */

/**
 * Fetches banners (public eligible or all for admin)
 * @param {boolean} all - if true, requests all banners (requires admin token)
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
export async function getBanners(all = false) {
  const endpoint = `/api/banners${all ? '?all=true' : ''}`;
  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Fetches a single banner by ID
 * @param {string} id
 */
export async function getBannerById(id) {
  return await apiRequest(`/api/banners/${id}`, {
    method: 'GET',
  });
}

/**
 * Uploads a banner image file to the server (max 5 MB, JPEG/PNG/WebP)
 * @param {File} file
 * @returns {Promise<{ success: boolean, data: { imageUrl: string, desktopImageUrl: string, publicId: string } }>}
 */
export async function uploadBannerImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  return await apiRequest('/api/banners/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Creates a new banner
 * @param {object} bannerData
 */
export async function createBanner(bannerData) {
  return await apiRequest('/api/banners', {
    method: 'POST',
    body: JSON.stringify(bannerData),
  });
}

/**
 * Updates an existing banner
 * @param {string} id
 * @param {object} bannerData
 */
export async function updateBanner(id, bannerData) {
  return await apiRequest(`/api/banners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bannerData),
  });
}

/**
 * Toggles or updates banner active status
 * @param {string} id
 * @param {boolean} isActive
 */
export async function updateBannerStatus(id, isActive) {
  return await apiRequest(`/api/banners/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

/**
 * Reorders banners
 * @param {Array<string>} bannerIds
 */
export async function reorderBanners(bannerIds) {
  return await apiRequest('/api/banners/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ bannerIds }),
  });
}

/**
 * Deletes a banner
 * @param {string} id
 */
export async function deleteBanner(id) {
  return await apiRequest(`/api/banners/${id}`, {
    method: 'DELETE',
  });
}

export default {
  getBanners,
  getBannerById,
  uploadBannerImage,
  createBanner,
  updateBanner,
  updateBannerStatus,
  reorderBanners,
  deleteBanner,
};
