import { apiRequest } from './api';

/**
 * Dashboard API Client Service for Collections by Chandni
 * Retrieves real-time operational metrics, live sales stats, and order fulfillment queues.
 */
export async function getDashboardSummary() {
  return await apiRequest('/api/admin/dashboard/summary');
}

export default {
  getDashboardSummary,
};
