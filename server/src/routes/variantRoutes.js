import { Router } from 'express';
import * as variantController from '../controllers/variantController.js';
import * as inventoryController from '../controllers/inventoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Variant Detail
router.get('/:id', variantController.getVariantById);

// Admin Variant Mutations
router.put('/:id', authenticateToken, requireAdmin, variantController.updateVariant);
router.patch('/:id/status', authenticateToken, requireAdmin, variantController.updateVariantStatus);
router.patch('/:id/stock', authenticateToken, requireAdmin, inventoryController.adjustStock);
router.delete('/:id', authenticateToken, requireAdmin, variantController.deleteVariant);

export default router;
