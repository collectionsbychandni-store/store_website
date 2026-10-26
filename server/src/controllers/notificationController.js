import notificationService from '../services/notificationService.js';
import { getSanitizedNotificationConfig } from '../config/notificationConfig.js';

/**
 * Collections by Chandni - Notification Controller
 *
 * Implements Launch Step 26:
 * - Customer notification preference management
 * - Admin notification logs, analytics, config inspection, and retry
 */

/**
 * Customer: Get notification preferences
 * GET /api/account/preferences/notifications
 */
export async function getPreferences(req, res) {
  try {
    const userId = req.user.id;
    const preferences = await notificationService.getCustomerPreferences(userId);
    return res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve notification preferences',
    });
  }
}

/**
 * Customer: Update notification preferences
 * PUT /api/account/preferences/notifications
 */
export async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const { emailNotifications, whatsappNotifications } = req.body;

    const updated = await notificationService.updateCustomerPreferences(userId, {
      emailNotifications,
      whatsappNotifications,
    });

    return res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: updated,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update notification preferences',
    });
  }
}

/**
 * Admin: Get paginated notifications log
 * GET /api/admin/notifications
 */
export async function getAdminNotifications(req, res) {
  try {
    const { page, limit, channel, event, status, orderId, search } = req.query;
    const result = await notificationService.getAdminNotifications({
      page,
      limit,
      channel,
      event,
      status,
      orderId,
      search,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve notification logs',
    });
  }
}

/**
 * Admin: Get notification delivery analytics and statistics
 * GET /api/admin/notifications/stats
 */
export async function getNotificationStats(req, res) {
  try {
    const stats = await notificationService.getNotificationStats();
    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve notification statistics',
    });
  }
}

/**
 * Admin: Get sanitized notification provider configuration
 * GET /api/admin/notifications/config
 */
export async function getNotificationConfig(req, res) {
  try {
    const config = getSanitizedNotificationConfig();
    return res.json({
      success: true,
      config,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve notification configuration',
    });
  }
}

/**
 * Admin: Manually retry a failed or skipped notification
 * POST /api/admin/notifications/:id/retry
 */
export async function retryNotification(req, res) {
  try {
    const { id } = req.params;
    const result = await notificationService.retryNotification(id);
    return res.json({
      success: true,
      message: `Notification retry processed with status: ${result.status}`,
      notification: result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retry notification',
    });
  }
}

export default {
  getPreferences,
  updatePreferences,
  getAdminNotifications,
  getNotificationStats,
  getNotificationConfig,
  retryNotification,
};
