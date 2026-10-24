import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

// Customer Registration & Login (Brute-force protected)
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);

// Admin Dedicated Login (Brute-force protected)
router.post('/admin/login', authRateLimiter, authController.adminLogin);

// Current User Profile & Updates
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);

// Logout
router.post('/logout', authController.logout);

export default router;
