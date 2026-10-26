import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import productRoutes from './productRoutes.js';
import variantRoutes from './variantRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import storefrontRoutes from './storefrontRoutes.js';
import cartRoutes from './cartRoutes.js';
import accountRoutes from './accountRoutes.js';
import checkoutRoutes from './checkoutRoutes.js';
import orderRoutes from './orderRoutes.js';
import bannerRoutes from './bannerRoutes.js';
import customerRoutes from './customerRoutes.js';
import reportRoutes from './reportRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import returnRoutes from './returnRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

// Modular routes mounted here
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/admin/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/variants', variantRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/storefront', storefrontRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/addresses', accountRoutes); // convenient direct alias
router.use('/banners', bannerRoutes);
router.use('/admin/banners', bannerRoutes);
router.use('/admin/customers', customerRoutes);
router.use('/admin/orders', orderRoutes);
router.use('/orders', orderRoutes);
router.use('/admin/reports', reportRoutes);
router.use('/shipping', shippingRoutes);
router.use('/admin/shipping', shippingRoutes);
router.use('/admin/returns', returnRoutes);
router.use('/returns', returnRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin/notifications', notificationRoutes);

export default router;

