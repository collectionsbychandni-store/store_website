import * as shiprocketService from '../services/shiprocketService.js';
import * as orderService from '../services/orderService.js';
import { getSanitizedConfig } from '../config/shiprocketConfig.js';

/**
 * Collections by Chandni - Shipping Controller (Shiprocket Integration)
 *
 * Implements Launch Step 22:
 * - Admin Courier Serviceability & Rates
 * - Forward Consignment Creation (Prepaid & COD)
 * - Courier & AWB Assignment
 * - Pickup Scheduling
 * - Label & Manifest Generation
 * - Live Tracking Refresh
 * - Shipment Cancellation
 * - Customer Returns & RTO Consignment
 * - Customer-Safe Tracking Visibility
 * - Webhook Receiver
 */

/**
 * GET /api/admin/orders/shipping/config
 * Returns sanitized Shiprocket configuration status for admin dashboard
 */
export async function getShippingConfig(req, res) {
  try {
    const config = getSanitizedConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching shipping configuration',
    });
  }
}

/**
 * GET /api/admin/orders/:id/shipping/serviceability
 * Check courier rates and ETA for an order
 */
export async function checkOrderServiceability(req, res) {
  try {
    const { id } = req.params;
    const { weight, pickupPostcode } = req.query;

    const order = await orderService.getAdminOrderById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const deliveryPostcode = order.shippingAddress?.pincode;
    if (!deliveryPostcode) {
      return res.status(400).json({
        success: false,
        message: 'Order shipping address has no delivery PIN code',
      });
    }

    const isCod = order.paymentMethod === 'COD';

    const result = await shiprocketService.checkCourierServiceability({
      deliveryPostcode,
      pickupPostcode: pickupPostcode || '411001',
      weight: weight || undefined,
      isCod,
      orderId: order.orderNumber,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error checking courier serviceability',
    });
  }
}

/**
 * POST /api/admin/orders/:id/shipping/create
 * Book consignment with Shiprocket
 */
export async function createShipment(req, res) {
  try {
    const { id } = req.params;
    const { weight, length, breadth, height, courierId } = req.body || {};

    const shipment = await shiprocketService.createShipmentForOrder({
      orderId: id,
      packageWeight: weight,
      packageLength: length,
      packageBreadth: breadth,
      packageHeight: height,
      courierId: courierId || undefined,
      adminUser: req.user,
    });

    return res.status(201).json({
      success: true,
      message: 'Consignment successfully created with Shiprocket',
      data: shipment,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating consignment with Shiprocket',
      code: error.code || undefined,
    });
  }
}

/**
 * POST /api/admin/orders/shipping/:shipmentId/assign-awb
 * Assign a courier and generate an AWB code
 */
export async function assignAwb(req, res) {
  try {
    const { shipmentId } = req.params;
    const { courierId } = req.body || {};

    const shipment = await shiprocketService.assignAwbAndCourier({
      shipmentId,
      courierId: courierId || undefined,
      adminUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `AWB ${shipment.awbCode} successfully assigned via ${shipment.courierName}`,
      data: shipment,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error assigning courier AWB',
    });
  }
}

/**
 * POST /api/admin/orders/shipping/:shipmentId/schedule-pickup
 * Schedule consignment pickup with courier
 */
export async function schedulePickup(req, res) {
  try {
    const { shipmentId } = req.params;
    const { pickupDate } = req.body || {};

    const shipment = await shiprocketService.scheduleShipmentPickup({
      shipmentId,
      pickupDate,
      adminUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Consignment pickup scheduled successfully',
      data: shipment,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error scheduling consignment pickup',
    });
  }
}

/**
 * POST /api/admin/orders/shipping/:shipmentId/label
 * Generate and retrieve shipping label PDF URL
 */
export async function generateLabel(req, res) {
  try {
    const { shipmentId } = req.params;

    const result = await shiprocketService.generateShippingLabel({
      shipmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Shipping label generated successfully',
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating shipping label',
    });
  }
}

/**
 * POST /api/admin/orders/shipping/:shipmentId/manifest
 * Generate and retrieve manifest PDF URL
 */
export async function generateManifest(req, res) {
  try {
    const { shipmentId } = req.params;

    const result = await shiprocketService.generateManifest({
      shipmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Manifest generated successfully',
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating manifest',
    });
  }
}

/**
 * GET /api/admin/orders/shipping/:shipmentId/track
 * Refresh live tracking events from Shiprocket provider
 */
export async function trackShipment(req, res) {
  try {
    const { shipmentId } = req.params;
    const { awb } = req.query;

    const result = await shiprocketService.trackShipment({
      shipmentId,
      awbCode: awb,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving live tracking events',
    });
  }
}

/**
 * POST /api/admin/orders/shipping/:shipmentId/cancel
 * Cancel shipment with Shiprocket
 */
export async function cancelShipment(req, res) {
  try {
    const { shipmentId } = req.params;
    const { reason } = req.body || {};

    const result = await shiprocketService.cancelShipment({
      shipmentId,
      reason,
      adminUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.shipment,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error cancelling shipment',
    });
  }
}

/**
 * POST /api/admin/orders/:id/shipping/return
 * Create reverse pickup return order
 */
export async function createReturnOrder(req, res) {
  try {
    const { id } = req.params;
    const { items, returnReason, weight, length, breadth, height } = req.body || {};

    const returnShipment = await shiprocketService.createReturnOrder({
      orderId: id,
      items,
      returnReason,
      packageWeight: weight,
      packageLength: length,
      packageBreadth: breadth,
      packageHeight: height,
      adminUser: req.user,
    });

    return res.status(201).json({
      success: true,
      message: 'Reverse pickup return consignment created successfully',
      data: returnShipment,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating return order with Shiprocket',
    });
  }
}

/**
 * GET /api/admin/orders/:id/shipments
 * Get all forward and return shipments for an order
 */
export async function getOrderShipments(req, res) {
  try {
    const { id } = req.params;
    const shipments = await shiprocketService.getShipmentsForOrder(id);

    return res.status(200).json({
      success: true,
      data: shipments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching shipments for order',
    });
  }
}

/**
 * GET /api/account/orders/:id/tracking
 * Customer-safe tracking endpoint with strict customer ownership verification
 */
export async function getCustomerOrderTracking(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view tracking records',
      });
    }

    const order = await orderService.getCustomerOrderById({
      orderIdentifier: id,
      userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or unauthorized',
      });
    }

    const shipments = await shiprocketService.getShipmentsForOrder(order.id);
    const activeShipment = shipments.find((s) => !s.isReturn && s.status !== 'CANCELLED') || shipments[0];

    if (!activeShipment || !activeShipment.awbCode) {
      return res.status(200).json({
        success: true,
        data: {
          hasActiveShipment: false,
          status: order.status,
          message: 'Parcel is being hand-inspected in our atelier prior to courier dispatch.',
        },
      });
    }

    // Refresh tracking if older than 1 hour or return latest stored data
    let trackingInfo = null;
    try {
      trackingInfo = await shiprocketService.trackShipment({
        shipmentId: activeShipment.id,
        awbCode: activeShipment.awbCode,
      });
    } catch (e) {
      // Fallback to cached shipment fields
      trackingInfo = {
        awbCode: activeShipment.awbCode,
        currentStatus: activeShipment.status,
        internalStatus: activeShipment.status,
        trackingUrl: activeShipment.trackingUrl,
        latestActivity: activeShipment.lastTrackingEvent || activeShipment.status,
        latestActivityTime: activeShipment.lastTrackingTime || activeShipment.updatedAt,
        activities: [],
      };
    }

    // Sanitize customer response (no internal admin notes or credentials)
    return res.status(200).json({
      success: true,
      data: {
        hasActiveShipment: true,
        courierName: activeShipment.courierName || 'Shiprocket Partner Courier',
        awbCode: activeShipment.awbCode,
        shipmentStatus: activeShipment.status,
        trackingUrl: trackingInfo.trackingUrl || `https://shiprocket.co//tracking/${activeShipment.awbCode}`,
        latestActivity: trackingInfo.latestActivity,
        latestActivityTime: trackingInfo.latestActivityTime,
        activities: (trackingInfo.activities || []).map((a) => ({
          date: a.date,
          status: a.status,
          location: a.location,
        })),
      },
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error fetching customer tracking details',
    });
  }
}

/**
 * POST /api/shipping/webhook
 * Public/Provider webhook endpoint for live tracking updates
 */
export async function handleShiprocketWebhook(req, res) {
  try {
    const signatureHeader = req.headers['x-api-key'] || req.headers['authorization'] || req.query.secret;
    const payload = req.body;

    const result = await shiprocketService.processShiprocketWebhook({
      payload,
      signatureHeader,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    });
  }
}
