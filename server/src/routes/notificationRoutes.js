import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

// Customer notification preferences routes
router.get('/preferences', authenticateToken, notificationController.getPreferences);
router.put('/preferences', authenticateToken, notificationController.updatePreferences);

// Admin notification monitoring & retry routes (strictly require ADMIN)
router.get('/', authenticateToken, requireAdmin, notificationController.getAdminNotifications);
router.get('/stats', authenticateToken, requireAdmin, notificationController.getNotificationStats);
router.get('/config', authenticateToken, requireAdmin, notificationController.getNotificationConfig);
router.post('/:id/retry', authenticateToken, requireAdmin, notificationController.retryNotification);

export default router;
