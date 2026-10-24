import { Router } from 'express';
import * as checkoutController from '../controllers/checkoutController.js';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';
import { checkoutRateLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

// Apply checkout rate limiter across checkout endpoints
router.use(checkoutRateLimiter);

// ---------------------------------------------------------------------------
// PUBLIC PAYMENT GATEWAY WEBHOOKS & CALLBACKS (No JWT header from PayU)
// ---------------------------------------------------------------------------
router.post('/payu/response', checkoutController.handlePayUResponse);
router.get('/payu/response', checkoutController.handlePayUResponse);
router.get('/payu/verify/:orderNumber', optionalAuth, checkoutController.verifyPayment);
router.post('/payu/simulate', checkoutController.simulatePayment);

// ---------------------------------------------------------------------------
// AUTHENTICATED CUSTOMER CHECKOUT ENDPOINTS
// ---------------------------------------------------------------------------
router.use(authenticateToken);

// GET /api/checkout/summary
router.get('/summary', checkoutController.getCheckoutSummary);

// POST /api/checkout/validate
router.post('/validate', checkoutController.validateCheckout);

// POST /api/checkout/prepare (and alias /confirm)
router.post('/prepare', checkoutController.prepareOrder);
router.post('/confirm', checkoutController.prepareOrder);

// POST /api/checkout/payu/initiate
router.post('/payu/initiate', checkoutController.initiatePayU);

// GET /api/checkout/orders/:orderNumber
router.get('/orders/:orderNumber', checkoutController.getOrder);

export default router;
