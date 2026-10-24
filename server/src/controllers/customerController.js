import * as customerService from '../services/customerService.js';

/**
 * Controller for Admin Customer Management Endpoints
 * All endpoints require Admin Authentication & Authorization
 */

/**
 * GET /api/admin/customers
 * Paginated customer directory with search and order statistics
 */
export async function getCustomers(req, res) {
  try {
    const {
      search,
      status,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await customerService.getCustomers({
      search,
      status,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
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
      message: error.message || 'Error retrieving customer directory',
    });
  }
}

/**
 * GET /api/admin/customers/stats
 * Store customer statistics (total, active, inactive, new this month)
 */
export async function getCustomerStats(req, res) {
  try {
    const stats = await customerService.getCustomerStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving customer statistics',
    });
  }
}

/**
 * GET /api/admin/customers/:id
 * Detailed customer profile with addresses, order history, and spending summary
 */
export async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving customer profile',
    });
  }
}

/**
 * GET /api/admin/customers/:id/orders
 * Customer order history for admin view
 */
export async function getCustomerOrders(req, res) {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    return res.status(200).json({
      success: true,
      data: customer.orders || [],
      summary: customer.summary,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving customer orders',
    });
  }
}

/**
 * PATCH /api/admin/customers/:id/status
 * Activates or deactivates a customer account
 */
export async function updateCustomerStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean flag is required',
      });
    }

    const updated = await customerService.updateCustomerStatus(id, isActive);

    return res.status(200).json({
      success: true,
      message: `Customer account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating customer status',
    });
  }
}

export default {
  getCustomers,
  getCustomerStats,
  getCustomerById,
  getCustomerOrders,
  updateCustomerStatus,
};
