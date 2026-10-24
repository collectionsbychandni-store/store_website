import * as bannerService from '../services/bannerService.js';

/**
 * Controller for Banner Endpoints (/api/banners)
 */

/**
 * GET /api/banners
 * Public: returns only active and scheduled banners
 * Admin (with ?all=true or admin auth): returns all banners
 */
export async function getBanners(req, res) {
  try {
    const isAdminRequest = (req.user && req.user.role === 'ADMIN') && req.query.all === 'true';

    let banners;
    if (isAdminRequest) {
      banners = await bannerService.getAllBanners();
    } else {
      banners = await bannerService.getPublicBanners();
    }

    return res.status(200).json({
      success: true,
      data: banners,
      count: banners.length,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving banners',
    });
  }
}

/**
 * GET /api/banners/:id
 */
export async function getBannerById(req, res) {
  try {
    const { id } = req.params;
    const banner = await bannerService.getBannerById(id);

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving banner',
    });
  }
}

/**
 * POST /api/banners/upload
 * Admin only: Uploads a banner image to cloud storage
 */
export async function uploadImage(req, res) {
  try {
    const file = req.file || (req.uploadedFiles && req.uploadedFiles[0]);
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided for upload.',
        code: 'NO_FILE_PROVIDED',
      });
    }

    const result = await bannerService.uploadBannerImage(file);

    return res.status(200).json({
      success: true,
      message: 'Banner image uploaded successfully',
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Image upload failed',
      code: error.code || 'UPLOAD_FAILED',
    });
  }
}

/**
 * POST /api/banners
 * Admin only: Creates a new banner
 */
export async function createBanner(req, res) {
  try {
    const banner = await bannerService.createBanner(req.body || {});

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating banner',
    });
  }
}

/**
 * PUT /api/banners/:id
 * Admin only: Updates banner
 */
export async function updateBanner(req, res) {
  try {
    const { id } = req.params;
    const banner = await bannerService.updateBanner(id, req.body || {});

    return res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating banner',
    });
  }
}

/**
 * PATCH /api/banners/:id/status
 * Admin only: Activates or deactivates banner
 */
export async function updateBannerStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean is required',
      });
    }

    const banner = await bannerService.updateBannerStatus(id, isActive);

    return res.status(200).json({
      success: true,
      message: `Banner ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: banner,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating banner status',
    });
  }
}

/**
 * PATCH /api/banners/reorder
 * Admin only: Reorders banners sequentially
 */
export async function reorderBanners(req, res) {
  try {
    const { bannerIds } = req.body || {};
    const ids = Array.isArray(bannerIds) ? bannerIds : (Array.isArray(req.body) ? req.body : null);

    if (!ids || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'bannerIds array is required for reordering',
      });
    }

    const banners = await bannerService.reorderBanners(ids);

    return res.status(200).json({
      success: true,
      message: 'Banners reordered successfully',
      data: banners,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error reordering banners',
    });
  }
}

/**
 * DELETE /api/banners/:id
 * Admin only: Deletes a banner
 */
export async function deleteBanner(req, res) {
  try {
    const { id } = req.params;
    await bannerService.deleteBanner(id);

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error deleting banner',
    });
  }
}

export default {
  getBanners,
  getBannerById,
  uploadImage,
  createBanner,
  updateBanner,
  updateBannerStatus,
  reorderBanners,
  deleteBanner,
};
