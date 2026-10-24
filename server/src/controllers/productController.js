import * as productService from '../services/productService.js';

/**
 * Controller for Product Endpoints
 */

/**
 * GET /api/products
 * Supports: search, categoryId, size, color, minPrice, maxPrice, availability, featured, isActive, page, limit, sortBy, sortOrder
 * Public visitor: returns active products only
 * Admin: returns both active and inactive products (honoring query filters)
 */
export async function getProducts(req, res, next) {
  try {
    const {
      search,
      categoryId,
      size,
      color,
      minPrice,
      maxPrice,
      availability,
      isActive,
      featured,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const isAdmin = Boolean(req.user && req.user.role === 'ADMIN');

    const result = await productService.getProducts(
      {
        search,
        categoryId,
        size,
        color,
        minPrice,
        maxPrice,
        availability,
        isActive,
        featured,
        page,
        limit,
        sortBy,
        sortOrder,
      },
      isAdmin
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      filtersApplied: result.filtersApplied,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving products',
    });
  }
}

/**
 * GET /api/products/filters or /api/products/filter-options
 * Returns available filter facets: active categories, sizes, colors, price bounds
 */
export async function getProductFilterOptions(req, res, next) {
  try {
    const filterOptions = await productService.getProductFilterOptions();
    return res.status(200).json({
      success: true,
      data: filterOptions,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving product filter options',
    });
  }
}

/**
 * GET /api/products/:id
 */
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = Boolean(req.user && req.user.role === 'ADMIN');

    const product = await productService.getProductById(id, isAdmin);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving product',
    });
  }
}

/**
 * POST /api/products
 * Requires Authentication + Admin
 */
export async function createProduct(req, res, next) {
  try {
    const {
      title,
      description,
      categoryId,
      brand,
      featured,
      isActive,
    } = req.body || {};

    const product = await productService.createProduct({
      title,
      description,
      categoryId,
      brand,
      featured,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating product',
    });
  }
}

/**
 * PUT /api/products/:id
 * Requires Authentication + Admin
 */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      categoryId,
      brand,
      featured,
      isActive,
    } = req.body || {};

    const product = await productService.updateProduct(id, {
      title,
      description,
      categoryId,
      brand,
      featured,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating product',
    });
  }
}

/**
 * PATCH /api/products/:id/status
 * Requires Authentication + Admin
 */
export async function updateProductStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean field is required',
      });
    }

    const product = await productService.updateProductStatus(id, isActive);

    return res.status(200).json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: product,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating product status',
    });
  }
}

/**
 * DELETE /api/products/:id
 * Requires Authentication + Admin
 */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    await productService.deleteProduct(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error deleting product',
    });
  }
}
