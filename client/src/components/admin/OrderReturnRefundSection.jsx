import React, { useState, useEffect } from 'react';
import * as returnRefundService from '../../services/returnRefundService';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Banknote,
  Eye,
  Check,
  Package,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  DollarSign,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

/**
 * Collections by Chandni - Admin Order Returns, Refunds & RTO Section
 *
 * Implements Launch Step 23:
 * - Return request audit, itemized view, evidence photo inspection
 * - Admin approval with automated Shiprocket reverse pickup booking
 * - Admin rejection with mandatory customer reason
 * - Physical atelier condition inspection with exact-once restock controls
 * - PayU online full & partial refunds with balance validation and discount adjustment
 * - Cash on Delivery electronic payout recording & reconciliation
 * - Return to Origin (RTO) courier delivery failure handling & restock
 */
export default function OrderReturnRefundSection({ order, onOrderUpdated }) {
  const [returnRequests, setReturnRequests] = useState(order?.returnRequests || []);
  const [refunds, setRefunds] = useState(order?.refunds || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'APPROVE' | 'REJECT' | 'INSPECT' | 'REFUND' | 'RTO' | 'VIEW_PHOTO'
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Form states
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspection state
  const [inspectionNotes, setInspectionNotes] = useState('Goods received at atelier and physical quality checked');
  const [itemInspections, setItemInspections] = useState({});

  // Refund state
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('Approved return refund');
  const [payoutMethod, setPayoutMethod] = useState('UPI');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutIfsc, setPayoutIfsc] = useState('');
  const [payoutName, setPayoutName] = useState('');

  // RTO state
  const [rtoReason, setRtoReason] = useState('Courier partner reported customer unavailable / address incomplete (RTO)');
  const [rtoInspectionNotes, setRtoInspectionNotes] = useState('Package returned intact with security tape uncompromised');
  const [rtoRestockAll, setRtoRestockAll] = useState(true);
  const [rtoRefundPrepaid, setRtoRefundPrepaid] = useState(order?.paymentMethod !== 'COD' && order?.paymentStatus === 'PAID');

  const fetchReturnsAndRefunds = async () => {
    if (!order?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [returnsRes, refundsRes] = await Promise.all([
        returnRefundService.getAdminReturns({ orderNumber: order.orderNumber, limit: 20 }),
        returnRefundService.getOrderRefunds(order.id),
      ]);
      if (returnsRes?.data) setReturnRequests(returnsRes.data);
      if (refundsRes?.data) setRefunds(refundsRes.data);
    } catch (err) {
      console.warn('Failed to refresh returns/refunds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (order?.returnRequests) setReturnRequests(order.returnRequests);
    if (order?.refunds) setRefunds(order.refunds);
  }, [order]);

  // Total refunded calculation
  const totalRefunded = (refunds || [])
    .filter((r) => r.status === 'SUCCESS' || r.status === 'PENDING')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const orderTotal = parseFloat(order?.totalAmount || 0);
  const remainingRefundable = Math.max(0, orderTotal - totalRefunded);

  // --- ACTIONS ---

  const handleApproveReturn = async () => {
    if (!selectedReturn || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await returnRefundService.approveReturnRequest(selectedReturn.id, {
        notes: actionNotes || 'Return approved by atelier management',
      });
      setActionSuccess(res.message || 'Return request approved successfully.');
      setActiveModal(null);
      if (onOrderUpdated) onOrderUpdated();
      fetchReturnsAndRefunds();
    } catch (err) {
      setError(err.message || 'Failed to approve return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectReturn = async () => {
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
      setActionSuccess(res.message || 'Return request rejected.');
      setActiveModal(null);
      if (onOrderUpdated) onOrderUpdated();
      fetchReturnsAndRefunds();
    } catch (err) {
      setError(err.message || 'Failed to reject return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordInspection = async () => {
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

      setActionSuccess(res.message || 'Physical inspection recorded and inventory restocked.');
      setActiveModal(null);
      if (onOrderUpdated) onOrderUpdated();
      fetchReturnsAndRefunds();
    } catch (err) {
      setError(err.message || 'Failed to record inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!order?.id || isSubmitting) return;
    const numAmt = parseFloat(refundAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please specify a valid positive refund amount.');
      return;
    }
    if (numAmt > remainingRefundable + 0.01) {
      setError(`Refund amount cannot exceed remaining balance of ₹${remainingRefundable.toLocaleString('en-IN')}`);
      return;
    }

    let payoutDetails = null;
    if (order.paymentMethod === 'COD') {
      if (payoutMethod === 'UPI') {
        if (!payoutUpi.trim()) {
          setError('Please provide patron UPI VPA ID (e.g. name@okhdfcbank).');
          return;
        }
        payoutDetails = { method: 'UPI', upiId: payoutUpi.trim(), accountName: payoutName.trim() };
      } else {
        if (!payoutAccount.trim() || !payoutIfsc.trim()) {
          setError('Bank Account Number and IFSC Code are required for NEFT/IMPS payout.');
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
      const res = await returnRefundService.processOrderRefund(order.id, {
        returnRequestId: selectedReturn?.id || null,
        refundAmount: numAmt,
        reason: refundReason,
        payoutDetails,
      });
      setActionSuccess(res.message || 'Refund successfully processed.');
      setActiveModal(null);
      if (onOrderUpdated) onOrderUpdated();
      fetchReturnsAndRefunds();
    } catch (err) {
      setError(err.message || 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRto = async () => {
    if (!order?.id || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);

      const itemInspections = (order.items || []).map((item) => ({
        orderItemId: item.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        condition: 'INTACT',
        restock: rtoRestockAll,
      }));

      const res = await returnRefundService.processOrderRto(order.id, {
        rtoReason,
        inspectionNotes: rtoInspectionNotes,
        itemInspections,
        refundPrepaid: rtoRefundPrepaid,
        refundAmount: rtoRefundPrepaid ? parseFloat(order.totalAmount) : null,
      });

      setActionSuccess(res.message || 'RTO consignment recorded and inventory handled.');
      setActiveModal(null);
      if (onOrderUpdated) onOrderUpdated();
      fetchReturnsAndRefunds();
    } catch (err) {
      setError(err.message || 'Failed to record RTO');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-4 border-t border-stone-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800 block">
            Launch Step 23
          </span>
          <h3 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
            <RotateCcw size={18} className="text-rose-800" />
            <span>Returns, Refunds & RTO Management</span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {order?.status !== 'CANCELLED' && order?.status !== 'RETURNED' && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setActiveModal('RTO');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-xs transition-colors"
            >
              <AlertTriangle size={13} />
              <span>Record RTO / Delivery Failure</span>
            </button>
          )}

          {remainingRefundable > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedReturn(null);
                setRefundAmount(remainingRefundable.toFixed(2));
                setRefundReason(`Manual refund for Order ${order.orderNumber}`);
                setError(null);
                setActiveModal('REFUND');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-semibold rounded-xs transition-colors"
            >
              <DollarSign size={13} />
              <span>Issue Refund (Max ₹{remainingRefundable.toLocaleString('en-IN')})</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Financial Refund Balance Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-stone-50 border border-stone-200/80 rounded-xs text-xs">
        <div>
          <span className="text-stone-500 text-[10px] uppercase tracking-wider block">Order Net Payable</span>
          <span className="font-mono font-semibold text-stone-900 text-sm">
            ₹{orderTotal.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            Method: {order?.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'PayU Hosted Gateway'}
          </span>
        </div>

        <div>
          <span className="text-stone-500 text-[10px] uppercase tracking-wider block">Settled / Pending Refunds</span>
          <span className="font-mono font-semibold text-rose-800 text-sm">
            ₹{totalRefunded.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            {refunds.length} recorded refund transaction(s)
          </span>
        </div>

        <div>
          <span className="text-stone-500 text-[10px] uppercase tracking-wider block">Remaining Refundable Balance</span>
          <span className="font-mono font-semibold text-emerald-800 text-sm">
            ₹{remainingRefundable.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            Strict idempotency & caps enforced
          </span>
        </div>
      </div>

      {/* SECTION 1: CUSTOMER RETURN REQUESTS */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center justify-between">
          <span>Customer Return & Exchange Requests ({returnRequests.length})</span>
          {isLoading && <RefreshCw size={12} className="animate-spin text-stone-400" />}
        </h4>

        {returnRequests.length === 0 ? (
          <div className="p-6 bg-white border border-dashed border-stone-200 text-center rounded-xs text-xs text-stone-500">
            No return or exchange requests have been submitted by the customer for this order.
          </div>
        ) : (
          <div className="space-y-4">
            {returnRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-stone-200 rounded-xs p-5 shadow-xs space-y-4 text-xs"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-stone-900">{req.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          req.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : req.status === 'APPROVED' || req.status === 'PICKUP_SCHEDULED'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : req.status === 'INSPECTED' || req.status === 'REFUND_PENDING'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                      {req.isRestocked && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Restocked
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">
                      Submitted on {new Date(req.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Actions according to lifecycle */}
                  <div className="flex flex-wrap items-center gap-2">
                    {req.status === 'REQUESTED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReturn(req);
                            setActionNotes('');
                            setError(null);
                            setActiveModal('APPROVE');
                          }}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xs font-semibold text-xs transition-colors"
                        >
                          Approve Return
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReturn(req);
                            setRejectionReason('');
                            setError(null);
                            setActiveModal('REJECT');
                          }}
                          className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xs font-semibold text-xs transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {!req.isRestocked && ['APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED'].includes(req.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReturn(req);
                          const initial = {};
                          (req.items || []).forEach((it) => {
                            initial[it.id] = { condition: 'EXCELLENT', restock: true };
                          });
                          setItemInspections(initial);
                          setError(null);
                          setActiveModal('INSPECT');
                        }}
                        className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-xs font-semibold text-xs transition-colors"
                      >
                        Record Physical Inspection
                      </button>
                    )}

                    {['INSPECTED', 'REFUND_PENDING'].includes(req.status) && remainingRefundable > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReturn(req);
                          // Calculate item-based refund taking into account discounts
                          const reqItemTotal = (req.items || []).reduce(
                            (sum, i) => sum + (parseFloat(i.unitPrice) * parseInt(i.quantity, 10)),
                            0
                          );
                          const subtotal = parseFloat(order?.subtotal || orderTotal || 1);
                          const ratio = subtotal > 0 ? (orderTotal / subtotal) : 1;
                          const calculatedAmt = Math.min(
                            remainingRefundable,
                            Math.round(reqItemTotal * ratio * 100) / 100
                          );
                          setRefundAmount(calculatedAmt.toFixed(2));
                          setRefundReason(`Refund for Return Request ${req.id}`);
                          setError(null);
                          setActiveModal('REFUND');
                        }}
                        className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-xs font-semibold text-xs transition-colors"
                      >
                        Process Refund
                      </button>
                    )}
                  </div>
                </div>

                {/* Reason & Comments */}
                <div className="bg-[#FAF9F5] p-3 border border-stone-200/80 rounded-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 font-medium">Patron Reason:</span>
                    <span className="font-semibold text-stone-900">{req.reason}</span>
                  </div>
                  {req.comments && (
                    <p className="text-stone-600 font-light italic">"{req.comments}"</p>
                  )}
                  {req.rejectionReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs mt-2">
                      <span className="font-semibold block">Atelier Rejection Reason:</span>
                      <span>{req.rejectionReason}</span>
                    </div>
                  )}
                  {req.inspectionNotes && (
                    <div className="p-2 bg-purple-50 border border-purple-200 text-purple-900 rounded-xs mt-2">
                      <span className="font-semibold block">Inspection Report:</span>
                      <span>{req.inspectionNotes}</span>
                    </div>
                  )}
                </div>

                {/* Return Items Table */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block mb-2">
                    Items Selected for Return ({(req.items || []).length})
                  </span>
                  <div className="border border-stone-200 rounded-xs divide-y divide-stone-100 overflow-hidden">
                    {(req.items || []).map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between gap-4 bg-white">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-stone-900 block">{it.productTitle}</span>
                          <span className="text-[11px] font-mono text-stone-400">SKU: {it.sku}</span>
                          <span className="text-[11px] text-stone-600 block">
                            Reported Condition: <strong className="text-stone-800">{it.condition}</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-stone-900 block">
                            Qty: {it.quantity}
                          </span>
                          <span className="text-[11px] font-mono text-stone-600">
                            @ ₹{Number(it.unitPrice).toLocaleString('en-IN')} each
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                              it.restockStatus === 'RESTOCKED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : it.restockStatus === 'DISCARDED'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            Restock: {it.restockStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Photo Thumbnails */}
                {Array.isArray(req.evidenceImages) && req.evidenceImages.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block mb-2">
                      Patron Photographic Evidence ({req.evidenceImages.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {req.evidenceImages.map((imgUrl, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => {
                            setPreviewPhoto(imgUrl);
                            setActiveModal('VIEW_PHOTO');
                          }}
                          className="w-16 h-16 rounded-xs overflow-hidden border border-stone-200 hover:border-rose-700 transition-colors relative group"
                        >
                          <img src={imgUrl} alt={`Evidence ${imgIdx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye size={14} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: REFUND AUDIT HISTORY */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center justify-between">
          <span>Refund Transactions ({refunds.length})</span>
          {remainingRefundable > 0 && (
            <span className="text-emerald-800 text-[11px] font-normal">
              ₹{remainingRefundable.toLocaleString('en-IN')} available for refund
            </span>
          )}
        </h4>

        {refunds.length === 0 ? (
          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-xs text-xs text-stone-500 text-center">
            No refunds have been processed for this order yet.
          </div>
        ) : (
          <div className="border border-stone-200 rounded-xs divide-y divide-stone-100 bg-white overflow-hidden text-xs">
            {refunds.map((ref) => (
              <div key={ref.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-sm text-stone-900">
                      ₹{parseFloat(ref.amount).toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        ref.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : ref.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {ref.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 text-stone-700">
                      {ref.paymentMethod}
                    </span>
                  </div>
                  <p className="text-stone-600 font-light">{ref.reason}</p>
                  {ref.payuRefundId && (
                    <span className="text-[10px] font-mono text-stone-400 block">
                      PayU Refund Ref: {ref.payuRefundId} {ref.bankRefNum ? `(Bank Ref: ${ref.bankRefNum})` : ''}
                    </span>
                  )}
                  {ref.payoutDetails && (
                    <div className="text-[10px] font-mono text-stone-500 bg-stone-50 p-2 rounded-xs border border-stone-200/80 mt-1">
                      COD Payout: {ref.payoutDetails.method === 'UPI' ? `UPI VPA: ${ref.payoutDetails.upiId}` : `Bank: A/C ${ref.payoutDetails.accountNumber} (IFSC: ${ref.payoutDetails.ifsc})`}
                      {ref.payoutDetails.accountName && ` · Beneficiary: ${ref.payoutDetails.accountName}`}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-[10px] text-stone-400 block">
                    {new Date(ref.createdAt).toLocaleString('en-IN')}
                  </span>
                  <span className="font-mono text-[9px] text-stone-300 block">
                    ID: {ref.id.slice(0, 18)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* APPROVE RETURN MODAL */}
      {activeModal === 'APPROVE' && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-700" />
              <span>Approve Return Request</span>
            </h4>
            <p className="text-xs text-stone-600">
              Approving Return <strong>{selectedReturn.id}</strong> will schedule a reverse pickup via Shiprocket if shipping is active. The patron will be instructed on package handover.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-stone-700">Administrative Notes (Optional)</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g. Reverse pickup booked for tomorrow morning"
                rows={3}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-xs focus:outline-rose-800"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xs hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleApproveReturn}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />}
                <span>Confirm Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT RETURN MODAL */}
      {activeModal === 'REJECT' && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
              <XCircle size={18} className="text-rose-700" />
              <span>Reject Return Request</span>
            </h4>
            <p className="text-xs text-stone-600">
              Please state the specific reason for rejecting Return <strong>{selectedReturn.id}</strong>. This note will be shown to the patron in their account portal.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-stone-700">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Return window of 7 days has elapsed, or item was customized bespoke couture."
                rows={3}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-xs focus:outline-rose-800"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xs hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !rejectionReason.trim()}
                onClick={handleRejectReturn}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={14} />}
                <span>Reject Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD INSPECTION MODAL */}
      {activeModal === 'INSPECT' && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xs border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
            <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-700" />
              <span>Record Physical Inspection & Restock</span>
            </h4>
            <p className="text-xs text-stone-600">
              Inspect each garment received at the atelier. Items marked for restock will have their inventory restored <strong>exactly once</strong>.
            </p>

            {/* Items inspection list */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {(selectedReturn.items || []).map((item) => {
                const cur = itemInspections[item.id] || { condition: 'EXCELLENT', restock: true };
                return (
                  <div key={item.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xs space-y-2 text-xs">
                    <div className="flex justify-between font-semibold text-stone-900">
                      <span>{item.productTitle}</span>
                      <span>Qty: {item.quantity}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-stone-500 uppercase tracking-wider block mb-1">
                          Garment Condition
                        </label>
                        <select
                          value={cur.condition}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItemInspections((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                condition: val,
                                restock: val === 'EXCELLENT' || val === 'UNOPENED',
                              },
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

                      <div className="flex items-center pt-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-800">
                          <input
                            type="checkbox"
                            checked={cur.restock}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setItemInspections((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  restock: checked,
                                },
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

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-stone-700">Inspection Notes</label>
              <textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-xs focus:outline-rose-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xs hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRecordInspection}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />}
                <span>Save Inspection & Restock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS REFUND MODAL */}
      {activeModal === 'REFUND' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4 my-8">
            <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
              <DollarSign size={18} className="text-rose-800" />
              <span>Process Refund</span>
            </h4>
            <p className="text-xs text-stone-600">
              Order: <strong>{order?.orderNumber}</strong> · Method:{' '}
              <strong>{order?.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'PayU Online'}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">
                  Refund Amount (₹) * (Max: ₹{remainingRefundable.toLocaleString('en-IN')})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={remainingRefundable}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full text-sm font-mono font-bold p-2.5 border border-stone-300 rounded-xs focus:outline-rose-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">Refund Reason *</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xs focus:outline-rose-800"
                />
              </div>

              {/* COD Electronic Payout Fields */}
              {order?.paymentMethod === 'COD' && (
                <div className="p-3 bg-[#FAF4EB] border border-[#E6D7C3] rounded-xs space-y-2 text-xs">
                  <span className="font-semibold text-stone-900 block">
                    COD Electronic Payout Details (Required)
                  </span>
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
                      <span>Bank Account (NEFT/IMPS)</span>
                    </label>
                  </div>

                  {payoutMethod === 'UPI' ? (
                    <div>
                      <label className="text-[10px] text-stone-600 block">UPI VPA *</label>
                      <input
                        type="text"
                        placeholder="e.g. patron@okhdfcbank"
                        value={payoutUpi}
                        onChange={(e) => setPayoutUpi(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-stone-300 rounded-xs mt-0.5"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] text-stone-600 block">Account Number *</label>
                        <input
                          type="text"
                          value={payoutAccount}
                          onChange={(e) => setPayoutAccount(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-stone-300 rounded-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-600 block">IFSC Code *</label>
                        <input
                          type="text"
                          value={payoutIfsc}
                          onChange={(e) => setPayoutIfsc(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-stone-300 rounded-xs mt-0.5"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-stone-600 block">Beneficiary Name</label>
                    <input
                      type="text"
                      placeholder="Account holder name"
                      value={payoutName}
                      onChange={(e) => setPayoutName(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-stone-300 rounded-xs mt-0.5"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xs hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleProcessRefund}
                className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold rounded-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <DollarSign size={14} />}
                <span>Execute Refund (₹{parseFloat(refundAmount || 0).toLocaleString('en-IN')})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD RTO (RETURN TO ORIGIN) MODAL */}
      {activeModal === 'RTO' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4 my-8">
            <h4 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-700" />
              <span>Record Return to Origin (RTO)</span>
            </h4>
            <p className="text-xs text-stone-600">
              Use when the delivery partner fails to deliver the package (customer unreachable, refused COD, wrong address) and the parcel is returned to the atelier.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">RTO Reason *</label>
                <select
                  value={rtoReason}
                  onChange={(e) => setRtoReason(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-xs bg-white"
                >
                  <option value="Customer unreachable after 3 delivery attempts">Customer unreachable after 3 attempts</option>
                  <option value="Patron refused Cash on Delivery parcel at doorstep">Patron refused COD at doorstep</option>
                  <option value="Incorrect or untraceable shipping address">Incorrect or untraceable address</option>
                  <option value="Consignment damaged in transit by carrier">Consignment damaged in transit</option>
                  <option value="Delivery partner RTO initiated">Delivery partner RTO initiated</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">Physical Inspection Notes</label>
                <textarea
                  value={rtoInspectionNotes}
                  onChange={(e) => setRtoInspectionNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2 border border-stone-300 rounded-xs"
                />
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xs space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <input
                    type="checkbox"
                    checked={rtoRestockAll}
                    onChange={(e) => setRtoRestockAll(e.target.checked)}
                    className="rounded-xs text-rose-800"
                  />
                  <span>Restock Intact Items to Atelier Inventory</span>
                </label>
                <p className="text-[10px] text-stone-500 pl-5">
                  Restores stock exactly once for this order. Protects against duplicate adjustments.
                </p>

                {order?.paymentMethod !== 'COD' && order?.paymentStatus === 'PAID' && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 pt-2 border-t border-stone-200">
                    <input
                      type="checkbox"
                      checked={rtoRefundPrepaid}
                      onChange={(e) => setRtoRefundPrepaid(e.target.checked)}
                      className="rounded-xs text-rose-800"
                    />
                    <span>Initiate PayU Prepaid Refund (₹{parseFloat(order.totalAmount).toLocaleString('en-IN')})</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xs hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleProcessRto}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />}
                <span>Confirm RTO Receipt & Restock</span>
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
          onClick={() => setActiveModal(null)}
          onKeyDown={(e) => e.key === 'Escape' && setActiveModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs"
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] flex flex-col items-center">
            <img
              src={previewPhoto}
              alt="Evidence Inspection"
              className="max-h-[80vh] w-auto object-contain rounded-xs border border-white/20 shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="mt-3 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xs text-xs font-semibold"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
