import api from './api';

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
  const response = await api.get('/shipping/config');
  return response.data;
}

/**
 * Check courier serviceability and shipping rates for an order's delivery address
 */
export async function checkServiceability(orderId, params = {}) {
  const response = await api.get(`/shipping/orders/${orderId}/serviceability`, { params });
  return response.data;
}

/**
 * Book forward consignment with Shiprocket
 */
export async function createShipment(orderId, packageData = {}) {
  const response = await api.post(`/shipping/orders/${orderId}/create`, packageData);
  return response.data;
}

/**
 * Fetch all forward and reverse shipments for an order
 */
export async function getOrderShipments(orderId) {
  const response = await api.get(`/shipping/orders/${orderId}/shipments`);
  return response.data;
}

/**
 * Assign courier and generate AWB code for shipment
 */
export async function assignAwb(shipmentId, data = {}) {
  const response = await api.post(`/shipping/shipments/${shipmentId}/assign-awb`, data);
  return response.data;
}

/**
 * Schedule courier pickup for consignment
 */
export async function schedulePickup(shipmentId, data = {}) {
  const response = await api.post(`/shipping/shipments/${shipmentId}/schedule-pickup`, data);
  return response.data;
}

/**
 * Generate official shipping label PDF
 */
export async function generateLabel(shipmentId) {
  const response = await api.post(`/shipping/shipments/${shipmentId}/label`);
  return response.data;
}

/**
 * Generate official shipping manifest PDF
 */
export async function generateManifest(shipmentId) {
  const response = await api.post(`/shipping/shipments/${shipmentId}/manifest`);
  return response.data;
}

/**
 * Refresh live tracking events from Shiprocket provider
 */
export async function trackShipment(shipmentId, params = {}) {
  const response = await api.get(`/shipping/shipments/${shipmentId}/track`, { params });
  return response.data;
}

/**
 * Cancel shipment with Shiprocket
 */
export async function cancelShipment(shipmentId, data = {}) {
  const response = await api.post(`/shipping/shipments/${shipmentId}/cancel`, data);
  return response.data;
}

/**
 * Initiate reverse pickup return order
 */
export async function createReturnOrder(orderId, returnData = {}) {
  const response = await api.post(`/shipping/orders/${orderId}/return`, returnData);
  return response.data;
}

// ---------------------------------------------------------------------------
// CUSTOMER SHIPPING TRACKING
// ---------------------------------------------------------------------------

/**
 * Customer: Retrieve verified tracking info for own order
 */
export async function getCustomerOrderTracking(orderId) {
  const response = await api.get(`/account/orders/${orderId}/tracking`);
  return response.data;
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
