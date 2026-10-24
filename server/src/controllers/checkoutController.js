import * as checkoutService from '../services/checkoutService.js';
import * as paymentService from '../services/paymentService.js';
import * as orderService from '../services/orderService.js';

/**
 * Controller for Checkout & Order Preparation Endpoints
 */

/**
 * GET /api/checkout/summary
 * Returns the current checkout summary with user's default address and active cart validation
 */
export async function getCheckoutSummary(req, res, next) {
  try {
    const userId = req.user?.id;
    const guestId = req.headers['x-cart-session-id'] || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for checkout',
      });
    }

    const { addressId } = req.query;

    const summary = await checkoutService.validateCheckout({
      userId,
      guestId,
      addressId: addressId || undefined,
    });

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error validating checkout',
    });
  }
}

/**
 * POST /api/checkout/validate
 * Authoritatively validates customer cart and requested delivery address
 */
export async function validateCheckout(req, res, next) {
  try {
    const userId = req.user?.id;
    const guestId = req.headers['x-cart-session-id'] || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for checkout',
      });
    }

    const { addressId, inlineAddress } = req.body || {};

    const result = await checkoutService.validateCheckout({
      userId,
      guestId,
      addressId,
      inlineAddress,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error validating checkout',
    });
  }
}

/**
 * POST /api/checkout/prepare (or POST /api/checkout/confirm)
 * Confirms checkout and creates order with immutable snapshots and chosen payment method (PayU / COD)
 */
export async function prepareOrder(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to place an order',
      });
    }

    const { addressId, inlineAddress, idempotencyKey, notes, paymentMethod } = req.body || {};

    const result = await checkoutService.prepareOrder({
      userId,
      addressId,
      inlineAddress,
      idempotencyKey,
      notes,
      paymentMethod,
    });

    return res.status(201).json({
      success: true,
      message: result.message || 'Order prepared successfully',
      data: result.order,
      orderNumber: result.order?.orderNumber,
      paymentMethod: result.paymentMethod,
      payuParams: result.payuParams || null,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error processing order preparation',
      details: error.details,
      warnings: error.warnings,
    });
  }
}

/**
 * POST /api/checkout/payu/initiate
 * Generates fresh PayU payment parameters for an existing unpaid order
 */
export async function initiatePayU(req, res, next) {
  try {
    const userId = req.user?.id;
    const { orderIdentifier } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await checkoutService.initiatePayUPaymentForOrder({
      orderIdentifier,
      userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating payment parameters',
    });
  }
}

/**
 * POST /api/checkout/payu/response (and GET fallback)
 * Public webhook/callback endpoint invoked by PayU upon transaction completion
 */
export async function handlePayUResponse(req, res, next) {
  try {
    // PayU sends form urlencoded POST data
    const callbackData = req.method === 'POST' ? req.body : req.query;
    const result = await paymentService.handlePayUCallback(callbackData || {});

    if (result.redirectUrl) {
      return res.redirect(result.redirectUrl);
    }

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error handling PayU callback:', error);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(
      `${FRONTEND_URL}/checkout/payment-status?status=failure&message=${encodeURIComponent(
        error.message || 'Payment processing error'
      )}`
    );
  }
}

/**
 * GET /api/checkout/payu/verify/:orderNumber
 * Authoritatively verifies order payment status without leaking customer PII to unauthenticated callers
 */
export async function verifyPayment(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const order = await orderService.getAdminOrderById(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Only expose customer full address & PII if authenticated as order owner or admin
    const isOwner = req.user && req.user.id === order.userId;
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const canAccessPii = isOwner || isAdmin;

    // Masked / sanitized delivery summary for public verification
    const safeShipping = canAccessPii
      ? order.shippingAddress
      : order.shippingAddress
      ? {
          name: order.shippingAddress.name ? `${order.shippingAddress.name.split(' ')[0]} (Verified Patron)` : 'Patron',
          city: order.shippingAddress.city || '',
          state: order.shippingAddress.state || '',
          pincode: order.shippingAddress.pincode ? `${order.shippingAddress.pincode.slice(0, 2)}****` : '******',
        }
      : null;

    return res.status(200).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        isStockDeducted: order.isStockDeducted,
        paymentDetails: order.paymentDetails
          ? {
              provider: order.paymentDetails.provider || 'PayU Hosted Checkout',
              mode: order.paymentDetails.mode || 'ONLINE',
              paidAt: order.paymentDetails.paidAt || null,
            }
          : null,
        lastTxnId: order.lastTxnId || null,
        shippingAddress: safeShipping,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error verifying payment status',
    });
  }
}

/**
 * POST /api/checkout/payu/simulate
 * Development test simulator for immediate PayU verification without needing external OTPs
 * Strictly disabled in production builds
 */
export async function simulatePayment(req, res, next) {
  try {
    // Security audit: strictly disable payment simulation in production builds
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Payment simulation is disabled in production environments.',
        code: 'SIMULATION_DISABLED_IN_PRODUCTION',
      });
    }

    const { orderNumber, outcome, paymentMode } = req.body || {};

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required for simulation',
      });
    }

    const result = await paymentService.simulatePayUCallback({
      orderNumber,
      outcome: outcome || 'success',
      paymentMode: paymentMode || 'UPI',
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error executing payment simulation',
    });
  }
}

/**
 * GET /api/checkout/orders/:orderNumber
 */
export async function getOrder(req, res, next) {
  try {
    const userId = req.user?.id;
    const { orderNumber } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const order = await checkoutService.getCustomerOrder({
      orderIdentifier: orderNumber,
      userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving order',
    });
  }
}
