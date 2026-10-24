import crypto from 'crypto';
import prisma from '../config/db.js';
import {
  SHIPROCKET_BASE_URL,
  SHIPROCKET_EMAIL,
  SHIPROCKET_PASSWORD,
  SHIPROCKET_PICKUP_LOCATION,
  SHIPROCKET_WEBHOOK_SECRET,
  SHIPROCKET_ENV,
  DEFAULT_PACKAGE,
  isShiprocketConfigured,
} from '../config/shiprocketConfig.js';
import * as orderService from './orderService.js';

/**
 * Collections by Chandni - Shiprocket Shipping & Logistics Service
 *
 * Implements Launch Step 22:
 * - Shiprocket Authentication & Bearer Token Lifecycle Management
 * - Courier Serviceability & Rates Lookup
 * - Shipment & Order Booking (Prepaid & COD)
 * - AWB Generation & Courier Assignment
 * - Pickup Scheduling
 * - Shipping Label & Manifest Generation
 * - Real-Time AWB Tracking & Status Sync
 * - Order & Shipment Cancellation
 * - Customer Returns & RTO Preparation
 * - Webhook Event Processing with Verification
 */

// In-memory token cache to prevent redundant login API round-trips
let cachedAuthToken = null;
let tokenExpiryTimestamp = 0;

// In-memory shipments store for dev/preview resilience when Postgres daemon is not active
const inMemoryShipments = [];

// Track processed webhook event IDs for idempotency
const processedWebhookEventIds = new Set();

let lastDbCheck = 0;
let lastDbStatus = false;

async function isDatabaseAlive() {
  const now = Date.now();
  if (now - lastDbCheck < 10000) {
    return lastDbStatus;
  }
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 1000)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    lastDbStatus = true;
    lastDbCheck = now;
    return true;
  } catch (e) {
    lastDbStatus = false;
    lastDbCheck = now;
    return false;
  }
}

/**
 * Validates trusted external URLs (HTTPS only, trusted Shiprocket domains)
 */
function isValidProviderUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname.endsWith('shiprocket.in') ||
      hostname.endsWith('shiprocket.co') ||
      hostname.endsWith('amazonaws.com') ||
      hostname.includes('s3')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Redacts secrets from logs
 */
function safeLog(message, data = null) {
  if (data) {
    const sanitized = JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('salt')
        ) {
          return '[REDACTED]';
        }
        return value;
      })
    );
    console.log(`[Shiprocket] ${message}`, sanitized);
  } else {
    console.log(`[Shiprocket] ${message}`);
  }
}

/**
 * Authenticates with Shiprocket API or returns cached valid Bearer token
 */
export async function getAuthToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedAuthToken && now < tokenExpiryTimestamp) {
    return cachedAuthToken;
  }

  if (!isShiprocketConfigured()) {
    const err = new Error(
      'Shiprocket API credentials are not configured. Please configure SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in your server environment to connect to Shiprocket.'
    );
    err.status = 503;
    err.code = 'SHIPROCKET_NOT_CONFIGURED';
    throw err;
  }

  const endpoint = `${SHIPROCKET_BASE_URL}/auth/login`;
  safeLog('Authenticating with Shiprocket API...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL.trim(),
        password: SHIPROCKET_PASSWORD.trim(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();
    let body;
    try {
      body = JSON.parse(rawText);
    } catch (e) {
      body = { message: `Remote server returned non-JSON response (HTTP ${response.status})` };
    }

    if (!response.ok || !body.token) {
      safeLog('Authentication failed', { status: response.status, message: body.message });
      const err = new Error(
        `Shiprocket authentication failed (${response.status}): ${body.message || 'Invalid credentials'}`
      );
      err.status = response.status === 401 ? 401 : 502;
      throw err;
    }

    cachedAuthToken = body.token;
    // Cache for 8 days (token is typically valid for 10 days)
    tokenExpiryTimestamp = now + 8 * 24 * 60 * 60 * 1000;
    safeLog('Shiprocket authenticated successfully. Token cached.');
    return cachedAuthToken;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const err = new Error('Shiprocket authentication request timed out (10s)');
      err.status = 504;
      throw err;
    }
    throw error;
  }
}

/**
 * Low-level authenticated request helper with timeout & automatic 401 re-authentication
 */
async function shiprocketFetch(path, options = {}) {
  let token = await getAuthToken();

  const url = `${SHIPROCKET_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  try {
    let response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    // If token expired, refresh once and retry
    if (response.status === 401) {
      safeLog('Received 401 from Shiprocket. Re-authenticating token...');
      token = await getAuthToken(true);
      headers.Authorization = `Bearer ${token}`;
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { rawText: 'Non-JSON response received' };
    }

    if (!response.ok) {
      const errorMsg =
        data.message ||
        (Array.isArray(data.errors) ? data.errors.join(', ') : null) ||
        `Shiprocket API error (HTTP ${response.status})`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.details = data;
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const err = new Error('Shiprocket API request timed out');
      err.status = 504;
      throw err;
    }
    throw error;
  }
}

/**
 * ---------------------------------------------------------------------------
 * COURIER SERVICEABILITY & RATES LOOKUP
 * ---------------------------------------------------------------------------
 */
export async function checkCourierServiceability({
  pickupPostcode = '411001',
  deliveryPostcode,
  weight = DEFAULT_PACKAGE.weight,
  isCod = false,
  orderId = '',
}) {
  if (!deliveryPostcode || !/^\d{6}$/.test(String(deliveryPostcode).trim())) {
    const err = new Error('A valid 6-digit delivery PIN code is required');
    err.status = 400;
    throw err;
  }

  const cleanPickup = String(pickupPostcode).trim();
  const cleanDelivery = String(deliveryPostcode).trim();
  const cleanWeight = Math.max(0.1, parseFloat(weight) || DEFAULT_PACKAGE.weight);
  const codFlag = isCod ? 1 : 0;

  const queryParams = new URLSearchParams({
    pickup_postcode: cleanPickup,
    delivery_postcode: cleanDelivery,
    weight: cleanWeight.toString(),
    cod: codFlag.toString(),
  });

  if (orderId) {
    queryParams.set('order_id', String(orderId));
  }

  safeLog(`Checking serviceability from ${cleanPickup} to ${cleanDelivery} (weight: ${cleanWeight}kg, COD: ${isCod})`);

  const result = await shiprocketFetch(`/courier/serviceability/?${queryParams.toString()}`, {
    method: 'GET',
  });

  const rawCouriers =
    result?.data?.available_courier_companies ||
    result?.available_courier_companies ||
    [];

  const couriers = rawCouriers.map((c) => ({
    courierCompanyId: c.courier_company_id,
    courierName: c.courier_name,
    rate: parseFloat(c.rate || c.freight_charge || 0),
    etd: c.etd || c.estimated_delivery_days || '3-5 business days',
    minWeight: parseFloat(c.min_weight || 0.5),
    rating: parseFloat(c.rating || 4.5),
    codAvailable: Boolean(c.cod),
    mode: c.mode === 1 ? 'AIR' : 'SURFACE',
  }));

  couriers.sort((a, b) => a.rate - b.rate);

  return {
    pickupPostcode: cleanPickup,
    deliveryPostcode: cleanDelivery,
    weight: cleanWeight,
    isCod,
    isServiceable: couriers.length > 0,
    couriers,
    recommendedCourier: couriers[0] || null,
  };
}

/**
 * ---------------------------------------------------------------------------
 * CREATE SHIPMENT / ORDER IN SHIPROCKET
 * ---------------------------------------------------------------------------
 */
export async function createShipmentForOrder({
  orderId,
  packageWeight,
  packageLength,
  packageBreadth,
  packageHeight,
  courierId,
  adminUser,
}) {
  if (!orderId) {
    const err = new Error('Order ID is required to create a shipment');
    err.status = 400;
    throw err;
  }

  const order = await orderService.getAdminOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  // 1. Check order eligibility
  if (order.status === 'CANCELLED') {
    const err = new Error('Cannot create a shipment for a cancelled order.');
    err.status = 400;
    throw err;
  }

  // 2. Prepaid vs COD payment rule enforcement
  const isCod = order.paymentMethod === 'COD';
  if (!isCod && order.paymentStatus !== 'PAID') {
    const err = new Error(
      `Prepaid order ${order.orderNumber} must have verified payment (PAID) before booking shipment. Current payment status is ${order.paymentStatus}.`
    );
    err.status = 400;
    throw err;
  }

  // 3. Prevent duplicate active forward shipments
  const existingShipments = await getShipmentsForOrder(order.id);
  const activeForwardShipment = existingShipments.find(
    (s) => !s.isReturn && s.status !== 'CANCELLED'
  );

  if (activeForwardShipment) {
    const err = new Error(
      `Order ${order.orderNumber} already has an active shipment (Shipment ID: ${
        activeForwardShipment.shiprocketShipmentId || activeForwardShipment.id
      }, Status: ${activeForwardShipment.status}, AWB: ${activeForwardShipment.awbCode || 'Pending'}).`
    );
    err.status = 409;
    throw err;
  }

  // 4. Validate shipping address snapshot
  const addr = order.shippingAddress;
  if (!addr || !addr.addressLine1 || !addr.pincode || !addr.city || !addr.state) {
    const err = new Error(
      'Order shipping address is incomplete. Line 1, City, State, and PIN code are strictly required.'
    );
    err.status = 400;
    throw err;
  }

  // 5. Package dimensions & weight validation
  const finalWeight = Math.max(
    0.1,
    parseFloat(packageWeight) || DEFAULT_PACKAGE.weight
  );
  const finalLength = Math.max(
    1,
    parseFloat(packageLength) || DEFAULT_PACKAGE.length
  );
  const finalBreadth = Math.max(
    1,
    parseFloat(packageBreadth) || DEFAULT_PACKAGE.breadth
  );
  const finalHeight = Math.max(
    1,
    parseFloat(packageHeight) || DEFAULT_PACKAGE.height
  );

  // Customer names
  const rawName = (addr.name || order.customer?.name || 'Patron').trim();
  const nameParts = rawName.split(' ');
  const firstName = nameParts[0] || 'Patron';
  const lastName = nameParts.slice(1).join(' ') || '.';
  const customerEmail = (order.customer?.email || 'patron@collectionsbychandni.in').trim();
  const customerPhone = String(addr.phone || order.customer?.phone || '9999999999')
    .replace(/\D/g, '')
    .slice(-10);

  // Format order items for Shiprocket
  const shiprocketItems = (order.items || []).map((item) => ({
    name: item.productTitle || 'Luxury Couture Apparel',
    sku: item.sku || `SKU-${item.id}`,
    units: item.quantity || 1,
    selling_price: Number(item.unitPrice || 0),
    discount: 0,
    tax: 0,
    hsn: 6204, // Indian tariff code for women's apparel & sarees
  }));

  const orderDateObj = new Date(order.createdAt || Date.now());
  const formattedOrderDate = `${orderDateObj.getFullYear()}-${String(
    orderDateObj.getMonth() + 1
  ).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')} ${String(
    orderDateObj.getHours()
  ).padStart(2, '0')}:${String(orderDateObj.getMinutes()).padStart(2, '0')}`;

  const requestPayload = {
    order_id: order.orderNumber,
    order_date: formattedOrderDate,
    pickup_location: SHIPROCKET_PICKUP_LOCATION,
    channel_id: '',
    comment: 'Luxury Atelier Handloom Parcel - Fragile Handle with Care',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: addr.addressLine1,
    billing_address_2: addr.addressLine2 || '',
    billing_city: addr.city,
    billing_pincode: addr.pincode,
    billing_state: addr.state,
    billing_country: 'India',
    billing_email: customerEmail,
    billing_phone: customerPhone,
    shipping_is_billing: true,
    order_items: shiprocketItems,
    payment_method: isCod ? 'COD' : 'Prepaid',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: Number(order.discountAmount || 0),
    sub_total: Number(order.totalAmount),
    length: finalLength,
    breadth: finalBreadth,
    height: finalHeight,
    weight: finalWeight,
  };

  safeLog(`Creating adhoc order on Shiprocket for ${order.orderNumber}...`);

  const response = await shiprocketFetch('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(requestPayload),
  });

  const srOrderId = String(response.order_id || '');
  const srShipmentId = String(response.shipment_id || '');

  if (!srShipmentId && !srOrderId) {
    const err = new Error(
      `Shiprocket order creation returned invalid response: ${JSON.stringify(response)}`
    );
    err.status = 502;
    throw err;
  }

  // Persist shipment record
  const shipmentRecord = await saveShipmentRecord({
    orderId: order.id,
    provider: 'SHIPROCKET',
    shiprocketOrderId: srOrderId,
    shiprocketShipmentId: srShipmentId,
    status: 'CREATED',
    pickupStatus: 'PENDING',
    codAmount: isCod ? order.totalAmount : null,
    weight: finalWeight,
    length: finalLength,
    breadth: finalBreadth,
    height: finalHeight,
    metadata: {
      courierId: courierId || null,
      shiprocketResponse: response,
      createdByAdmin: adminUser?.name || 'Admin Atelier',
    },
  });

  // If order status is still PENDING or CONFIRMED, advance to PROCESSING
  if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
    try {
      await orderService.updateOrderStatus({
        orderIdentifier: order.id,
        newStatus: 'PROCESSING',
        note: `Shiprocket consignment created (Shipment ID: ${srShipmentId})`,
        adminUser,
      });
    } catch (e) {
      safeLog('Non-blocking: could not advance order status to PROCESSING', e.message);
    }
  }

  // If courierId was explicitly selected, attempt immediate AWB assignment
  if (courierId) {
    try {
      safeLog(`Auto-assigning courier ${courierId} for shipment ${srShipmentId}...`);
      await assignAwbAndCourier({
        shipmentId: shipmentRecord.id,
        courierId,
        adminUser,
      });
    } catch (awbErr) {
      safeLog('Courier auto-assignment failed after creation (can be assigned manually):', awbErr.message);
    }
  }

  return await getShipmentById(shipmentRecord.id);
}

/**
 * ---------------------------------------------------------------------------
 * ASSIGN COURIER & GENERATE AWB
 * ---------------------------------------------------------------------------
 */
export async function assignAwbAndCourier({ shipmentId, courierId, adminUser }) {
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) {
    const err = new Error('Shipment record not found');
    err.status = 404;
    throw err;
  }

  if (!shipment.shiprocketShipmentId) {
    const err = new Error('Shipment does not have an external Shiprocket shipment ID');
    err.status = 400;
    throw err;
  }

  if (shipment.awbCode) {
    const err = new Error(`AWB ${shipment.awbCode} is already assigned to this shipment`);
    err.status = 400;
    throw err;
  }

  const payload = {
    shipment_id: shipment.shiprocketShipmentId,
  };
  if (courierId) {
    payload.courier_id = courierId;
  }

  safeLog(`Assigning AWB for Shiprocket shipment ${shipment.shiprocketShipmentId}...`);

  const response = await shiprocketFetch('/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const awbData =
    response?.response?.data ||
    response?.data ||
    response;

  const awbCode = String(awbData.awb_code || '').trim();
  const courierCompanyId = awbData.courier_company_id || courierId || null;
  const courierName = awbData.courier_name || shipment.courierName || 'Shiprocket Partner Courier';

  if (!awbCode) {
    const err = new Error(
      response.message || 'Shiprocket could not assign an AWB for this shipment. Please select a different courier.'
    );
    err.status = 502;
    err.details = response;
    throw err;
  }

  // Update shipment record
  const updatedShipment = await updateShipmentRecord(shipment.id, {
    awbCode,
    courierId: courierCompanyId,
    courierName,
    status: 'AWB_ASSIGNED',
    metadata: {
      ...(shipment.metadata || {}),
      awbAssignResponse: response,
    },
  });

  // Advance order status to PACKED if not already Shipped/Delivered
  try {
    const order = await orderService.getAdminOrderById(shipment.orderId);
    if (order && (order.status === 'CONFIRMED' || order.status === 'PROCESSING')) {
      await orderService.updateOrderStatus({
        orderIdentifier: shipment.orderId,
        newStatus: 'PACKED',
        note: `Consignment packed & AWB ${awbCode} generated via ${courierName}`,
        adminUser,
      });
    }
  } catch (e) {
    safeLog('Non-blocking: could not advance order status to PACKED', e.message);
  }

  return updatedShipment;
}

/**
 * ---------------------------------------------------------------------------
 * SCHEDULE PICKUP
 * ---------------------------------------------------------------------------
 */
export async function scheduleShipmentPickup({ shipmentId, pickupDate, adminUser }) {
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) {
    const err = new Error('Shipment record not found');
    err.status = 404;
    throw err;
  }

  if (!shipment.shiprocketShipmentId) {
    const err = new Error('Shipment ID is missing from Shiprocket record');
    err.status = 400;
    throw err;
  }

  if (!shipment.awbCode) {
    const err = new Error('AWB must be assigned before scheduling pickup');
    err.status = 400;
    throw err;
  }

  // Format pickup date (YYYY-MM-DD)
  const targetDate = pickupDate ? new Date(pickupDate) : new Date();
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const formattedPickupDate = `${yyyy}-${mm}-${dd}`;

  safeLog(`Scheduling pickup for shipment ${shipment.shiprocketShipmentId} on ${formattedPickupDate}...`);

  const response = await shiprocketFetch('/courier/generate/pickup', {
    method: 'POST',
    body: JSON.stringify({
      shipment_id: [shipment.shiprocketShipmentId],
      pickup_date: [formattedPickupDate],
    }),
  });

  const pickupData =
    response?.response ||
    response?.data ||
    response;

  const pickupToken =
    pickupData.pickup_token_number ||
    pickupData.token ||
    response.pickup_token_number ||
    'SCHEDULED';

  const updatedShipment = await updateShipmentRecord(shipment.id, {
    pickupStatus: 'SCHEDULED',
    pickupScheduledDate: targetDate,
    pickupTokenNumber: String(pickupToken),
    status: 'PICKUP_SCHEDULED',
    metadata: {
      ...(shipment.metadata || {}),
      pickupResponse: response,
    },
  });

  return updatedShipment;
}

/**
 * ---------------------------------------------------------------------------
 * GENERATE SHIPPING LABEL
 * ---------------------------------------------------------------------------
 */
export async function generateShippingLabel({ shipmentId }) {
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) {
    const err = new Error('Shipment not found');
    err.status = 404;
    throw err;
  }

  if (!shipment.shiprocketShipmentId) {
    const err = new Error('Valid Shiprocket shipment ID is required to generate label');
    err.status = 400;
    throw err;
  }

  safeLog(`Generating shipping label for shipment ${shipment.shiprocketShipmentId}...`);

  const response = await shiprocketFetch('/courier/generate/label', {
    method: 'POST',
    body: JSON.stringify({
      shipment_id: [shipment.shiprocketShipmentId],
    }),
  });

  const labelUrl = response.label_url || response?.response?.label_url;

  if (!labelUrl || !isValidProviderUrl(labelUrl)) {
    const err = new Error(
      response.message || 'Shiprocket did not return a valid secure HTTPS label URL'
    );
    err.status = 502;
    throw err;
  }

  const updated = await updateShipmentRecord(shipment.id, {
    labelUrl,
    metadata: {
      ...(shipment.metadata || {}),
      labelCreatedTime: new Date().toISOString(),
    },
  });

  return {
    success: true,
    labelUrl,
    shipment: updated,
  };
}

/**
 * ---------------------------------------------------------------------------
 * GENERATE MANIFEST
 * ---------------------------------------------------------------------------
 */
export async function generateManifest({ shipmentId }) {
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) {
    const err = new Error('Shipment not found');
    err.status = 404;
    throw err;
  }

  if (!shipment.shiprocketShipmentId) {
    const err = new Error('Shiprocket shipment ID required for manifest');
    err.status = 400;
    throw err;
  }

  safeLog(`Generating manifest for shipment ${shipment.shiprocketShipmentId}...`);

  const response = await shiprocketFetch('/manifests/generate', {
    method: 'POST',
    body: JSON.stringify({
      shipment_id: [shipment.shiprocketShipmentId],
    }),
  });

  const manifestUrl = response.manifest_url || response?.response?.manifest_url;

  let validUrl = null;
  if (manifestUrl && isValidProviderUrl(manifestUrl)) {
    validUrl = manifestUrl;
  } else {
    // Attempt print manifest
    try {
      const printRes = await shiprocketFetch('/manifests/print', {
        method: 'POST',
        body: JSON.stringify({
          order_ids: [shipment.shiprocketOrderId || shipment.shiprocketShipmentId],
        }),
      });
      if (printRes?.manifest_url && isValidProviderUrl(printRes.manifest_url)) {
        validUrl = printRes.manifest_url;
      }
    } catch (e) {
      safeLog('Secondary manifest print attempt failed', e.message);
    }
  }

  const updated = await updateShipmentRecord(shipment.id, {
    manifestUrl: validUrl || shipment.manifestUrl,
  });

  return {
    success: true,
    manifestUrl: validUrl,
    shipment: updated,
  };
}

/**
 * ---------------------------------------------------------------------------
 * LIVE TRACKING INTEGRATION
 * ---------------------------------------------------------------------------
 */
export async function trackShipment({ shipmentId, awbCode }) {
  let shipment = null;
  let targetAwb = awbCode;

  if (shipmentId) {
    shipment = await getShipmentById(shipmentId);
    if (shipment && shipment.awbCode) {
      targetAwb = shipment.awbCode;
    }
  }

  if (!targetAwb) {
    const err = new Error('An AWB code or shipment with assigned AWB is required to track.');
    err.status = 400;
    throw err;
  }

  safeLog(`Tracking AWB ${targetAwb}...`);

  const response = await shiprocketFetch(`/courier/track/awb/${encodeURIComponent(targetAwb)}`, {
    method: 'GET',
  });

  const trackingData = response.tracking_data || response;
  const shipmentTrack = trackingData.shipment_track?.[0] || {};
  const activities = trackingData.shipment_track_activities || [];

  const currentStatus =
    shipmentTrack.current_status ||
    trackingData.current_status ||
    'IN_TRANSIT';

  const trackUrl =
    trackingData.track_url ||
    `https://shiprocket.co//tracking/${targetAwb}`;

  const lastActivity = activities[0] || {};
  const lastEventDesc = lastActivity.activity || currentStatus;
  const lastEventDate = lastActivity.date ? new Date(lastActivity.date) : new Date();

  // Map Shiprocket provider statuses to internal enum
  let internalStatus = 'IN_TRANSIT';
  const normStatus = currentStatus.toUpperCase();

  if (normStatus.includes('DELIVERED') && !normStatus.includes('OUT')) {
    internalStatus = 'DELIVERED';
  } else if (normStatus.includes('OUT FOR DELIVERY')) {
    internalStatus = 'OUT_FOR_DELIVERY';
  } else if (normStatus.includes('PICKED') || normStatus.includes('PICKUP COMPLETED')) {
    internalStatus = 'PICKED_UP';
  } else if (normStatus.includes('CANCEL')) {
    internalStatus = 'CANCELLED';
  } else if (normStatus.includes('RTO')) {
    internalStatus = 'RTO_INITIATED';
  }

  let updatedShipment = null;
  if (shipment) {
    updatedShipment = await updateShipmentRecord(shipment.id, {
      status: internalStatus,
      lastTrackingEvent: lastEventDesc,
      lastTrackingTime: lastEventDate,
      lastProviderSync: new Date(),
      trackingUrl: trackUrl,
      metadata: {
        ...(shipment.metadata || {}),
        latestTrackingRaw: trackingData,
      },
    });

    // Advance order fulfillment status if delivered or out for delivery,
    // BUT NEVER automatically mark payment paid or release inventory!
    if (internalStatus === 'DELIVERED') {
      try {
        const order = await orderService.getAdminOrderById(shipment.orderId);
        if (order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
          await orderService.updateOrderStatus({
            orderIdentifier: shipment.orderId,
            newStatus: 'DELIVERED',
            note: `Consignment delivered via ${shipment.courierName || 'Shiprocket'} (AWB: ${targetAwb})`,
            adminUser: { id: 'shiprocket-sync', name: 'Shiprocket Provider Tracking' },
          });
        }
      } catch (e) {
        safeLog('Non-blocking: could not sync order status to DELIVERED', e.message);
      }
    } else if (internalStatus === 'OUT_FOR_DELIVERY') {
      try {
        const order = await orderService.getAdminOrderById(shipment.orderId);
        if (order && order.status === 'SHIPPED') {
          await orderService.updateOrderStatus({
            orderIdentifier: shipment.orderId,
            newStatus: 'OUT_FOR_DELIVERY',
            note: `Parcel out for delivery by ${shipment.courierName || 'Courier'}`,
            adminUser: { id: 'shiprocket-sync', name: 'Shiprocket Provider Tracking' },
          });
        }
      } catch (e) {
        safeLog('Non-blocking: could not advance order status to OUT_FOR_DELIVERY', e.message);
      }
    }
  }

  return {
    awbCode: targetAwb,
    currentStatus,
    internalStatus,
    trackingUrl: trackUrl,
    latestActivity: lastEventDesc,
    latestActivityTime: lastEventDate,
    activities: activities.map((a) => ({
      date: a.date,
      status: a.activity,
      location: a.location || '',
      srStatus: a['sr-status'] || '',
    })),
    shipment: updatedShipment,
  };
}

/**
 * ---------------------------------------------------------------------------
 * SHIPMENT & ORDER CANCELLATION
 * ---------------------------------------------------------------------------
 */
export async function cancelShipment({ shipmentId, reason, adminUser }) {
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) {
    const err = new Error('Shipment record not found');
    err.status = 404;
    throw err;
  }

  if (shipment.status === 'CANCELLED') {
    const err = new Error('This shipment has already been cancelled');
    err.status = 400;
    throw err;
  }

  if (shipment.status === 'DELIVERED') {
    const err = new Error('Delivered consignments cannot be cancelled. Initiate a Return instead.');
    err.status = 400;
    throw err;
  }

  const cancelReason = (reason || 'Cancelled by store administration').trim();
  safeLog(`Cancelling shipment ${shipment.id} (AWB: ${shipment.awbCode || 'None'}). Reason: ${cancelReason}`);

  let cancelResult = null;

  // If AWB is assigned, use the AWB cancellation endpoint
  if (shipment.awbCode) {
    try {
      cancelResult = await shiprocketFetch('/orders/cancel/shipment/awbs', {
        method: 'POST',
        body: JSON.stringify({
          awbs: [shipment.awbCode],
        }),
      });
    } catch (e) {
      safeLog('AWB cancellation endpoint failed, attempting order cancellation', e.message);
    }
  }

  // If no AWB or AWB cancellation threw, cancel order via order ID
  if (!cancelResult && shipment.shiprocketOrderId) {
    cancelResult = await shiprocketFetch('/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({
        ids: [shipment.shiprocketOrderId],
      }),
    });
  }

  const updatedShipment = await updateShipmentRecord(shipment.id, {
    status: 'CANCELLED',
    pickupStatus: 'CANCELLED',
    metadata: {
      ...(shipment.metadata || {}),
      cancellationReason: cancelReason,
      cancelledBy: adminUser?.name || 'Admin Atelier',
      cancelledAt: new Date().toISOString(),
      providerCancelResult: cancelResult,
    },
  });

  return {
    success: true,
    message: 'Shipment successfully cancelled with Shiprocket',
    shipment: updatedShipment,
  };
}

/**
 * ---------------------------------------------------------------------------
 * RETURN ORDER PREPARATION & CREATION
 * ---------------------------------------------------------------------------
 */
export async function createReturnOrder({
  orderId,
  items, // [{ productVariantId, quantity, reason }]
  returnReason,
  packageWeight,
  packageLength,
  packageBreadth,
  packageHeight,
  adminUser,
}) {
  if (!orderId) {
    const err = new Error('Order ID is required to initiate a return');
    err.status = 400;
    throw err;
  }

  const order = await orderService.getAdminOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one item must be selected for return');
    err.status = 400;
    throw err;
  }

  // Validate quantities against purchased quantities
  const returnItemsList = [];
  let totalReturnAmount = 0;

  for (const retItem of items) {
    const orderItem = (order.items || []).find(
      (i) => i.id === retItem.orderItemId || i.productVariantId === retItem.productVariantId
    );
    if (!orderItem) {
      const err = new Error(`Item ${retItem.orderItemId || retItem.productVariantId} not found in original order`);
      err.status = 400;
      throw err;
    }

    const returnQty = parseInt(retItem.quantity, 10);
    if (isNaN(returnQty) || returnQty <= 0 || returnQty > orderItem.quantity) {
      const err = new Error(
        `Invalid return quantity (${returnQty}) for item ${orderItem.productTitle}. Maximum eligible is ${orderItem.quantity}.`
      );
      err.status = 400;
      throw err;
    }

    const unitPrice = Number(orderItem.unitPrice || 0);
    totalReturnAmount += unitPrice * returnQty;

    returnItemsList.push({
      name: orderItem.productTitle,
      sku: orderItem.sku,
      units: returnQty,
      selling_price: unitPrice,
      discount: 0,
      qc_enable: 0,
      hsn: 6204,
    });
  }

  const addr = order.shippingAddress || {};
  const rawName = (addr.name || order.customer?.name || 'Patron').trim();
  const nameParts = rawName.split(' ');
  const firstName = nameParts[0] || 'Patron';
  const lastName = nameParts.slice(1).join(' ') || '.';
  const customerEmail = (order.customer?.email || 'patron@collectionsbychandni.in').trim();
  const customerPhone = String(addr.phone || order.customer?.phone || '9999999999')
    .replace(/\D/g, '')
    .slice(-10);

  const finalWeight = Math.max(0.1, parseFloat(packageWeight) || DEFAULT_PACKAGE.weight);
  const finalLength = Math.max(1, parseFloat(packageLength) || DEFAULT_PACKAGE.length);
  const finalBreadth = Math.max(1, parseFloat(packageBreadth) || DEFAULT_PACKAGE.breadth);
  const finalHeight = Math.max(1, parseFloat(packageHeight) || DEFAULT_PACKAGE.height);

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const returnPayload = {
    order_id: `RET-${order.orderNumber}-${Date.now().toString().slice(-4)}`,
    order_date: formattedDate,
    channel_id: '',
    pickup_customer_name: firstName,
    pickup_last_name: lastName,
    pickup_address: addr.addressLine1 || 'Customer Residence',
    pickup_address_2: addr.addressLine2 || '',
    pickup_city: addr.city || 'Pune',
    pickup_state: addr.state || 'Maharashtra',
    pickup_country: 'India',
    pickup_pincode: addr.pincode || '411001',
    pickup_email: customerEmail,
    pickup_phone: customerPhone,
    shipping_customer_name: 'Collections by Chandni Atelier',
    shipping_address: 'Atelier Head Office, Koregaon Park South',
    shipping_city: 'Pune',
    shipping_state: 'Maharashtra',
    shipping_country: 'India',
    shipping_pincode: '411001',
    shipping_email: 'atelier@collectionsbychandni.in',
    shipping_phone: '9812345678',
    order_items: returnItemsList,
    sub_total: totalReturnAmount,
    length: finalLength,
    breadth: finalBreadth,
    height: finalHeight,
    weight: finalWeight,
  };

  safeLog(`Creating return order for ${order.orderNumber} in Shiprocket...`);

  const response = await shiprocketFetch('/orders/create/return', {
    method: 'POST',
    body: JSON.stringify(returnPayload),
  });

  const srOrderId = String(response.order_id || '');
  const srShipmentId = String(response.shipment_id || '');

  // Persist Return Shipment record
  const returnShipment = await saveShipmentRecord({
    orderId: order.id,
    provider: 'SHIPROCKET',
    shiprocketOrderId: srOrderId,
    shiprocketShipmentId: srShipmentId,
    status: 'RTO_INITIATED',
    pickupStatus: 'PENDING',
    isReturn: true,
    returnReason: returnReason || 'Patron requested reverse pickup',
    weight: finalWeight,
    length: finalLength,
    breadth: finalBreadth,
    height: finalHeight,
    metadata: {
      returnItems: returnItemsList,
      totalReturnAmount,
      shiprocketResponse: response,
      initiatedByAdmin: adminUser?.name || 'Admin Atelier',
    },
  });

  return returnShipment;
}

/**
 * ---------------------------------------------------------------------------
 * WEBHOOK EVENT RECEIVER & PROCESSOR
 * ---------------------------------------------------------------------------
 */
export async function processShiprocketWebhook({ payload, signatureHeader }) {
  if (!payload || typeof payload !== 'object') {
    const err = new Error('Invalid or empty webhook payload');
    err.status = 400;
    throw err;
  }

  // Webhook security verification
  if (SHIPROCKET_WEBHOOK_SECRET) {
    const authHeader = signatureHeader || '';
    if (authHeader !== SHIPROCKET_WEBHOOK_SECRET) {
      safeLog('Unauthorized webhook attempt - invalid secret token');
      const err = new Error('Unauthorized webhook signature or secret header');
      err.status = 401;
      throw err;
    }
  }

  // Idempotency check via event or shipment identifier
  const eventId =
    payload.event_id ||
    payload.id ||
    `${payload.awb || payload.shipment_id}_${payload.current_status || payload.status}_${payload.scans?.length || 0}`;

  if (processedWebhookEventIds.has(eventId)) {
    safeLog(`Duplicate webhook event ${eventId} received. Skipping idempotently.`);
    return { success: true, duplicated: true, message: 'Event already processed' };
  }

  processedWebhookEventIds.add(eventId);
  // Keep set bounded
  if (processedWebhookEventIds.size > 1000) {
    const firstItem = processedWebhookEventIds.values().next().value;
    processedWebhookEventIds.delete(firstItem);
  }

  const awb = payload.awb || payload.awb_code;
  const shipmentId = payload.shipment_id;
  const orderNumber = payload.order_id;
  const statusStr = (payload.current_status || payload.status || '').toUpperCase();

  safeLog(`Processing webhook for AWB ${awb || 'N/A'}, status: ${statusStr}`);

  // Find shipment record
  let shipment = null;
  const allShipments = await getAllShipments();
  if (awb) {
    shipment = allShipments.find((s) => s.awbCode === awb);
  }
  if (!shipment && shipmentId) {
    shipment = allShipments.find(
      (s) => String(s.shiprocketShipmentId) === String(shipmentId)
    );
  }

  if (shipment) {
    let newStatus = shipment.status;
    if (statusStr.includes('DELIVERED') && !statusStr.includes('OUT')) {
      newStatus = 'DELIVERED';
    } else if (statusStr.includes('OUT FOR DELIVERY')) {
      newStatus = 'OUT_FOR_DELIVERY';
    } else if (statusStr.includes('PICKED UP')) {
      newStatus = 'PICKED_UP';
    } else if (statusStr.includes('CANCEL')) {
      newStatus = 'CANCELLED';
    } else if (statusStr.includes('RTO')) {
      newStatus = 'RTO_INITIATED';
    }

    await updateShipmentRecord(shipment.id, {
      status: newStatus,
      lastTrackingEvent: statusStr,
      lastTrackingTime: new Date(),
      lastProviderSync: new Date(),
      metadata: {
        ...(shipment.metadata || {}),
        lastWebhookPayload: payload,
      },
    });

    // Advance order fulfillment status if delivered
    if (newStatus === 'DELIVERED') {
      try {
        const order = await orderService.getAdminOrderById(shipment.orderId);
        if (order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
          await orderService.updateOrderStatus({
            orderIdentifier: shipment.orderId,
            newStatus: 'DELIVERED',
            note: `Consignment marked delivered via Shiprocket webhook (AWB: ${awb})`,
            adminUser: { id: 'webhook-sync', name: 'Shiprocket Webhook' },
          });
        }
      } catch (e) {
        safeLog('Webhook status sync non-blocking error:', e.message);
      }
    }
  }

  return { success: true, processed: true };
}

/**
 * ---------------------------------------------------------------------------
 * SHIPMENT STORAGE & QUERY HELPERS (Dual DB & In-Memory Fallback)
 * ---------------------------------------------------------------------------
 */

export async function getShipmentById(id) {
  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const s = await prisma.shipment.findUnique({
        where: { id },
        include: { order: true },
      });
      if (s) return s;
    } catch (e) {
      // In-memory fallback
    }
  }
  return inMemoryShipments.find((s) => s.id === id) || null;
}

export async function getShipmentsForOrder(orderId) {
  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      return await prisma.shipment.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // In-memory fallback
    }
  }
  return inMemoryShipments
    .filter((s) => s.orderId === orderId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getAllShipments() {
  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      return await prisma.shipment.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // In-memory fallback
    }
  }
  return [...inMemoryShipments];
}

async function saveShipmentRecord(data) {
  const id = `ship-${crypto.randomUUID()}`;
  const now = new Date();

  const record = {
    id,
    orderId: data.orderId,
    provider: data.provider || 'SHIPROCKET',
    shiprocketOrderId: data.shiprocketOrderId || null,
    shiprocketShipmentId: data.shiprocketShipmentId || null,
    awbCode: data.awbCode || null,
    courierName: data.courierName || null,
    courierId: data.courierId ? parseInt(data.courierId, 10) : null,
    status: data.status || 'CREATED',
    trackingUrl: data.trackingUrl || null,
    labelUrl: data.labelUrl || null,
    manifestUrl: data.manifestUrl || null,
    pickupStatus: data.pickupStatus || 'PENDING',
    pickupScheduledDate: data.pickupScheduledDate || null,
    pickupTokenNumber: data.pickupTokenNumber || null,
    isReturn: Boolean(data.isReturn),
    returnReason: data.returnReason || null,
    codAmount: data.codAmount !== undefined ? data.codAmount : null,
    weight: data.weight ? parseFloat(data.weight) : null,
    length: data.length ? parseFloat(data.length) : null,
    breadth: data.breadth ? parseFloat(data.breadth) : null,
    height: data.height ? parseFloat(data.height) : null,
    lastTrackingEvent: data.lastTrackingEvent || null,
    lastTrackingTime: data.lastTrackingTime || null,
    lastProviderSync: now,
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const created = await prisma.shipment.create({
        data: {
          id: record.id,
          orderId: record.orderId,
          provider: record.provider,
          shiprocketOrderId: record.shiprocketOrderId,
          shiprocketShipmentId: record.shiprocketShipmentId,
          awbCode: record.awbCode,
          courierName: record.courierName,
          courierId: record.courierId,
          status: record.status,
          trackingUrl: record.trackingUrl,
          labelUrl: record.labelUrl,
          manifestUrl: record.manifestUrl,
          pickupStatus: record.pickupStatus,
          pickupScheduledDate: record.pickupScheduledDate,
          pickupTokenNumber: record.pickupTokenNumber,
          isReturn: record.isReturn,
          returnReason: record.returnReason,
          codAmount: record.codAmount,
          weight: record.weight,
          length: record.length,
          breadth: record.breadth,
          height: record.height,
          lastTrackingEvent: record.lastTrackingEvent,
          lastTrackingTime: record.lastTrackingTime,
          lastProviderSync: record.lastProviderSync,
          metadata: record.metadata,
        },
      });
      inMemoryShipments.unshift(created);
      return created;
    } catch (e) {
      safeLog('Prisma shipment save failed, falling back to memory store:', e.message);
    }
  }

  inMemoryShipments.unshift(record);
  return record;
}

export async function updateShipmentRecord(id, updates) {
  const now = new Date();
  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const updated = await prisma.shipment.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: now,
        },
      });
      const idx = inMemoryShipments.findIndex((s) => s.id === id);
      if (idx !== -1) {
        inMemoryShipments[idx] = updated;
      }
      return updated;
    } catch (e) {
      // In-memory fallback
    }
  }

  const idx = inMemoryShipments.findIndex((s) => s.id === id);
  if (idx !== -1) {
    inMemoryShipments[idx] = {
      ...inMemoryShipments[idx],
      ...updates,
      updatedAt: now,
    };
    return inMemoryShipments[idx];
  }
  return null;
}
