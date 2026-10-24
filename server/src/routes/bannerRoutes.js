import { Router } from 'express';
import * as bannerController from '../controllers/bannerController.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';
import { handleImageUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public Banner Endpoints (optionalAuth allows admin to request ?all=true)
router.get('/', optionalAuth, bannerController.getBanners);

// Admin Mutation Endpoints
router.post('/upload', authenticateToken, requireAdmin, handleImageUpload, bannerController.uploadImage);
router.patch('/reorder', authenticateToken, requireAdmin, bannerController.reorderBanners);

router.get('/:id', optionalAuth, bannerController.getBannerById);
router.post('/', authenticateToken, requireAdmin, bannerController.createBanner);
router.put('/:id', authenticateToken, requireAdmin, bannerController.updateBanner);
router.patch('/:id/status', authenticateToken, requireAdmin, bannerController.updateBannerStatus);
router.delete('/:id', authenticateToken, requireAdmin, bannerController.deleteBanner);

export default router;
