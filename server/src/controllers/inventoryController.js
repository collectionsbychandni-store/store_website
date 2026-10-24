import * as inventoryService from '../services/inventoryService.js';

/**
 * Controller for Inventory Endpoints (/api/inventory)
 * All endpoints require Admin Authentication
 */

/**
 * GET /api/inventory
 * Retrieves paginated catalog inventory with KPI summary
 */
export async function getInventory(req, res) {
  try {
    const {
      search,
      productId,
      categoryId,
      stockStatus,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await inventoryService.getInventory({
      search,
      productId,
      categoryId,
      stockStatus,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving inventory',
    });
  }
}

/**
 * GET /api/inventory/alerts
 * Retrieves low-stock and out-of-stock operational alerts
 */
export async function getAlerts(req, res) {
  try {
    const {
      search,
      categoryId,
      stockStatus,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await inventoryService.getLowStockAlerts({
      search,
      categoryId,
      stockStatus,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving inventory alerts',
    });
  }
}

/**
 * GET /api/inventory/reports
 * Retrieves inventory reports by product, by category, and stock health lists
 */
export async function getReports(req, res) {
  try {
    const { categoryId } = req.query;

    const report = await inventoryService.getInventoryReports({
      categoryId,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating inventory reports',
    });
  }
}

/**
 * GET /api/inventory/adjustments
 * Retrieves stock adjustment audit trail
 */
export async function getAdjustments(req, res) {
  try {
    const { variantId, search, page, limit } = req.query;

    const result = await inventoryService.getAdjustments({
      variantId,
      search,
      page,
      limit,
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
      message: error.message || 'Error retrieving stock adjustments',
    });
  }
}

/**
 * GET /api/inventory/export-csv
 * Exports filtered inventory to a downloadable RFC 4180 CSV file
 * Includes formula-injection protection and custom date filename
 */
export async function exportCsv(req, res) {
  try {
    const {
      search,
      productId,
      categoryId,
      stockStatus,
      sortBy,
      sortOrder,
    } = req.query;

    const { csvContent, filename, recordCount } = await inventoryService.generateInventoryCsv({
      search,
      productId,
      categoryId,
      stockStatus,
      sortBy,
      sortOrder,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Records', String(recordCount));

    return res.status(200).send(csvContent);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error exporting inventory CSV',
    });
  }
}

/**
 * PATCH /api/variants/:id/stock
 * Adjusts variant inventory and records an audit log
 */
export async function adjustStock(req, res) {
  try {
    const { id } = req.params;
    const { mode, adjustmentType, quantity, adjustment, reason } = req.body || {};
    const adminUserId = req.user?.id || null;

    const result = await inventoryService.adjustStock(id, {
      mode: mode || adjustmentType,
      quantity,
      adjustment,
      reason,
      adminUserId,
    });

    return res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        ...result.variant,
        variant: result.variant,
        adjustment: result.adjustment,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error adjusting stock',
    });
  }
}

export default {
  getInventory,
  getAlerts,
  getReports,
  getAdjustments,
  exportCsv,
  adjustStock,
};
