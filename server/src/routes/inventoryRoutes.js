import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All inventory operations require Admin Authentication
router.use(authenticateToken, requireAdmin);

// GET /api/inventory/alerts - Operational low-stock & out-of-stock alerts
router.get('/alerts', inventoryController.getAlerts);

// GET /api/inventory/reports - Inventory aggregation reports by product & category
router.get('/reports', inventoryController.getReports);

// GET /api/inventory/adjustments - Audit history of stock modifications
router.get('/adjustments', inventoryController.getAdjustments);

// GET /api/inventory/export-csv - Downloadable CSV export with formula sanitization
router.get('/export-csv', inventoryController.exportCsv);

// GET /api/inventory - General paginated inventory list & KPIs
router.get('/', inventoryController.getInventory);

export default router;
