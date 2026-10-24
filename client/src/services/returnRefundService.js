import { apiRequest } from './api';

/**
 * Collections by Chandni - Return & Refund Client Service
 *
 * Implements Step 23:
 * - Customer order cancellation
 * - Customer return request submission with photo uploads
 * - Return policy retrieval
 * - Admin returns approval, rejection, and physical inspection
 * - Admin PayU online refunds & COD payout reconciliation
 * - Admin RTO receipt and restocking
 * - CSV export
 */

// ---------------------------------------------------------------------------
// CUSTOMER ACTIONS
// ---------------------------------------------------------------------------

/**
 * Retrieves the store return & cancellation policy
 */
export async function getReturnPolicy() {
  return await apiRequest('/api/account/orders/return-policy', {
    method: 'GET',
  });
}

/**
 * Customer cancels their eligible order
 * @param {string} orderId
 * @param {object} payload - { reason }
 */
export async function cancelCustomerOrder(orderId, { reason } = {}) {
  return await apiRequest(`/api/account/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Uploads evidence photo for damaged/defective items
 * @param {FormData} formData - FormData containing file(s) under 'images' or 'image'
 */
export async function uploadReturnEvidence(formData) {
  return await apiRequest('/api/account/returns/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Customer submits return request for delivered order
 * @param {string} orderId
 * @param {object} payload - { items: [{ orderItemId, productVariantId, quantity, condition }], reason, comments, evidenceImages }
 */
export async function createReturnRequest(orderId, payload) {
  return await apiRequest(`/api/account/orders/${encodeURIComponent(orderId)}/returns`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Customer fetches their return requests
 */
export async function getCustomerReturns({ page = 1, limit = 10, status } = {}) {
  const query = new URLSearchParams();
  if (page) query.append('page', page);
  if (limit) query.append('limit', limit);
  if (status) query.append('status', status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return await apiRequest(`/api/account/returns${qs}`, {
    method: 'GET',
  });
}

/**
 * Customer views single return request
 */
export async function getCustomerReturn(id) {
  return await apiRequest(`/api/account/returns/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// ADMIN ACTIONS
// ---------------------------------------------------------------------------

/**
 * Admin lists all return requests
 */
export async function getAdminReturns({ page = 1, limit = 15, status, orderNumber } = {}) {
  const query = new URLSearchParams();
  if (page) query.append('page', page);
  if (limit) query.append('limit', limit);
  if (status) query.append('status', status);
  if (orderNumber) query.append('orderNumber', orderNumber);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return await apiRequest(`/api/admin/returns${qs}`, {
    method: 'GET',
  });
}

/**
 * Admin views return request detail
 */
export async function getAdminReturn(id) {
  return await apiRequest(`/api/admin/returns/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

/**
 * Admin approves return request and books Shiprocket reverse pickup
 */
export async function approveReturnRequest(id, { notes } = {}) {
  return await apiRequest(`/api/admin/returns/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

/**
 * Admin rejects return request
 */
export async function rejectReturnRequest(id, { rejectionReason } = {}) {
  return await apiRequest(`/api/admin/returns/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionReason }),
  });
}

/**
 * Admin records physical atelier inspection and restocks inventory
 */
export async function recordReturnInspection(id, { itemInspections, inspectionNotes } = {}) {
  return await apiRequest(`/api/admin/returns/${encodeURIComponent(id)}/inspect`, {
    method: 'POST',
    body: JSON.stringify({ itemInspections, inspectionNotes }),
  });
}

/**
 * Admin processes PayU refund or records COD payout
 */
export async function processOrderRefund(orderId, { returnRequestId, refundAmount, reason, payoutDetails } = {}) {
  return await apiRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/refunds`, {
    method: 'POST',
    body: JSON.stringify({ returnRequestId, refundAmount, reason, payoutDetails }),
  });
}

/**
 * Admin retrieves all refunds for an order
 */
export async function getOrderRefunds(orderId) {
  return await apiRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/refunds`, {
    method: 'GET',
  });
}

/**
 * Admin records RTO (Return to Origin) arrival, condition inspection & inventory restock
 */
export async function processOrderRto(orderId, payload) {
  return await apiRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/rto`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export default {
  getReturnPolicy,
  cancelCustomerOrder,
  uploadReturnEvidence,
  createReturnRequest,
  getCustomerReturns,
  getCustomerReturn,
  getAdminReturns,
  getAdminReturn,
  approveReturnRequest,
  rejectReturnRequest,
  recordReturnInspection,
  processOrderRefund,
  getOrderRefunds,
  processOrderRto,
};
