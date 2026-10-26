import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as addressController from '../controllers/addressController.js';
import * as orderController from '../controllers/orderController.js';
import * as shippingController from '../controllers/shippingController.js';
import * as returnRefundController from '../controllers/returnRefundController.js';
import * as notificationController from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { handleImageUpload } from '../middleware/uploadMiddleware.js';
import { actionRateLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

// Profile endpoints
router.get('/profile', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

// Customer Notification Preferences (Step 26)
router.get('/preferences/notifications', authenticateToken, notificationController.getPreferences);
router.put('/preferences/notifications', authenticateToken, notificationController.updatePreferences);

// Customer Address endpoints (Step 14)
router.get('/addresses', authenticateToken, addressController.getAddresses);
router.post('/addresses', authenticateToken, addressController.createAddress);
router.get('/addresses/:id', authenticateToken, addressController.getAddress);
router.put('/addresses/:id', authenticateToken, addressController.updateAddress);
router.delete('/addresses/:id', authenticateToken, addressController.deleteAddress);
router.patch('/addresses/:id/default', authenticateToken, addressController.setDefaultAddress);

// Customer Order History endpoints (Step 15 & 22)
router.get('/orders', authenticateToken, orderController.getCustomerOrders);
router.get('/orders/return-policy', returnRefundController.getReturnPolicy);
router.get('/orders/:id', authenticateToken, orderController.getCustomerOrder);
router.get('/orders/:id/tracking', authenticateToken, shippingController.getCustomerOrderTracking);

// Customer Cancellation & Returns & Photo Uploads (Step 23 - Protected with action rate limiter)
router.post('/orders/:id/cancel', authenticateToken, actionRateLimiter, returnRefundController.cancelOrderByCustomer);
router.post('/orders/:id/returns', authenticateToken, actionRateLimiter, returnRefundController.createReturnRequest);
router.post('/returns/upload', authenticateToken, handleImageUpload, returnRefundController.uploadReturnEvidence);
router.get('/returns', authenticateToken, returnRefundController.getCustomerReturns);
router.get('/returns/:id', authenticateToken, returnRefundController.getCustomerReturn);

export default router;
