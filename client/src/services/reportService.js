import { apiRequest } from './api';

/**
 * Report Service for Collections by Chandni
 * All operations require Admin Authentication
 */

/**
 * Fetches high-level sales KPI summary
 * @param {object} params - { preset: 'today'|'7d'|'30d'|'this_month'|'last_month'|'custom', startDate, endDate }
 */
export async function getSalesSummary(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.append('preset', params.preset);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const endpoint = `/api/admin/reports/sales-summary?${query.toString()}`;
  return await apiRequest(endpoint, { method: 'GET' });
}

/**
 * Fetches time-series daily trend data for charting
 * @param {object} params
 */
export async function getSalesTrends(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.append('preset', params.preset);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const endpoint = `/api/admin/reports/sales-trends?${query.toString()}`;
  return await apiRequest(endpoint, { method: 'GET' });
}

/**
 * Fetches best-selling products report
 * @param {object} params - { preset, startDate, endDate, page, limit, sortBy, sortOrder }
 */
export async function getProductPerformance(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.append('preset', params.preset);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const endpoint = `/api/admin/reports/products?${query.toString()}`;
  return await apiRequest(endpoint, { method: 'GET' });
}

/**
 * Fetches sales grouped by category
 * @param {object} params
 */
export async function getCategoryPerformance(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.append('preset', params.preset);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const endpoint = `/api/admin/reports/categories?${query.toString()}`;
  return await apiRequest(endpoint, { method: 'GET' });
}

/**
 * Fetches order status, payment status, and payment method distribution
 * @param {object} params
 */
export async function getOrderBreakdown(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.append('preset', params.preset);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const endpoint = `/api/admin/reports/order-breakdown?${query.toString()}`;
  return await apiRequest(endpoint, { method: 'GET' });
}

/**
 * Fetches customer acquisition & repeat patron metrics
 * @param {object} params
 */
export async function getCustomerMetrics(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.append('preset', params.preset);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const endpoint = `/api/admin/reports/customer-metrics?${query.toString()}`;
  return await apiRequest(endpoint, { method: 'GET' });
}

/**
 * Downloads report as an RFC 4180 CSV file from the server
 * @param {string} reportType - 'sales-summary' | 'products' | 'categories' | 'order-breakdown'
 * @param {object} params
 */
export async function downloadReportCsv(reportType = 'sales-summary', params = {}) {
  const query = new URLSearchParams();
  query.append('reportType', reportType);
  if (params.preset) query.append('preset', params.preset);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const token = localStorage.getItem('cbc_auth_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/admin/reports/export-csv?${query.toString()}`, {
    credentials: 'same-origin',
    headers,
  });

  if (!res.ok) {
    let msg = 'Failed to download report CSV';
    try {
      const errJson = await res.json();
      if (errJson?.message) msg = errJson.message;
    } catch (e) {
      // fallback
    }
    throw new Error(msg);
  }

  // Get filename from Content-Disposition header if available
  let filename = `collections-by-chandni-${reportType}.csv`;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

export default {
  getSalesSummary,
  getSalesTrends,
  getProductPerformance,
  getCategoryPerformance,
  getOrderBreakdown,
  getCustomerMetrics,
  downloadReportCsv,
};
