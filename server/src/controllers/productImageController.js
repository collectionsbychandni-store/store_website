import * as productImageService from '../services/productImageService.js';

/**
 * Controller for Product Image Management
 */

/**
 * GET /api/products/:productId/images
 * Public / Admin: returns all images for a product in display order
 */
export async function getProductImages(req, res) {
  try {
    const { productId } = req.params;
    const images = await productImageService.getProductImages(productId);

    return res.status(200).json({
      success: true,
      data: images,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error fetching product images',
      code: error.code,
    });
  }
}

/**
 * POST /api/products/:productId/images
 * Admin only: uploads one or more images using multipart/form-data
 */
export async function uploadProductImages(req, res) {
  try {
    const { productId } = req.params;
    const files = req.uploadedFiles || [];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided. Please select at least one image to upload.',
        code: 'NO_FILES_PROVIDED',
      });
    }

    // Extract optional altText array or single string from body
    let altTextList = [];
    if (req.body?.altText) {
      altTextList = Array.isArray(req.body.altText) ? req.body.altText : [req.body.altText];
    } else if (req.body?.altTexts) {
      try {
        altTextList = JSON.parse(req.body.altTexts);
      } catch (e) {
        altTextList = [req.body.altTexts];
      }
    }

    const uploaded = await productImageService.uploadProductImages(
      productId,
      files,
      altTextList
    );

    return res.status(201).json({
      success: true,
      message: `${uploaded.length} ${uploaded.length === 1 ? 'image' : 'images'} uploaded successfully.`,
      data: uploaded,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to upload product images',
      code: error.code,
    });
  }
}

/**
 * PATCH /api/products/:productId/images/reorder
 * Admin only: accepts an ordered list of image IDs and updates sortOrder
 */
export async function reorderProductImages(req, res) {
  try {
    const { productId } = req.params;
    const { imageIds } = req.body || {};

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'imageIds must be a non-empty array of image IDs in desired sort order',
        code: 'INVALID_IMAGE_IDS',
      });
    }

    const reordered = await productImageService.reorderProductImages(productId, imageIds);

    return res.status(200).json({
      success: true,
      message: 'Product images reordered successfully',
      data: reordered,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to reorder product images',
      code: error.code,
    });
  }
}

/**
 * PATCH /api/products/:productId/images/:imageId/primary
 * Admin only: sets an image as the product primary image
 */
export async function setPrimaryImage(req, res) {
  try {
    const { productId, imageId } = req.params;

    const images = await productImageService.setPrimaryProductImage(productId, imageId);

    return res.status(200).json({
      success: true,
      message: 'Primary product image updated successfully',
      data: images,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to set primary image',
      code: error.code,
    });
  }
}

/**
 * PATCH /api/products/:productId/images/:imageId/alt
 * Admin only: updates alt text for a specific image
 */
export async function updateImageAltText(req, res) {
  try {
    const { productId, imageId } = req.params;
    const { altText } = req.body || {};

    const updated = await productImageService.updateImageAltText(
      productId,
      imageId,
      altText
    );

    return res.status(200).json({
      success: true,
      message: 'Image alt text updated successfully',
      data: updated,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update image alt text',
      code: error.code,
    });
  }
}

/**
 * DELETE /api/products/:productId/images/:imageId
 * Admin only: deletes an image safely from Cloudinary and database
 */
export async function deleteProductImage(req, res) {
  try {
    const { productId, imageId } = req.params;

    const result = await productImageService.deleteProductImage(productId, imageId);

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete product image',
      code: error.code,
    });
  }
}

/**
 * GET /api/products/storage/status
 * Returns current status of cloud storage provider
 */
export async function getStorageStatus(req, res) {
  try {
    const status = productImageService.getStorageStatus();
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve storage status',
    });
  }
}

export default {
  getProductImages,
  uploadProductImages,
  reorderProductImages,
  setPrimaryImage,
  updateImageAltText,
  deleteProductImage,
  getStorageStatus,
};
