import { apiRequest } from './api';

/**
 * Order Service for Collections by Chandni
 * Interfaces with customer order history and administrative order management.
 */

// ---------------------------------------------------------------------------
// CUSTOMER ORDER API CALLS
// ---------------------------------------------------------------------------

/**
 * Fetches paginated order history for the authenticated customer
 * @param {object} params - { page, limit, status }
 * @returns {Promise<{ success: boolean, data: Array<object>, pagination: object }>}
 */
export async function getCustomerOrders({ page = 1, limit = 10, status } = {}) {
  const query = new URLSearchParams();
  if (page) query.append('page', page);
  if (limit) query.append('limit', limit);
  if (status) query.append('status', status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return await apiRequest(`/api/account/orders${qs}`, {
    method: 'GET',
  });
}

/**
 * Fetches single order details for the authenticated customer
 * @param {string} id - Order ID or Order Number
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getCustomerOrder(id) {
  return await apiRequest(`/api/account/orders/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// ADMIN ORDER MANAGEMENT API CALLS
// ---------------------------------------------------------------------------

/**
 * Fetches paginated, searchable, filterable orders for administrators
 * @param {object} params - { page, limit, search, status, paymentStatus, startDate, endDate }
 * @returns {Promise<{ success: boolean, data: Array<object>, pagination: object }>}
 */
export async function getAdminOrders({
  page = 1,
  limit = 15,
  search,
  status,
  paymentStatus,
  startDate,
  endDate,
} = {}) {
  const query = new URLSearchParams();
  if (page) query.append('page', page);
  if (limit) query.append('limit', limit);
  if (search) query.append('search', search);
  if (status) query.append('status', status);
  if (paymentStatus) query.append('paymentStatus', paymentStatus);
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return await apiRequest(`/api/admin/orders${qs}`, {
    method: 'GET',
  });
}

/**
 * Fetches detailed order information for administrators
 * @param {string} id
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getAdminOrder(id) {
  return await apiRequest(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

/**
 * Updates order fulfillment status (Admin only)
 * @param {string} id
 * @param {object} payload - { status, note }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateOrderStatus(id, { status, note, isInternalNote } = {}) {
  return await apiRequest(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note, isInternalNote }),
  });
}

/**
 * Updates order payment status (Admin only)
 * @param {string} id
 * @param {object} payload - { paymentStatus, note }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function updateOrderPaymentStatus(id, { paymentStatus, note } = {}) {
  return await apiRequest(`/api/admin/orders/${encodeURIComponent(id)}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentStatus, note }),
  });
}

export default {
  getCustomerOrders,
  getCustomerOrder,
  getAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
};
