import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All administrative dashboard routes require authenticated admin credentials
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/dashboard
router.get('/', dashboardController.getDashboard);
router.get('/summary', dashboardController.getDashboard);

export default router;
