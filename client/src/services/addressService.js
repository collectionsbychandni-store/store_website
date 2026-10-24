import { apiRequest } from './api';

/**
 * Customer Address Service for Collections by Chandni
 * Interfaces with /api/account/addresses endpoints.
 */

/**
 * Fetches all saved addresses for the authenticated customer
 * @returns {Promise<{ success: boolean, data: Array<object> }>}
 */
export async function getAddresses() {
  return await apiRequest('/api/account/addresses', {
    method: 'GET',
  });
}

/**
 * Fetches a single address by ID
 * @param {string} id
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getAddress(id) {
  return await apiRequest(`/api/account/addresses/${id}`, {
    method: 'GET',
  });
}

/**
 * Creates a new delivery address
 * @param {object} addressData
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function createAddress(addressData) {
  return await apiRequest('/api/account/addresses', {
    method: 'POST',
    body: JSON.stringify(addressData),
  });
}

/**
 * Updates an existing address
 * @param {string} id
 * @param {object} addressData
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateAddress(id, addressData) {
  return await apiRequest(`/api/account/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(addressData),
  });
}

/**
 * Deletes an address
 * @param {string} id
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deleteAddress(id) {
  return await apiRequest(`/api/account/addresses/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Sets an address as the customer's primary default address
 * @param {string} id
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function setDefaultAddress(id) {
  return await apiRequest(`/api/account/addresses/${id}/default`, {
    method: 'PATCH',
  });
}

export default {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
