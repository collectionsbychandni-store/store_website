import * as reportService from '../services/reportService.js';

/**
 * Report Controller (/api/admin/reports)
 * Step 20: Sales Reports & Business Analytics
 * All endpoints require Admin Authentication & Authorization
 */

/**
 * GET /api/admin/reports/sales-summary
 * Returns key performance cards: Gross Sales, Net Sales, Paid Orders, Units Sold, Refunds, AOV
 */
export async function getSalesSummary(req, res) {
  try {
    const { preset, startDate, endDate } = req.query;
    const summary = await reportService.getSalesSummary({
      preset,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating sales summary report',
    });
  }
}

/**
 * GET /api/admin/reports/sales-trends
 * Returns time-series daily buckets for sales and order volume
 */
export async function getSalesTrends(req, res) {
  try {
    const { preset, startDate, endDate } = req.query;
    const trends = await reportService.getSalesTrends({
      preset,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating sales trends',
    });
  }
}

/**
 * GET /api/admin/reports/products
 * Returns best-selling products ranked by units sold or gross sales
 */
export async function getProductPerformance(req, res) {
  try {
    const { preset, startDate, endDate, page, limit, sortBy, sortOrder } = req.query;
    const products = await reportService.getProductPerformance({
      preset,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: products.data,
      pagination: products.pagination,
      period: products.period,
      notice: products.notice,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating product performance report',
    });
  }
}

/**
 * GET /api/admin/reports/categories
 * Returns category sales volume and revenue share
 */
export async function getCategoryPerformance(req, res) {
  try {
    const { preset, startDate, endDate } = req.query;
    const categories = await reportService.getCategoryPerformance({
      preset,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: categories.data,
      totalGrossSales: categories.totalGrossSales,
      period: categories.period,
      notice: categories.notice,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating category performance report',
    });
  }
}

/**
 * GET /api/admin/reports/order-breakdown
 * Returns order status, payment status, and payment method distribution
 */
export async function getOrderBreakdown(req, res) {
  try {
    const { preset, startDate, endDate } = req.query;
    const breakdown = await reportService.getOrderBreakdown({
      preset,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating order breakdown report',
    });
  }
}

/**
 * GET /api/admin/reports/customer-metrics
 * Returns new vs repeat customer metrics for the selected period
 */
export async function getCustomerMetrics(req, res) {
  try {
    const { preset, startDate, endDate } = req.query;
    const metrics = await reportService.getCustomerMetrics({
      preset,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating customer analytics',
    });
  }
}

/**
 * GET /api/admin/reports/export-csv
 * Exports specified report to an RFC 4180 CSV file with formula-injection protection
 */
export async function exportCsv(req, res) {
  try {
    const { reportType = 'sales-summary', preset, startDate, endDate } = req.query;

    const { csvContent, filename, rowCount } = await reportService.generateReportCsv(reportType, {
      preset,
      startDate,
      endDate,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Rows', String(rowCount));

    return res.status(200).send(csvContent);
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error generating CSV report',
    });
  }
}

export default {
  getSalesSummary,
  getSalesTrends,
  getProductPerformance,
  getCategoryPerformance,
  getOrderBreakdown,
  getCustomerMetrics,
  exportCsv,
};
