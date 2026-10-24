import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import * as returnRefundController from '../controllers/returnRefundController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All administrative order routes require authenticated admin credentials
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/orders - Search, filter, paginate all atelier orders
router.get('/', orderController.getAdminOrders);

// GET /api/admin/orders/:id - Detailed order fulfillment snapshot
router.get('/:id', orderController.getAdminOrder);

// PATCH /api/admin/orders/:id/status - Update fulfillment workflow state
router.patch('/:id/status', orderController.updateOrderStatus);

// PATCH /api/admin/orders/:id/payment-status - Update manual payment audit status
router.patch('/:id/payment-status', orderController.updateOrderPaymentStatus);

// POST /api/admin/orders/:id/refunds - Process PayU online refund or record COD payout
router.post('/:id/refunds', returnRefundController.processRefund);

// GET /api/admin/orders/:id/refunds - Audit list of all refunds for an order
router.get('/:id/refunds', returnRefundController.getOrderRefunds);

// POST /api/admin/orders/:id/rto - Record Return to Origin arrival, condition inspection & inventory restock
router.post('/:id/rto', returnRefundController.processRtoReceipt);

export default router;
