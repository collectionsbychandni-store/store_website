import { apiRequest } from './api';

/**
 * Collections by Chandni - Shipping & Logistics API Client (Shiprocket)
 *
 * Implements Launch Step 22:
 * - Admin Shiprocket configuration status
 * - Courier serviceability & rates lookup
 * - Forward consignment booking
 * - AWB assignment & courier selection
 * - Pickup scheduling
 * - Shipping label & manifest generation
 * - Live AWB tracking refresh
 * - Shipment cancellation
 * - Reverse pickup return order creation
 * - Customer-safe tracking visibility
 */

// ---------------------------------------------------------------------------
// ADMIN SHIPPING OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Get sanitized Shiprocket provider configuration
 */
export async function getShippingConfig() {
  return await apiRequest('/api/shipping/config', {
    method: 'GET',
  });
}

/**
 * Check courier serviceability and shipping rates for an order's delivery address
 */
export async function checkServiceability(orderId, params = {}) {
  const qs = new URLSearchParams();
  if (params.weight !== undefined && params.weight !== null) qs.append('weight', String(params.weight));
  if (params.cod !== undefined && params.cod !== null) qs.append('cod', params.cod ? '1' : '0');
  const queryStr = qs.toString() ? `?${qs.toString()}` : '';
  return await apiRequest(`/api/shipping/orders/${encodeURIComponent(orderId)}/serviceability${queryStr}`, {
    method: 'GET',
  });
}

/**
 * Book forward consignment with Shiprocket
 */
export async function createShipment(orderId, packageData = {}) {
  return await apiRequest(`/api/shipping/orders/${encodeURIComponent(orderId)}/create`, {
    method: 'POST',
    body: JSON.stringify(packageData),
  });
}

/**
 * Fetch all forward and reverse shipments for an order
 */
export async function getOrderShipments(orderId) {
  return await apiRequest(`/api/shipping/orders/${encodeURIComponent(orderId)}/shipments`, {
    method: 'GET',
  });
}

/**
 * Assign courier and generate AWB code for shipment
 */
export async function assignAwb(shipmentId, data = {}) {
  return await apiRequest(`/api/shipping/shipments/${encodeURIComponent(shipmentId)}/assign-awb`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Schedule courier pickup for consignment
 */
export async function schedulePickup(shipmentId, data = {}) {
  return await apiRequest(`/api/shipping/shipments/${encodeURIComponent(shipmentId)}/schedule-pickup`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Generate official shipping label PDF
 */
export async function generateLabel(shipmentId) {
  return await apiRequest(`/api/shipping/shipments/${encodeURIComponent(shipmentId)}/label`, {
    method: 'POST',
  });
}

/**
 * Generate official shipping manifest PDF
 */
export async function generateManifest(shipmentId) {
  return await apiRequest(`/api/shipping/shipments/${encodeURIComponent(shipmentId)}/manifest`, {
    method: 'POST',
  });
}

/**
 * Refresh live tracking events from Shiprocket provider
 */
export async function trackShipment(shipmentId, params = {}) {
  const qs = new URLSearchParams();
  if (params.awb) qs.append('awb', String(params.awb));
  const queryStr = qs.toString() ? `?${qs.toString()}` : '';
  return await apiRequest(`/api/shipping/shipments/${encodeURIComponent(shipmentId)}/track${queryStr}`, {
    method: 'GET',
  });
}

/**
 * Cancel shipment with Shiprocket
 */
export async function cancelShipment(shipmentId, data = {}) {
  return await apiRequest(`/api/shipping/shipments/${encodeURIComponent(shipmentId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Initiate reverse pickup return order
 */
export async function createReturnOrder(orderId, returnData = {}) {
  return await apiRequest(`/api/shipping/orders/${encodeURIComponent(orderId)}/return`, {
    method: 'POST',
    body: JSON.stringify(returnData),
  });
}

// ---------------------------------------------------------------------------
// CUSTOMER SHIPPING TRACKING
// ---------------------------------------------------------------------------

/**
 * Customer: Retrieve verified tracking info for own order
 */
export async function getCustomerOrderTracking(orderId) {
  return await apiRequest(`/api/account/orders/${encodeURIComponent(orderId)}/tracking`, {
    method: 'GET',
  });
}

export default {
  getShippingConfig,
  checkServiceability,
  createShipment,
  getOrderShipments,
  assignAwb,
  schedulePickup,
  generateLabel,
  generateManifest,
  trackShipment,
  cancelShipment,
  createReturnOrder,
  getCustomerOrderTracking,
};
