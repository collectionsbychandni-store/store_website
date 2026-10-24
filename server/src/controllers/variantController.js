import * as variantService from '../services/variantService.js';

/**
 * Controller for Variant Endpoints
 */

/**
 * GET /api/products/:productId/variants
 */
export async function getProductVariants(req, res) {
  try {
    const { productId } = req.params;
    const variants = await variantService.getVariantsByProductId(productId);
    return res.status(200).json({
      success: true,
      data: variants,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving product variants',
    });
  }
}

/**
 * GET /api/variants/:id
 */
export async function getVariantById(req, res) {
  try {
    const { id } = req.params;
    const variant = await variantService.getVariantById(id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: variant,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving variant',
    });
  }
}

/**
 * POST /api/products/:productId/variants
 * Admin only
 */
export async function createProductVariant(req, res) {
  try {
    const { productId } = req.params;
    const {
      size,
      color,
      sku,
      mrp,
      sellingPrice,
      stock,
      stockQuantity,
      lowStockThreshold,
      isActive,
    } = req.body || {};

    const variant = await variantService.createVariant(productId, {
      size,
      color,
      sku,
      mrp,
      sellingPrice,
      stock,
      stockQuantity,
      lowStockThreshold,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: 'Product variant created successfully',
      data: variant,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating variant',
    });
  }
}

/**
 * PUT /api/variants/:id
 * Admin only
 */
export async function updateVariant(req, res) {
  try {
    const { id } = req.params;
    const {
      size,
      color,
      sku,
      mrp,
      sellingPrice,
      stock,
      stockQuantity,
      lowStockThreshold,
      isActive,
    } = req.body || {};

    const updated = await variantService.updateVariant(id, {
      size,
      color,
      sku,
      mrp,
      sellingPrice,
      stock,
      stockQuantity,
      lowStockThreshold,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: 'Product variant updated successfully',
      data: updated,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating variant',
    });
  }
}

/**
 * PATCH /api/variants/:id/status
 * Admin only
 */
export async function updateVariantStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean field is required',
      });
    }

    const updated = await variantService.updateVariantStatus(id, isActive);

    return res.status(200).json({
      success: true,
      message: `Variant ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating variant status',
    });
  }
}

/**
 * DELETE /api/variants/:id
 * Admin only
 */
export async function deleteVariant(req, res) {
  try {
    const { id } = req.params;
    await variantService.deleteVariant(id);

    return res.status(200).json({
      success: true,
      message: 'Variant deleted successfully',
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error deleting variant',
    });
  }
}
