import { Router } from 'express';
import * as returnRefundController from '../controllers/returnRefundController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All administrative return routes require authenticated admin credentials
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/returns/export/csv - Export CSV of return requests for financial audit
router.get('/export/csv', returnRefundController.exportReturnsCsv);

// GET /api/admin/returns - Paginated, filterable return requests
router.get('/', returnRefundController.getAdminReturns);

// GET /api/admin/returns/:id - Return request details with itemized conditions and photos
router.get('/:id', returnRefundController.getAdminReturn);

// PATCH /api/admin/returns/:id/approve - Approve return and trigger Shiprocket reverse pickup
router.patch('/:id/approve', returnRefundController.approveReturn);

// PATCH /api/admin/returns/:id/reject - Reject return with required reason
router.patch('/:id/reject', returnRefundController.rejectReturn);

// POST /api/admin/returns/:id/inspect - Record atelier inspection and restock inventory exactly once
router.post('/:id/inspect', returnRefundController.recordInspection);

export default router;
