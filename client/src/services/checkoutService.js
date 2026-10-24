import { apiRequest } from './api';

/**
 * Checkout & Order Service for Collections by Chandni
 * Interfaces with /api/checkout endpoints.
 */

/**
 * Retrieves the current checkout summary with live cart calculation and default address
 * @param {string} [addressId]
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getCheckoutSummary(addressId) {
  const query = addressId ? `?addressId=${encodeURIComponent(addressId)}` : '';
  return await apiRequest(`/api/checkout/summary${query}`, {
    method: 'GET',
  });
}

/**
 * Validates checkout items and address on the server
 * @param {object} params - { addressId, inlineAddress }
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function validateCheckout({ addressId, inlineAddress } = {}) {
  return await apiRequest('/api/checkout/validate', {
    method: 'POST',
    body: JSON.stringify({ addressId, inlineAddress }),
  });
}

/**
 * Prepares the order transactionally with immutable snapshots and chosen payment method (PayU / COD)
 * @param {object} params - { addressId, inlineAddress, idempotencyKey, notes, paymentMethod }
 * @returns {Promise<{ success: boolean, message: string, data: object, orderNumber: string, paymentMethod: string, payuParams?: object }>}
 */
export async function prepareOrder({
  addressId,
  inlineAddress,
  idempotencyKey,
  notes,
  paymentMethod,
} = {}) {
  return await apiRequest('/api/checkout/prepare', {
    method: 'POST',
    body: JSON.stringify({ addressId, inlineAddress, idempotencyKey, notes, paymentMethod }),
  });
}

/**
 * Initiates or generates PayU Hosted Checkout parameters for an existing order
 * @param {string} orderIdentifier
 * @returns {Promise<{ success: boolean, order: object, payuParams: object }>}
 */
export async function initiatePayUPayment(orderIdentifier) {
  return await apiRequest('/api/checkout/payu/initiate', {
    method: 'POST',
    body: JSON.stringify({ orderIdentifier }),
  });
}

/**
 * Authoritatively verifies order payment status
 * @param {string} orderNumber
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function verifyPaymentStatus(orderNumber) {
  return await apiRequest(`/api/checkout/payu/verify/${encodeURIComponent(orderNumber)}`, {
    method: 'GET',
  });
}

/**
 * Simulates PayU payment outcome for test sandbox environments
 * @param {object} params - { orderNumber, outcome, paymentMode }
 * @returns {Promise<object>}
 */
export async function simulatePaymentOutcome({ orderNumber, outcome = 'success', paymentMode = 'UPI' }) {
  return await apiRequest('/api/checkout/payu/simulate', {
    method: 'POST',
    body: JSON.stringify({ orderNumber, outcome, paymentMode }),
  });
}

/**
 * Retrieves an order by order number for the authenticated user
 * @param {string} orderNumber
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getOrder(orderNumber) {
  return await apiRequest(`/api/checkout/orders/${encodeURIComponent(orderNumber)}`, {
    method: 'GET',
  });
}

export default {
  getCheckoutSummary,
  validateCheckout,
  prepareOrder,
  initiatePayUPayment,
  verifyPaymentStatus,
  simulatePaymentOutcome,
  getOrder,
};
