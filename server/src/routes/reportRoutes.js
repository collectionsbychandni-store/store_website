import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All analytics and sales reporting operations require Admin privileges
router.use(authenticateToken, requireAdmin);

// Sales Summary (KPI cards)
router.get('/sales-summary', reportController.getSalesSummary);

// Sales Trends (Daily time-series)
router.get('/sales-trends', reportController.getSalesTrends);

// Best-selling products performance
router.get('/products', reportController.getProductPerformance);

// Category performance & revenue share
router.get('/categories', reportController.getCategoryPerformance);

// Order fulfillment and payment status distribution
router.get('/order-breakdown', reportController.getOrderBreakdown);

// Customer acquisition & repeat purchasing metrics
router.get('/customer-metrics', reportController.getCustomerMetrics);

// CSV Export
router.get('/export-csv', reportController.exportCsv);

export default router;
