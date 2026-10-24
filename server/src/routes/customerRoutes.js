import { Router } from 'express';
import * as customerController from '../controllers/customerController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All customer management endpoints require Admin authentication & authorization
router.use(authenticateToken, requireAdmin);

// Customer stats
router.get('/stats', customerController.getCustomerStats);

// Customer directory listing & search
router.get('/', customerController.getCustomers);

// Customer details & order history
router.get('/:id', customerController.getCustomerById);
router.get('/:id/orders', customerController.getCustomerOrders);

// Account status toggle
router.patch('/:id/status', customerController.updateCustomerStatus);

export default router;
