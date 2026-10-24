import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import * as variantController from '../controllers/variantController.js';
import * as productImageController from '../controllers/productImageController.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';
import { handleImageUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Storage provider status endpoint
router.get('/storage/status', productImageController.getStorageStatus);

// Product Image sub-routes
router.get('/:productId/images', productImageController.getProductImages);
router.post(
  '/:productId/images',
  authenticateToken,
  requireAdmin,
  handleImageUpload,
  productImageController.uploadProductImages
);
router.patch(
  '/:productId/images/reorder',
  authenticateToken,
  requireAdmin,
  productImageController.reorderProductImages
);
router.patch(
  '/:productId/images/:imageId/primary',
  authenticateToken,
  requireAdmin,
  productImageController.setPrimaryImage
);
router.patch(
  '/:productId/images/:imageId/alt',
  authenticateToken,
  requireAdmin,
  productImageController.updateImageAltText
);
router.delete(
  '/:productId/images/:imageId',
  authenticateToken,
  requireAdmin,
  productImageController.deleteProductImage
);

// Product Variants sub-routes
router.get('/:productId/variants', variantController.getProductVariants);
router.post('/:productId/variants', authenticateToken, requireAdmin, variantController.createProductVariant);

// Filter Options metadata endpoint
router.get('/filters', productController.getProductFilterOptions);
router.get('/filter-options', productController.getProductFilterOptions);

// Public Read Endpoints (with optionalAuth to allow Admin to see inactive items)
router.get('/', optionalAuth, productController.getProducts);
router.get('/:id', optionalAuth, productController.getProductById);

// Protected Admin Mutation Endpoints
router.post('/', authenticateToken, requireAdmin, productController.createProduct);
router.put('/:id', authenticateToken, requireAdmin, productController.updateProduct);
router.patch('/:id/status', authenticateToken, requireAdmin, productController.updateProductStatus);
router.delete('/:id', authenticateToken, requireAdmin, productController.deleteProduct);

export default router;
