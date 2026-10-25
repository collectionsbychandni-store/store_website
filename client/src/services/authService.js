import { apiRequest } from './api';

/**
 * Authentication & Account service for Collections by Chandni
 */

/**
 * Registers a new customer account
 * @param {object} data - { name, email, password, phone }
 * @returns {Promise<{ success: boolean, message: string, data: { token: string, user: object } }>}
 */
export async function registerCustomer({ name, email, password, phone }) {
  return await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone }),
  });
}

/**
 * Performs customer login
 * @param {object} credentials - { email, password }
 * @returns {Promise<{ success: boolean, message: string, data: { token: string, user: object } }>}
 */
export async function loginCustomer({ email, password }) {
  return await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Performs admin login (dedicated admin endpoint)
 * @param {object} credentials - { email, password }
 * @returns {Promise<{ success: boolean, message: string, data: { token: string, user: object } }>}
 */
export async function loginAdmin({ email, password }) {
  return await apiRequest('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Fetches currently authenticated user profile
 * @returns {Promise<{ success: boolean, data: { id: string, name: string, email: string, phone: string, role: string, createdAt: string } }>}
 */
export async function getMe() {
  return await apiRequest('/api/auth/me', {
    method: 'GET',
  });
}

/**
 * Updates customer profile (name, phone)
 * @param {object} profileData - { name, phone }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateProfile(profileData) {
  return await apiRequest('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

/**
 * Changes password for authenticated user (admin or customer)
 * @param {object} passwordData - { currentPassword, newPassword, confirmPassword }
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  return await apiRequest('/api/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
}

/**
 * Requests backend logout
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function logout() {
  return await apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

export default {
  registerCustomer,
  loginCustomer,
  loginAdmin,
  getMe,
  updateProfile,
  changePassword,
  logout,
};
