import * as orderService from '../services/orderService.js';
import * as returnRefundService from '../services/returnRefundService.js';
import * as shiprocketService from '../services/shiprocketService.js';

/**
 * Controller for Customer Order History & Admin Order Management
 */

// ---------------------------------------------------------------------------
// CUSTOMER ORDER ENDPOINTS (Authenticated Patron Only)
// ---------------------------------------------------------------------------

/**
 * GET /api/account/orders
 * Returns orders belonging strictly to the authenticated customer
 */
export async function getCustomerOrders(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view orders',
      });
    }

    const { page, limit, status } = req.query;

    const result = await orderService.getCustomerOrders({
      userId,
      page,
      limit,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving order history',
    });
  }
}

/**
 * GET /api/account/orders/:id
 * Returns a specific order only if it belongs to the authenticated customer
 */
export async function getCustomerOrder(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view order details',
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

    // Enrich order with customer-safe return requests, refunds, and shipments
    const [returns, refunds, shipments] = await Promise.all([
      returnRefundService.getReturnRequestsForOrder(order.id).catch(() => []),
      returnRefundService.getRefundsForOrder(order.id).catch(() => []),
      shiprocketService.getShipmentsForOrder(order.id).catch(() => []),
    ]);

    const sanitizedShipments = (shipments || []).map((s) => ({
      id: s.id,
      courierName: s.courierName,
      status: s.status,
      awbCode: s.awbCode,
      trackingUrl: s.trackingUrl,
      isReturn: s.isReturn,
      lastTrackingEvent: s.lastTrackingEvent,
      lastTrackingTime: s.lastTrackingTime,
      createdAt: s.createdAt,
    }));

    const enrichedOrder = {
      ...order,
      returnRequests: returns || [],
      refunds: (refunds || []).map((r) => ({
        id: r.id,
        amount: r.amount,
        status: r.status,
        paymentMethod: r.paymentMethod,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
      shipments: sanitizedShipments,
    };

    return res.status(200).json({
      success: true,
      data: enrichedOrder,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving order',
    });
  }
}

// ---------------------------------------------------------------------------
// ADMIN ORDER MANAGEMENT ENDPOINTS (Strict Admin Role Required)
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/orders
 * Search and filter all orders across the atelier
 */
export async function getAdminOrders(req, res, next) {
  try {
    const { page, limit, search, status, paymentStatus, startDate, endDate } = req.query;

    const result = await orderService.getAdminOrders({
      page,
      limit,
      search,
      status,
      paymentStatus,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving admin orders',
    });
  }
}

/**
 * GET /api/admin/orders/:id
 * Retrieve complete order details for fulfillment and audit
 */
export async function getAdminOrder(req, res, next) {
  try {
    const { id } = req.params;

    const order = await orderService.getAdminOrderById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Enrich order with returns, refunds, and shipments
    const [returns, refunds, shipments] = await Promise.all([
      returnRefundService.getReturnRequestsForOrder(order.id).catch(() => []),
      returnRefundService.getRefundsForOrder(order.id).catch(() => []),
      shiprocketService.getShipmentsForOrder(order.id).catch(() => []),
    ]);

    const enrichedOrder = {
      ...order,
      returnRequests: returns || [],
      refunds: refunds || [],
      shipments: shipments || [],
    };

    return res.status(200).json({
      success: true,
      data: enrichedOrder,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving order',
    });
  }
}

/**
 * PATCH /api/admin/orders/:id/status
 * Updates order fulfillment status with state machine verification
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note, isInternalNote } = req.body || {};

    const result = await orderService.updateOrderStatus({
      orderIdentifier: id,
      newStatus: status,
      note,
      isInternalNote: Boolean(isInternalNote),
      adminUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.order,
      inventoryAction: result.inventoryAction,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating order status',
    });
  }
}

/**
 * PATCH /api/admin/orders/:id/payment-status
 * Updates payment status through an audited administrative action
 */
export async function updateOrderPaymentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { paymentStatus, note } = req.body || {};

    const result = await orderService.updateOrderPaymentStatus({
      orderIdentifier: id,
      newPaymentStatus: paymentStatus,
      note,
      adminUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.order,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating payment status',
    });
  }
}
