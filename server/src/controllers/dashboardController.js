import * as dashboardService from '../services/dashboardService.js';

/**
 * Collections by Chandni - Admin Dashboard Controller
 * GET /api/admin/dashboard
 */
export async function getDashboard(req, res) {
  try {
    const data = await dashboardService.getDashboardSummary();
    return res.json(data);
  } catch (error) {
    console.error('Failed to get dashboard summary:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve dashboard metrics',
    });
  }
}

export default {
  getDashboard,
};
