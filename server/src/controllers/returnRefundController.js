import * as returnRefundService from '../services/returnRefundService.js';
import { isCloudinaryConfigured, uploadBufferToCloudinary } from '../config/cloudinary.js';

/**
 * Collections by Chandni - Returns, Refunds & Cancellations Controller
 *
 * Implements Launch Step 23:
 * - Customer order cancellation endpoint
 * - Customer return request submission with photo uploads
 * - Return policy endpoint
 * - Admin return approval, rejection, and physical inspection recording
 * - Admin PayU online refund & COD manual payout processing
 * - CSV export for accounting audit
 */

/**
 * GET /api/account/orders/return-policy
 * Public / Patron policy info
 */
export async function getReturnPolicy(req, res) {
  try {
    const policy = returnRefundService.getReturnPolicy();
    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching return policy',
    });
  }
}

/**
 * POST /api/account/orders/:id/cancel
 * Customer cancels their eligible order
 */
export async function cancelOrderByCustomer(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to cancel orders',
      });
    }

    const result = await returnRefundService.cancelOrderByCustomer({
      orderId: id,
      userId,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.order,
      refund: result.refund,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to cancel order',
    });
  }
}

/**
 * POST /api/account/returns/upload
 * Upload photo evidence for damaged / defective products
 */
export async function uploadReturnEvidence(req, res) {
  try {
    const files = req.uploadedFiles || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photo files provided for upload',
      });
    }

    const uploadedUrls = [];
    for (const file of files) {
      if (isCloudinaryConfigured()) {
        const uploadResult = await uploadBufferToCloudinary(file.buffer, {
          folder: 'collections_by_chandni/returns',
        });
        uploadedUrls.push(uploadResult.secure_url || uploadResult.url);
      } else {
        // Fallback: Inline data URL for test/dev resilience
        const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        uploadedUrls.push(base64Data);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${uploadedUrls.length} photo(s) uploaded successfully`,
      data: uploadedUrls,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to upload return evidence photos',
    });
  }
}

/**
 * POST /api/account/orders/:id/returns
 * Customer submits return request
 */
export async function createReturnRequest(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { items, reason, comments, evidenceImages } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to submit return request',
      });
    }

    const returnRequest = await returnRefundService.createReturnRequest({
      orderId: id,
      userId,
      items,
      reason,
      comments,
      evidenceImages,
    });

    return res.status(201).json({
      success: true,
      message: 'Return request submitted successfully. Our atelier team will review within 24-48 hours.',
      data: returnRequest,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to submit return request',
    });
  }
}

/**
 * GET /api/account/returns
 * Customer lists their own return requests
 */
export async function getCustomerReturns(req, res) {
  try {
    const userId = req.user?.id;
    const { page, limit, status } = req.query;

    const result = await returnRefundService.getReturnRequests({
      page,
      limit,
      status,
      userId,
      isAdmin: false,
    });

    return res.status(200).json({
      success: true,
      data: result.returns,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching returns',
    });
  }
}

/**
 * GET /api/account/returns/:id
 * Customer views single return request
 */
export async function getCustomerReturn(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const returnReq = await returnRefundService.getReturnRequestById(id);
    if (!returnReq || returnReq.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found or unauthorized',
      });
    }

    return res.status(200).json({
      success: true,
      data: returnReq,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching return request',
    });
  }
}

/**
 * ---------------------------------------------------------------------------
 * ADMIN RETURNS & REFUNDS ENDPOINTS
 * ---------------------------------------------------------------------------
 */

/**
 * GET /api/admin/returns
 * Admin lists all return requests
 */
export async function getAdminReturns(req, res) {
  try {
    const { page, limit, status, orderNumber } = req.query;

    const result = await returnRefundService.getReturnRequests({
      page,
      limit,
      status,
      orderNumber,
      isAdmin: true,
    });

    return res.status(200).json({
      success: true,
      data: result.returns,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving return requests',
    });
  }
}

/**
 * GET /api/admin/returns/:id
 * Admin views return request detail
 */
export async function getAdminReturn(req, res) {
  try {
    const { id } = req.params;
    const returnReq = await returnRefundService.getReturnRequestById(id);
    if (!returnReq) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: returnReq,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving return details',
    });
  }
}

/**
 * PATCH /api/admin/returns/:id/approve
 * Admin approves return request
 */
export async function approveReturn(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    const result = await returnRefundService.approveReturnRequest({
      returnRequestId: id,
      adminUser: req.user,
      notes,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to approve return request',
    });
  }
}

/**
 * PATCH /api/admin/returns/:id/reject
 * Admin rejects return request
 */
export async function rejectReturn(req, res) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body || {};

    const result = await returnRefundService.rejectReturnRequest({
      returnRequestId: id,
      rejectionReason,
      adminUser: req.user,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to reject return request',
    });
  }
}

/**
 * POST /api/admin/returns/:id/inspect
 * Admin records physical inspection and restocks eligible items
 */
export async function recordInspection(req, res) {
  try {
    const { id } = req.params;
    const { itemInspections, inspectionNotes } = req.body || {};

    const result = await returnRefundService.recordReturnInspection({
      returnRequestId: id,
      itemInspections,
      inspectionNotes,
      adminUser: req.user,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to record return inspection',
    });
  }
}

/**
 * POST /api/admin/orders/:id/refunds
 * Admin processes PayU refund or records COD payout
 */
export async function processRefund(req, res) {
  try {
    const { id } = req.params;
    const { returnRequestId, refundAmount, reason, payoutDetails } = req.body || {};

    const refund = await returnRefundService.processRefund({
      orderId: id,
      returnRequestId,
      refundAmount,
      reason,
      payoutDetails,
      adminUser: req.user,
    });

    return res.status(201).json({
      success: true,
      message: `Refund of ₹${Number(refund.amount).toLocaleString('en-IN')} processed successfully`,
      data: refund,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to process refund',
    });
  }
}

/**
 * GET /api/admin/orders/:id/refunds
 * Admin retrieves all refunds for an order
 */
export async function getOrderRefunds(req, res) {
  try {
    const { id } = req.params;
    const refunds = await returnRefundService.getRefundsForOrder(id);

    return res.status(200).json({
      success: true,
      data: refunds,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve refunds',
    });
  }
}

/**
 * GET /api/admin/returns/export/csv
 * Export returns and refunds for audit
 */
export async function exportReturnsCsv(req, res) {
  try {
    const { returns } = await returnRefundService.getReturnRequests({
      page: 1,
      limit: 1000,
      isAdmin: true,
    });

    const csvHeaders = [
      'Return ID',
      'Order Number',
      'Customer User ID',
      'Status',
      'Reason',
      'Items Count',
      'Is Restocked',
      'Date Created',
    ];

    const csvRows = returns.map((r) => [
      `"${r.id}"`,
      `"${r.orderNumber || r.order?.orderNumber || ''}"`,
      `"${r.userId}"`,
      `"${r.status}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      (r.items || []).length,
      r.isRestocked ? 'Yes' : 'No',
      `"${new Date(r.createdAt).toISOString()}"`,
    ]);

    const csvContent = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="collections_returns_audit.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error exporting returns CSV',
    });
  }
}

/**
 * POST /api/admin/orders/:id/rto
 * Admin records RTO receipt, physical inspection, restock & payment settlement
 */
export async function processRtoReceipt(req, res) {
  try {
    const { id } = req.params;
    const {
      rtoReason,
      inspectionNotes,
      itemInspections,
      refundPrepaid,
      refundAmount,
      payoutDetails,
    } = req.body || {};

    const result = await returnRefundService.processRtoReceipt({
      orderId: id,
      rtoReason,
      inspectionNotes,
      itemInspections,
      refundPrepaid,
      refundAmount,
      payoutDetails,
      adminUser: req.user,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to process RTO receipt',
    });
  }
}

