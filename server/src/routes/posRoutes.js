import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import * as posController from '../controllers/posController.js';

const router = Router();

// All POS routes strictly require Admin/Cashier authorization
router.use(authenticateToken, requireAdmin);

router.get('/products', posController.searchProducts);
router.get('/customers', posController.searchCustomers);
router.post('/checkout', posController.checkout);
router.get('/bills', posController.getRecentBills);
router.get('/bills/:id', posController.getBillDetails);
router.get('/config', posController.getPosConfig);

export default router;
