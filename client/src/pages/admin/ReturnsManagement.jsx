import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import * as returnRefundService from '../../services/returnRefundService';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Sparkles,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  DollarSign,
  AlertTriangle,
  User,
  Calendar,
} from 'lucide-react';

const STATUS_FILTERS = [
  'ALL',
  'REQUESTED',
  'APPROVED',
  'PICKUP_SCHEDULED',
  'IN_TRANSIT',
  'RECEIVED',
  'INSPECTED',
  'REFUND_PENDING',
  'COMPLETED',
  'REJECTED',
];

export default function ReturnsManagement() {
  const [returns, setReturns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Selected return for detail modal
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'VIEW' | 'APPROVE' | 'REJECT' | 'INSPECT' | 'REFUND' | 'VIEW_PHOTO'
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Modal forms
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [itemInspections, setItemInspections] = useState({});
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('UPI');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutIfsc, setPayoutIfsc] = useState('');
  const [payoutName, setPayoutName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturns = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await returnRefundService.getAdminReturns({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        orderNumber: search.trim() || undefined,
      });
      setReturns(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to retrieve return requests');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchReturns(1);
  }, [fetchReturns]);

  // Actions
  const handleApprove = async () => {
    if (!selectedReturn || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await returnRefundService.approveReturnRequest(selectedReturn.id, { notes });
      setActionSuccess(res.message || 'Return approved successfully.');
      setActiveModal(null);
      fetchReturns(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to approve return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReturn || isSubmitting) return;
    if (!rejectionReason.trim()) {
      setError('Please provide a specific rejection reason for the patron.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await returnRefundService.rejectReturnRequest(selectedReturn.id, {
        rejectionReason: rejectionReason.trim(),
      });
      setActionSuccess(res.message || 'Return rejected.');
      setActiveModal(null);
      fetchReturns(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to reject return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspect = async () => {
    if (!selectedReturn || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const inspectionPayload = (selectedReturn.items || []).map((item) => {
        const state = itemInspections[item.id] || { condition: 'EXCELLENT', restock: true };
        return {
          itemId: item.id,
          orderItemId: item.orderItemId,
          condition: state.condition,
          restock: state.restock,
        };
      });

      const res = await returnRefundService.recordReturnInspection(selectedReturn.id, {
        itemInspections: inspectionPayload,
        inspectionNotes,
      });

      setActionSuccess(res.message || 'Inspection saved and stock adjusted.');
      setActiveModal(null);
      fetchReturns(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to record inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedReturn || isSubmitting) return;
    const numAmt = parseFloat(refundAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please specify a valid positive refund amount.');
      return;
    }

    let payoutDetails = null;
    const isCod = selectedReturn.order?.paymentMethod === 'COD';
    if (isCod) {
      if (payoutMethod === 'UPI') {
        if (!payoutUpi.trim()) {
          setError('Please provide customer UPI VPA.');
          return;
        }
        payoutDetails = { method: 'UPI', upiId: payoutUpi.trim(), accountName: payoutName.trim() };
      } else {
        if (!payoutAccount.trim() || !payoutIfsc.trim()) {
          setError('Account Number and IFSC are required.');
          return;
        }
        payoutDetails = {
          method: 'BANK_TRANSFER',
          accountNumber: payoutAccount.trim(),
          ifsc: payoutIfsc.trim().toUpperCase(),
          accountName: payoutName.trim(),
        };
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await returnRefundService.processOrderRefund(selectedReturn.orderId, {
        returnRequestId: selectedReturn.id,
        refundAmount: numAmt,
        reason: refundReason || `Refund for return ${selectedReturn.id}`,
        payoutDetails,
      });
      setActionSuccess(res.message || 'Refund successfully processed.');
      setActiveModal(null);
      fetchReturns(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const requestedCount = returns.filter((r) => r.status === 'REQUESTED').length;
  const inspectedCount = returns.filter((r) => r.status === 'INSPECTED' || r.status === 'REFUND_PENDING').length;
  const completedCount = returns.filter((r) => r.status === 'COMPLETED').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800 block">
              Atelier Logistics & Financials
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900">
              Returns & Refunds Management
            </h1>
            <p className="text-xs text-stone-500 font-light mt-1">
              Review customer return requests, inspect returned garments, schedule reverse pickups, and execute PayU/COD refunds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/admin/returns/export/csv"
              download="collections_returns_audit.csv"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-semibold rounded-xs shadow-2xs transition-colors"
            >
              <Download size={14} />
              <span>Export Audit CSV</span>
            </a>
            <button
              type="button"
              onClick={() => fetchReturns(pagination.page)}
              className="p-2 bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 rounded-xs shadow-2xs transition-colors"
              title="Refresh Records"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
              Total Returns
            </span>
            <span className="font-serif text-2xl font-bold text-stone-900 mt-1 block">
              {pagination.total || returns.length}
            </span>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold block">
              Pending Review
            </span>
            <span className="font-serif text-2xl font-bold text-amber-800 mt-1 block">
              {requestedCount}
            </span>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-purple-700 font-semibold block">
              Awaiting Refund
            </span>
            <span className="font-serif text-2xl font-bold text-purple-800 mt-1 block">
              {inspectedCount}
            </span>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold block">
              Completed
            </span>
            <span className="font-serif text-2xl font-bold text-emerald-800 mt-1 block">
              {completedCount}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <XCircle size={14} />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{actionSuccess}</span>
            </div>
            <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex-1 max-w-sm relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by Order # or Return ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xs text-xs focus:outline-rose-800 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-stone-400 text-[10px] uppercase tracking-wider font-semibold">Status:</span>
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-rose-900 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Returns Table */}
        <div className="bg-white border border-stone-200 rounded-xs shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Return ID</th>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Restocked</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-rose-800" />
                      <span>Loading return requests...</span>
                    </td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-500">
                      No return requests match the selected filters.
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-stone-900">
                        {ret.id.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-rose-900">
                        {ret.orderNumber || ret.order?.orderNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-mono text-[11px]">
                        {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-stone-800 max-w-xs truncate" title={ret.reason}>
                        {ret.reason}
                      </td>
                      <td className="py-3 px-4 text-stone-700 font-medium">
                        {(ret.items || []).length} piece(s)
                      </td>
                      <td className="py-3 px-4">
                        {ret.isRestocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check size={11} /> Yes
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            ret.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : ret.status === 'APPROVED' || ret.status === 'PICKUP_SCHEDULED'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : ret.status === 'INSPECTED' || ret.status === 'REFUND_PENDING'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : ret.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {ret.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReturn(ret);
                            setActiveModal('VIEW');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xs transition-colors"
                        >
                          <Eye size={12} />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
              <span>
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchReturns(pagination.page - 1)}
                  className="p-1.5 border border-stone-200 rounded-xs hover:bg-white disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchReturns(pagination.page + 1)}
                  className="p-1.5 border border-stone-200 rounded-xs hover:bg-white disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- DETAIL MODAL --- */}
        {activeModal === 'VIEW' && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-xs border border-stone-200 max-w-2xl w-full p-6 shadow-xl space-y-6 my-8 text-xs">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-stone-200 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-rose-800 font-semibold block">
                    Return Request Record
                  </span>
                  <h3 className="font-serif text-xl font-bold text-stone-900 mt-0.5">
                    {selectedReturn.id}
                  </h3>
                  <p className="text-stone-500 font-mono text-[11px] mt-0.5">
                    Order: <strong className="text-stone-800">{selectedReturn.orderNumber || selectedReturn.order?.orderNumber}</strong> · Submitted: {new Date(selectedReturn.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Status & Lifecycle badge */}
              <div className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200/80 rounded-xs">
                <div>
                  <span className="text-stone-500 text-[10px] uppercase tracking-wider block">Lifecycle State</span>
                  <span className="font-semibold text-stone-900 text-sm">{selectedReturn.status}</span>
                </div>
                {selectedReturn.isRestocked && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-full border border-emerald-300">
                    Restocked to Inventory
                  </span>
                )}
              </div>

              {/* Reason & Comments */}
              <div className="space-y-2">
                <span className="font-semibold text-stone-800 uppercase tracking-wider text-[10px] block">
                  Customer Return Request Details
                </span>
                <div className="p-3 bg-[#FAF9F5] border border-stone-200/80 rounded-xs space-y-1">
                  <p><strong>Reason:</strong> {selectedReturn.reason}</p>
                  {selectedReturn.comments && <p className="text-stone-600 italic">"{selectedReturn.comments}"</p>}
                  {selectedReturn.rejectionReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs mt-1">
                      <strong>Rejection Reason:</strong> {selectedReturn.rejectionReason}
                    </div>
                  )}
                  {selectedReturn.inspectionNotes && (
                    <div className="p-2 bg-purple-50 border border-purple-200 text-purple-900 rounded-xs mt-1">
                      <strong>Inspection Notes:</strong> {selectedReturn.inspectionNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-semibold text-stone-800 uppercase tracking-wider text-[10px] block">
                  Returned Pieces ({(selectedReturn.items || []).length})
                </span>
                <div className="border border-stone-200 rounded-xs divide-y divide-stone-100 overflow-hidden">
                  {(selectedReturn.items || []).map((it) => (
                    <div key={it.id} className="p-3 flex items-center justify-between bg-white">
                      <div>
                        <span className="font-semibold text-stone-900 block">{it.productTitle}</span>
                        <span className="text-[11px] font-mono text-stone-400">SKU: {it.sku}</span>
                        <span className="text-[11px] text-stone-600 block">Condition: {it.condition}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-stone-900 block">Qty: {it.quantity}</span>
                        <span className="text-[11px] text-stone-600 font-mono">
                          @ ₹{Number(it.unitPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] font-semibold text-purple-700 block">
                          Restock: {it.restockStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              {Array.isArray(selectedReturn.evidenceImages) && selectedReturn.evidenceImages.length > 0 && (
                <div className="space-y-2">
                  <span className="font-semibold text-stone-800 uppercase tracking-wider text-[10px] block">
                    Photo Evidence
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedReturn.evidenceImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPreviewPhoto(img);
                          setActiveModal('VIEW_PHOTO');
                        }}
                        className="w-16 h-16 rounded-xs overflow-hidden border border-stone-200 hover:border-rose-800 relative group"
                      >
                        <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <Eye size={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-end gap-2">
                {selectedReturn.status === 'REQUESTED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setNotes('');
                        setActiveModal('APPROVE');
                      }}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xs"
                    >
                      Approve Return
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectionReason('');
                        setActiveModal('REJECT');
                      }}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xs"
                    >
                      Reject Return
                    </button>
                  </>
                )}

                {!selectedReturn.isRestocked && ['APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED'].includes(selectedReturn.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      const initial = {};
                      (selectedReturn.items || []).forEach((it) => {
                        initial[it.id] = { condition: 'EXCELLENT', restock: true };
                      });
                      setItemInspections(initial);
                      setInspectionNotes('Physical atelier inspection completed');
                      setActiveModal('INSPECT');
                    }}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xs"
                  >
                    Record Inspection & Restock
                  </button>
                )}

                {['INSPECTED', 'REFUND_PENDING'].includes(selectedReturn.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      const itemTotal = (selectedReturn.items || []).reduce(
                        (sum, i) => sum + (parseFloat(i.unitPrice) * parseInt(i.quantity, 10)),
                        0
                      );
                      setRefundAmount(itemTotal.toFixed(2));
                      setRefundReason(`Refund for Return Request ${selectedReturn.id}`);
                      setActiveModal('REFUND');
                    }}
                    className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white font-semibold rounded-xs"
                  >
                    Process Refund
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 font-semibold rounded-xs hover:bg-stone-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* APPROVE MODAL */}
        {activeModal === 'APPROVE' && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
              <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-700" />
                <span>Approve Return & Reverse Pickup</span>
              </h4>
              <p className="text-stone-600">
                Approving will advance this return and schedule a reverse courier consignment with Shiprocket.
              </p>
              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">Administrative Note</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for pickup or patron"
                  rows={2}
                  className="w-full p-2 border border-stone-300 rounded-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('VIEW')}
                  className="px-3 py-1.5 border border-stone-300 rounded-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApprove}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xs flex items-center gap-1"
                >
                  {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={13} />}
                  <span>Confirm Approval</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT MODAL */}
        {activeModal === 'REJECT' && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
              <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
                <XCircle size={18} className="text-rose-700" />
                <span>Reject Return Request</span>
              </h4>
              <p className="text-stone-600">
                Please provide a reason to display to the patron explaining why this return cannot be accepted.
              </p>
              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-stone-300 rounded-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('VIEW')}
                  className="px-3 py-1.5 border border-stone-300 rounded-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !rejectionReason.trim()}
                  onClick={handleReject}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xs flex items-center gap-1"
                >
                  {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={13} />}
                  <span>Reject Request</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INSPECTION MODAL */}
        {activeModal === 'INSPECT' && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-xs border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4 my-8 text-xs">
              <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
                <Sparkles size={18} className="text-purple-700" />
                <span>Physical Atelier Inspection & Restock</span>
              </h4>
              <p className="text-stone-600">
                Inspect items returned by the patron. Restock intact garments exactly once.
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {(selectedReturn.items || []).map((item) => {
                  const cur = itemInspections[item.id] || { condition: 'EXCELLENT', restock: true };
                  return (
                    <div key={item.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xs space-y-2">
                      <div className="flex justify-between font-semibold text-stone-900">
                        <span>{item.productTitle}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-stone-500 uppercase tracking-wider block mb-0.5">Condition</label>
                          <select
                            value={cur.condition}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemInspections((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], condition: val, restock: val === 'EXCELLENT' || val === 'UNOPENED' },
                              }));
                            }}
                            className="w-full p-1.5 bg-white border border-stone-300 rounded-xs text-xs"
                          >
                            <option value="EXCELLENT">Pristine / Unworn with Tags</option>
                            <option value="UNOPENED">Unopened Original Box</option>
                            <option value="DAMAGED">Damaged / Stained / Washed</option>
                            <option value="MISSING_TAGS">Tags Removed / Altered</option>
                          </select>
                        </div>
                        <div className="flex items-center pt-3">
                          <label className="flex items-center gap-2 cursor-pointer text-stone-800">
                            <input
                              type="checkbox"
                              checked={cur.restock}
                              onChange={(e) => {
                                const chk = e.target.checked;
                                setItemInspections((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], restock: chk },
                                }));
                              }}
                              className="rounded-xs text-purple-700"
                            />
                            <span>Restock to Inventory</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">Inspection Notes</label>
                <textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-stone-300 rounded-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('VIEW')}
                  className="px-3 py-1.5 border border-stone-300 rounded-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleInspect}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xs flex items-center gap-1"
                >
                  {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={13} />}
                  <span>Save & Restock</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REFUND MODAL */}
        {activeModal === 'REFUND' && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4 my-8 text-xs">
              <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
                <DollarSign size={18} className="text-rose-800" />
                <span>Process Return Refund</span>
              </h4>
              <p className="text-stone-600">
                Execute a verified refund for Return <strong>{selectedReturn.id}</strong>.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-stone-700 block mb-1">Refund Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full p-2 font-mono font-bold border border-stone-300 rounded-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-700 block mb-1">Reason</label>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2 border border-stone-300 rounded-xs"
                  />
                </div>

                {selectedReturn.order?.paymentMethod === 'COD' && (
                  <div className="p-3 bg-[#FAF4EB] border border-[#E6D7C3] rounded-xs space-y-2">
                    <span className="font-semibold block">COD Electronic Payout Details</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={payoutMethod === 'UPI'}
                          onChange={() => setPayoutMethod('UPI')}
                        />
                        <span>UPI VPA</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={payoutMethod === 'BANK'}
                          onChange={() => setPayoutMethod('BANK')}
                        />
                        <span>Bank NEFT</span>
                      </label>
                    </div>
                    {payoutMethod === 'UPI' ? (
                      <input
                        type="text"
                        placeholder="UPI VPA (e.g. patron@okhdfcbank)"
                        value={payoutUpi}
                        onChange={(e) => setPayoutUpi(e.target.value)}
                        className="w-full p-1.5 bg-white border border-stone-300 rounded-xs"
                      />
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Account Number"
                          value={payoutAccount}
                          onChange={(e) => setPayoutAccount(e.target.value)}
                          className="w-full p-1.5 bg-white border border-stone-300 rounded-xs"
                        />
                        <input
                          type="text"
                          placeholder="IFSC Code"
                          value={payoutIfsc}
                          onChange={(e) => setPayoutIfsc(e.target.value)}
                          className="w-full p-1.5 bg-white border border-stone-300 rounded-xs"
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Beneficiary Name"
                      value={payoutName}
                      onChange={(e) => setPayoutName(e.target.value)}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('VIEW')}
                  className="px-3 py-1.5 border border-stone-300 rounded-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRefund}
                  className="px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white font-semibold rounded-xs flex items-center gap-1"
                >
                  {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <DollarSign size={13} />}
                  <span>Execute Refund</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHOTO PREVIEW MODAL */}
        {activeModal === 'VIEW_PHOTO' && previewPhoto && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveModal('VIEW')}
            onKeyDown={(e) => e.key === 'Escape' && setActiveModal('VIEW')}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs"
          >
            <div className="relative max-w-2xl w-full max-h-[85vh] flex flex-col items-center">
              <img
                src={previewPhoto}
                alt="Evidence"
                className="max-h-[80vh] w-auto object-contain rounded-xs border border-white/20 shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setActiveModal('VIEW')}
                className="mt-3 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xs text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
