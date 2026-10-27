import { apiRequest } from './api';

/**
 * Point of Sale (POS) API Client Service for Collections by Chandni
 * All endpoints require Admin Authentication (JWT token automatically injected)
 */

/**
 * Search products and available variants for POS cashier counter
 * @param {object} params - { search, categoryId, inStockOnly }
 */
export async function searchPosProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search.trim());
  if (params.categoryId) query.append('categoryId', params.categoryId.trim());
  if (params.inStockOnly) query.append('inStockOnly', 'true');

  const queryString = query.toString();
  return await apiRequest(`/api/admin/pos/products${queryString ? `?${queryString}` : ''}`);
}

/**
 * Search registered customers by phone, email, or name
 * @param {string} q
 */
export async function searchPosCustomers(q = '') {
  const query = new URLSearchParams();
  if (q && q.trim()) query.append('q', q.trim());
  const queryString = query.toString();
  return await apiRequest(`/api/admin/pos/customers${queryString ? `?${queryString}` : ''}`);
}

/**
 * Finalize in-store checkout
 * @param {object} saleData - { items, customer, paymentMethod, discountType, discountValue, taxRate, cashTendered, notes, idempotencyKey }
 */
export async function createPosSale(saleData) {
  return await apiRequest('/api/admin/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(saleData),
  });
}

/**
 * Get recent POS bills list
 * @param {object} params - { page, limit, search, date, paymentMethod }
 */
export async function getPosBills(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search.trim());
  if (params.date) query.append('date', params.date);
  if (params.paymentMethod) query.append('paymentMethod', params.paymentMethod);

  const queryString = query.toString();
  return await apiRequest(`/api/admin/pos/bills${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get single POS bill for inspection/reprint
 * @param {string} idOrOrderNumber
 */
export async function getPosBillById(idOrOrderNumber) {
  return await apiRequest(`/api/admin/pos/bills/${encodeURIComponent(idOrOrderNumber)}`);
}

/**
 * Get store configuration & receipt details
 */
export async function getPosConfig() {
  return await apiRequest('/api/admin/pos/config');
}

export default {
  searchPosProducts,
  searchPosCustomers,
  createPosSale,
  getPosBills,
  getPosBillById,
  getPosConfig,
};
