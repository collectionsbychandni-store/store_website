import { Router } from 'express';
import * as shippingController from '../controllers/shippingController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Webhook endpoint (Provider callbacks)
router.post('/webhook', shippingController.handleShiprocketWebhook);

// Protected Admin Shipping Operations
router.get('/config', authenticateToken, requireAdmin, shippingController.getShippingConfig);

// Order-specific shipping operations
router.get('/orders/:id/serviceability', authenticateToken, requireAdmin, shippingController.checkOrderServiceability);
router.post('/orders/:id/create', authenticateToken, requireAdmin, shippingController.createShipment);
router.get('/orders/:id/shipments', authenticateToken, requireAdmin, shippingController.getOrderShipments);
router.post('/orders/:id/return', authenticateToken, requireAdmin, shippingController.createReturnOrder);

// Shipment-level operations
router.post('/shipments/:shipmentId/assign-awb', authenticateToken, requireAdmin, shippingController.assignAwb);
router.post('/shipments/:shipmentId/schedule-pickup', authenticateToken, requireAdmin, shippingController.schedulePickup);
router.post('/shipments/:shipmentId/label', authenticateToken, requireAdmin, shippingController.generateLabel);
router.post('/shipments/:shipmentId/manifest', authenticateToken, requireAdmin, shippingController.generateManifest);
router.get('/shipments/:shipmentId/track', authenticateToken, requireAdmin, shippingController.trackShipment);
router.post('/shipments/:shipmentId/cancel', authenticateToken, requireAdmin, shippingController.cancelShipment);

export default router;
