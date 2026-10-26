import { apiRequest, getStoredToken } from './api';

/**
 * Inventory Service for Collections by Chandni
 */

/**
 * Fetches inventory items across products with filtering & search
 * @param {object} params - { search, productId, categoryId, stockStatus, page, limit, sortBy, sortOrder }
 * @returns {Promise<{ success: boolean, data: Array, summary: object, pagination: object }>}
 */
export async function getInventory(params = {}) {
  const query = new URLSearchParams();

  if (params.search) query.append('search', params.search);
  if (params.productId) query.append('productId', params.productId);
  if (params.categoryId) query.append('categoryId', params.categoryId);
  if (params.stockStatus && params.stockStatus !== 'ALL') query.append('stockStatus', params.stockStatus);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const endpoint = `/api/inventory${queryString ? `?${queryString}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Fetches low-stock and out-of-stock operational alerts
 * @param {object} params - { search, categoryId, stockStatus: 'ALL_ALERTS'|'LOW_STOCK'|'OUT_OF_STOCK', page, limit, sortBy, sortOrder }
 */
export async function getLowStockAlerts(params = {}) {
  const query = new URLSearchParams();

  if (params.search) query.append('search', params.search);
  if (params.categoryId) query.append('categoryId', params.categoryId);
  if (params.stockStatus && params.stockStatus !== 'ALL_ALERTS') query.append('stockStatus', params.stockStatus);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const endpoint = `/api/inventory/alerts${queryString ? `?${queryString}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Fetches comprehensive inventory reports by product, by category & health summaries
 * @param {object} params - { categoryId }
 */
export async function getInventoryReports(params = {}) {
  const query = new URLSearchParams();
  if (params.categoryId) query.append('categoryId', params.categoryId);

  const queryString = query.toString();
  const endpoint = `/api/inventory/reports${queryString ? `?${queryString}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Fetches inventory adjustment audit records
 * @param {object} params - { variantId, search, page, limit }
 */
export async function getAdjustments(params = {}) {
  const query = new URLSearchParams();
  if (params.variantId) query.append('variantId', params.variantId);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/inventory/adjustments${queryString ? `?${queryString}` : ''}`;

  return await apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Adjusts stock quantity for a variant with audit reason
 * @param {string} variantId
 * @param {object} data - { mode: 'SET'|'INCREASE'|'DECREASE', quantity, reason }
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export async function adjustStock(variantId, data) {
  return await apiRequest(`/api/variants/${variantId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Client-side CSV cell sanitizer protecting against spreadsheet formula injection (CWE-1236)
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value).replace(/\r\n|\r|\n/g, ' ');
  // If first character is formula trigger (=, +, -, @, \t), prepend a single quote
  if (/^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Triggers browser download of a CSV blob with filename
 */
export function triggerFileDownload(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports records to CSV directly in browser with formula sanitization
 */
export function exportRecordsToCsv(records = [], customFilename) {
  const today = new Date().toISOString().split('T')[0];
  const filename = customFilename || `collections-by-chandni-inventory-${today}.csv`;

  const headers = [
    'Product Name',
    'Category',
    'SKU',
    'Size',
    'Color',
    'MRP (INR)',
    'Selling Price (INR)',
    'Available Stock',
    'Low-Stock Threshold',
    'Stock Status',
  ];

  const rows = [headers.map(sanitizeCsvCell).join(',')];

  for (const item of records) {
    const row = [
      sanitizeCsvCell(item.productTitle),
      sanitizeCsvCell(item.categoryName),
      sanitizeCsvCell(item.sku),
      sanitizeCsvCell(item.size),
      sanitizeCsvCell(item.color),
      sanitizeCsvCell(item.mrp !== null && item.mrp !== undefined ? Number(item.mrp).toFixed(2) : ''),
      sanitizeCsvCell(item.sellingPrice !== null && item.sellingPrice !== undefined ? Number(item.sellingPrice).toFixed(2) : ''),
      sanitizeCsvCell(item.stock),
      sanitizeCsvCell(item.lowStockThreshold),
      sanitizeCsvCell(item.stockStatus),
    ];
    rows.push(row.join(','));
  }

  const csvContent = '\uFEFF' + rows.join('\r\n'); // Add UTF-8 BOM for Excel
  triggerFileDownload(csvContent, filename);
  return { success: true, count: records.length, filename };
}

/**
 * Downloads inventory CSV using server endpoint
 */
export async function downloadInventoryCsvFromServer(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.productId) query.append('productId', params.productId);
  if (params.categoryId) query.append('categoryId', params.categoryId);
  if (params.stockStatus && params.stockStatus !== 'ALL') query.append('stockStatus', params.stockStatus);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const token = getStoredToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/inventory/export-csv?${query.toString()}`, { credentials: 'same-origin', headers });
  if (!res.ok) {
    throw new Error('Failed to download CSV from server');
  }

  const today = new Date().toISOString().split('T')[0];
  const filename = `collections-by-chandni-inventory-${today}.csv`;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  getInventory,
  getLowStockAlerts,
  getInventoryReports,
  getAdjustments,
  adjustStock,
  sanitizeCsvCell,
  triggerFileDownload,
  exportRecordsToCsv,
  downloadInventoryCsvFromServer,
};
