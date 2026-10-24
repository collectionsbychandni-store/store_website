import { apiRequest } from './api';

/**
 * Customer Service for Collections by Chandni
 * All operations require Admin Authentication
 */

/**
 * Retrieves paginated customers with search and filters
 * @param {object} params - { search, status, startDate, endDate, page, limit, sortBy, sortOrder }
 */
export async function getCustomers(params = {}) {
  const query = new URLSearchParams();

  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const endpoint = `/api/admin/customers${queryString ? `?${queryString}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Retrieves store customer KPI summary metrics
 */
export async function getCustomerStats() {
  return await apiRequest('/api/admin/customers/stats', {
    method: 'GET',
  });
}

/**
 * Retrieves detailed customer profile by ID (including saved addresses & orders)
 * @param {string} id
 */
export async function getCustomerById(id) {
  return await apiRequest(`/api/admin/customers/${id}`, {
    method: 'GET',
  });
}

/**
 * Retrieves orders placed by a customer
 * @param {string} id
 */
export async function getCustomerOrders(id) {
  return await apiRequest(`/api/admin/customers/${id}/orders`, {
    method: 'GET',
  });
}

/**
 * Activates or deactivates a customer account
 * @param {string} id
 * @param {boolean} isActive
 */
export async function updateCustomerStatus(id, isActive) {
  return await apiRequest(`/api/admin/customers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export default {
  getCustomers,
  getCustomerStats,
  getCustomerById,
  getCustomerOrders,
  updateCustomerStatus,
};
