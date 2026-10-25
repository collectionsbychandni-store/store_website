import { Router } from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { handleImageUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public Read Endpoints
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// Protected Admin Upload Endpoint
router.post(
  '/upload',
  authenticateToken,
  requireAdmin,
  handleImageUpload,
  categoryController.uploadImage
);

// Protected Admin Mutation Endpoints
router.post('/', authenticateToken, requireAdmin, categoryController.createCategory);
router.put('/:id', authenticateToken, requireAdmin, categoryController.updateCategory);
router.patch('/:id/status', authenticateToken, requireAdmin, categoryController.updateCategoryStatus);
router.delete('/:id', authenticateToken, requireAdmin, categoryController.deleteCategory);

export default router;
