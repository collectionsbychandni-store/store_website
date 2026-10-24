import { Router } from 'express';
import * as cartController from '../controllers/cartController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// All cart routes accept optional authentication (attaches req.user if logged in, otherwise handles guest)
router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, cartController.addCartItem);
router.patch('/items/:id', optionalAuth, cartController.updateCartItem);
router.delete('/items/:id', optionalAuth, cartController.removeCartItem);
router.delete('/', optionalAuth, cartController.clearCart);

export default router;
