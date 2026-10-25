import * as categoryService from '../services/categoryService.js';

/**
 * Controller for Category Endpoints
 */

/**
 * GET /api/categories
 * Supports query params: search, page, limit, isActive, parentId
 */
export async function getCategories(req, res, next) {
  try {
    const { search, page, limit, isActive, parentId } = req.query;

    const result = await categoryService.getCategories({
      search,
      page,
      limit,
      isActive,
      parentId,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving categories',
    });
  }
}

/**
 * GET /api/categories/:id
 */
export async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving category',
    });
  }
}

/**
 * POST /api/categories
 * Requires Authentication + Admin
 */
export async function createCategory(req, res, next) {
  try {
    const { name, description, imageUrl, parentId, isActive } = req.body || {};

    const category = await categoryService.createCategory({
      name,
      description,
      imageUrl,
      parentId,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating category',
    });
  }
}

/**
 * PUT /api/categories/:id
 * Requires Authentication + Admin
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, parentId, isActive } = req.body || {};

    const category = await categoryService.updateCategory(id, {
      name,
      description,
      imageUrl,
      parentId,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating category',
    });
  }
}

/**
 * PATCH /api/categories/:id/status
 * Requires Authentication + Admin
 */
export async function updateCategoryStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean field is required',
      });
    }

    const category = await categoryService.updateCategoryStatus(id, isActive);

    return res.status(200).json({
      success: true,
      message: `Category ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: category,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating category status',
    });
  }
}

/**
 * DELETE /api/categories/:id
 * Requires Authentication + Admin
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    await categoryService.deleteCategory(id);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error deleting category',
    });
  }
}

/**
 * POST /api/categories/upload
 * Requires Authentication + Admin
 * Uploads a category image (Cloudinary or local static storage fallback)
 */
export async function uploadImage(req, res, next) {
  try {
    const file = req.file || (req.uploadedFiles && req.uploadedFiles[0]);
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided for upload.',
        code: 'NO_FILE_PROVIDED',
      });
    }

    const result = await categoryService.uploadCategoryImage(file);

    return res.status(200).json({
      success: true,
      message: 'Category image uploaded successfully',
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Category image upload failed',
      code: error.code || 'UPLOAD_FAILED',
    });
  }
}

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  uploadImage,
};
