import { apiRequest } from './api';

/**
 * Product Image Management Client Service
 */

/**
 * Fetches all images for a specific product in display order
 * @param {string} productId
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
export async function getProductImages(productId) {
  return await apiRequest(`/api/products/${productId}/images`, {
    method: 'GET',
  });
}

/**
 * Uploads one or more images for a product
 * @param {string} productId
 * @param {File[]|FileList} files
 * @param {string[]} altTexts
 * @returns {Promise<{ success: boolean, message: string, data: Array }>}
 */
export async function uploadProductImages(productId, files, altTexts = []) {
  const formData = new FormData();

  const fileArray = Array.from(files);
  fileArray.forEach((file) => {
    formData.append('images', file);
  });

  if (altTexts && altTexts.length > 0) {
    formData.append('altTexts', JSON.stringify(altTexts));
  }

  return await apiRequest(`/api/products/${productId}/images`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Reorders product images
 * @param {string} productId
 * @param {string[]} imageIds - Array of image IDs in desired display order
 * @returns {Promise<{ success: boolean, message: string, data: Array }>}
 */
export async function reorderProductImages(productId, imageIds) {
  return await apiRequest(`/api/products/${productId}/images/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ imageIds }),
  });
}

/**
 * Designates an image as the primary image for a product
 * @param {string} productId
 * @param {string} imageId
 * @returns {Promise<{ success: boolean, message: string, data: Array }>}
 */
export async function setPrimaryImage(productId, imageId) {
  return await apiRequest(`/api/products/${productId}/images/${imageId}/primary`, {
    method: 'PATCH',
  });
}

/**
 * Updates the alt text description of an image
 * @param {string} productId
 * @param {string} imageId
 * @param {string} altText
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateImageAltText(productId, imageId, altText) {
  return await apiRequest(`/api/products/${productId}/images/${imageId}/alt`, {
    method: 'PATCH',
    body: JSON.stringify({ altText }),
  });
}

/**
 * Deletes an image from storage and database
 * @param {string} productId
 * @param {string} imageId
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deleteProductImage(productId, imageId) {
  return await apiRequest(`/api/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
  });
}

/**
 * Fetches storage provider status and configuration details
 * @returns {Promise<{ success: boolean, data: { configured: boolean, cloudName: string, maxFileSizeMB: number, maxImagesPerProduct: number } }>}
 */
export async function getStorageStatus() {
  return await apiRequest('/api/products/storage/status', {
    method: 'GET',
  });
}

export default {
  getProductImages,
  uploadProductImages,
  reorderProductImages,
  setPrimaryImage,
  updateImageAltText,
  deleteProductImage,
  getStorageStatus,
};
