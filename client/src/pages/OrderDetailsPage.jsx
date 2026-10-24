import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../components/Container';
import * as orderService from '../services/orderService';
import * as checkoutService from '../services/checkoutService';
import * as shippingService from '../services/shippingService';
import * as returnRefundService from '../services/returnRefundService';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  Calendar,
  AlertCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  CreditCard,
  Banknote,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  HelpCircle,
  Info,
  DollarSign,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { key: 'PENDING', label: 'Order Placed' },
  { key: 'CONFIRMED', label: 'Atelier Confirmed' },
  { key: 'PROCESSING', label: 'Processing & Packed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];

/**
 * Customer Order Details Page (/account/orders/:id)
 * Implements Step 16:
 * - Authoritative order retrieval with patron ownership isolation
 * - Immutable address and item snapshots
 * - Real status milestones from status history (no fabricated carriers or tracking numbers)
 * - Luxury Indian boutique aesthetic
 */
export default function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [copiedAwb, setCopiedAwb] = useState(false);

  // Cancellation State (Step 23)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered wrong size or color');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Return & Exchange State (Step 23)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedReturnItems, setSelectedReturnItems] = useState({});
  const [returnReason, setReturnReason] = useState('Size fitting too large / loose');
  const [returnComments, setReturnComments] = useState('');
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState(null);
  const [policyInfo, setPolicyInfo] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  const fetchPolicy = useCallback(async () => {
    try {
      const p = await returnRefundService.getReturnPolicy();
      if (p?.data) setPolicyInfo(p.data);
    } catch (e) {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleCancelOrder = async () => {
    if (!order?.id || isSubmittingCancel) return;
    const finalReason = cancelReason === 'Other' ? customCancelReason.trim() : cancelReason;
    if (cancelReason === 'Other' && !finalReason) {
      setCancelError('Please specify the cancellation reason.');
      return;
    }

    try {
      setIsSubmittingCancel(true);
      setCancelError(null);
      const res = await returnRefundService.cancelCustomerOrder(order.id, {
        reason: finalReason,
      });
      setActionSuccessMessage(res.message || 'Order cancelled successfully.');
      setIsCancelModalOpen(false);
      fetchOrder();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel order');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setIsUploadingImages(true);
      setReturnError(null);
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });
      const res = await returnRefundService.uploadReturnEvidence(formData);
      if (Array.isArray(res?.data)) {
        setEvidenceImages((prev) => [...prev, ...res.data]);
      }
    } catch (err) {
      setReturnError(err.message || 'Failed to upload photo evidence');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!order?.id || isSubmittingReturn) return;
    const itemsToReturn = Object.entries(selectedReturnItems)
      .filter(([_, val]) => val.selected && val.quantity > 0)
      .map(([orderItemId, val]) => ({
        orderItemId,
        quantity: parseInt(val.quantity, 10),
        condition: val.condition || 'UNOPENED',
      }));

    if (itemsToReturn.length === 0) {
      setReturnError('Please select at least one item and quantity to return.');
      return;
    }

    try {
      setIsSubmittingReturn(true);
      setReturnError(null);
      const res = await returnRefundService.createReturnRequest(order.id, {
        items: itemsToReturn,
        reason: returnReason,
        comments: returnComments,
        evidenceImages,
      });
      setActionSuccessMessage(
        res.message || 'Return request submitted successfully. Our atelier team will review within 24-48 hours.'
      );
      setIsReturnModalOpen(false);
      fetchOrder();
    } catch (err) {
      setReturnError(err.message || 'Failed to submit return request');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handlePayNow = async () => {
    if (!order?.orderNumber || isProcessingPayment) return;
    try {
      setIsProcessingPayment(true);
      setPaymentError(null);
      const res = await checkoutService.initiatePayUPayment(order.orderNumber);
      if (res?.payuParams) {
        const params = res.payuParams;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = params.actionUrl;
        form.style.display = 'none';

        Object.entries(params).forEach(([key, val]) => {
          if (key !== 'actionUrl' && val !== undefined && val !== null) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(val);
            form.appendChild(input);
          }
        });

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      setPaymentError(err.message || 'Error initializing payment gateway');
      setIsProcessingPayment(false);
    }
  };

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.getCustomerOrder(id);
      if (res?.data) {
        setOrder(res.data);
      }
      // Also fetch live tracking asynchronously
      shippingService
        .getCustomerOrderTracking(id)
        .then((trackRes) => {
          if (trackRes?.data) setTrackingData(trackRes.data);
        })
        .catch(() => null);
    } catch (err) {
      setError(err.message || 'Unable to load order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} />
            Delivered
          </span>
        );
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <Truck size={13} />
            Shipped
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Sparkles size={13} />
            Processing
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            <Package size={13} />
            Packed
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF4EB] text-[#781D42] border border-[#E6D7C3]">
            <Sparkles size={13} />
            Confirmed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle size={13} />
            Cancelled
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
            <RotateCcw size={13} />
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={13} />
            Order Placed
          </span>
        );
    }
  };

  const getStepIndex = (status) => {
    if (status === 'DELIVERED') return 4;
    if (status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY') return 3;
    if (status === 'PROCESSING' || status === 'PACKED') return 2;
    if (status === 'CONFIRMED') return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] py-20 text-center">
        <Container>
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-8 h-8 border-2 border-[#781D42]/20 border-t-[#781D42] rounded-full animate-spin mx-auto" />
            <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
              Retrieving Order Records...
            </p>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] py-20 text-center">
        <Container>
          <div className="max-w-md mx-auto p-8 bg-white border border-stone-200 rounded-xs space-y-4 shadow-xs">
            <AlertCircle size={32} className="text-rose-600 mx-auto" />
            <h2 className="font-serif text-2xl font-semibold text-stone-900">
              Order Not Found
            </h2>
            <p className="text-xs text-stone-600 font-light leading-relaxed">
              {error || 'The requested order could not be located or does not belong to your patron account.'}
            </p>
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#781D42] text-amber-50 text-xs uppercase tracking-widest font-semibold rounded-xs"
            >
              <ArrowLeft size={14} />
              <span>Back to My Orders</span>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const orderItems = order.items || [];
  const shippingAddr = order.shippingAddress || {};
  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const canCancel =
    order &&
    ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(order.status) &&
    (!trackingData?.hasActiveShipment ||
      ['PROCESSING', 'MANIFEST_GENERATED'].includes(trackingData?.shipmentStatus));

  const hasActiveReturn =
    order?.returnRequests &&
    order.returnRequests.some((r) => !['CANCELLED', 'REJECTED'].includes(r.status));

  const canReturn = order && order.status === 'DELIVERED' && !hasActiveReturn;

  const renderReturnStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} />
            Refund Completed
          </span>
        );
      case 'APPROVED':
      case 'PICKUP_SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <Truck size={13} />
            Reverse Pickup Scheduled
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Truck size={13} />
            In Transit to Atelier
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
            <Package size={13} />
            Received at Atelier
          </span>
        );
      case 'INSPECTED':
      case 'REFUND_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            <Sparkles size={13} />
            Inspected · Refund Queued
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle size={13} />
            Return Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={13} />
            Under Atelier Review
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 pb-20">
      {/* Header */}
      <section className="bg-stone-100/60 border-b border-stone-200/80 py-10 sm:py-12">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-4">
              <Link to="/account/orders" className="hover:text-[#781D42] transition-colors flex items-center gap-1">
                <ArrowLeft size={14} />
                <span>My Orders</span>
              </Link>
              <span>/</span>
              <span className="font-mono text-stone-800 font-medium">{order.orderNumber}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                  Order Details
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-950">
                  {order.orderNumber}
                </h1>
                <p className="text-xs text-stone-500 font-light mt-1">
                  Placed on {formattedDate} · {orderItems.length} {orderItems.length === 1 ? 'piece' : 'pieces'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-xs bg-[#FAF4EB] text-[#781D42] border border-[#E6D7C3] flex items-center gap-1">
                  {order.paymentMethod === 'COD' ? (
                    <>
                      <Banknote size={12} />
                      Cash on Delivery (COD)
                    </>
                  ) : (
                    <>
                      <CreditCard size={12} />
                      PayU Online
                    </>
                  )}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-xs border ${
                    order.paymentStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : order.paymentStatus === 'FAILED'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {order.paymentStatus}
                </span>
                {renderStatusBadge(order.status)}

                {/* Step 23 Actions: Cancel Order or Request Return */}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelError(null);
                      setIsCancelModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-xs transition-colors shadow-2xs"
                  >
                    <XCircle size={13} />
                    <span>Cancel Order</span>
                  </button>
                )}

                {canReturn && (
                  <button
                    type="button"
                    onClick={() => {
                      const initial = {};
                      (order.items || []).forEach((it) => {
                        initial[it.id] = { selected: true, quantity: it.quantity, condition: 'UNOPENED' };
                      });
                      setSelectedReturnItems(initial);
                      setReturnError(null);
                      setEvidenceImages([]);
                      setIsReturnModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1 bg-[#781D42] hover:bg-[#5B1123] text-amber-50 rounded-xs transition-colors shadow-2xs"
                  >
                    <RotateCcw size={13} />
                    <span>Request Return / Exchange</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Details Body */}
      <section className="py-10">
        <Container>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Action Success Alert */}
            {actionSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xs text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                  <span>{actionSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionSuccessMessage(null)}
                  className="text-emerald-600 hover:text-emerald-900"
                >
                  <XCircle size={14} />
                </button>
              </div>
            )}

            {/* Step 23: Active Return & Exchange Request Tracker */}
            {Array.isArray(order.returnRequests) && order.returnRequests.length > 0 && (
              <div className="bg-white border border-[#E6D7C3] rounded-xs p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center shrink-0">
                      <RotateCcw size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#781D42] font-semibold block">
                        Atelier Returns & Reverse Logistics
                      </span>
                      <h3 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
                        <span>Return Request</span>
                        <span className="font-mono text-xs font-normal text-stone-400">
                          ({order.returnRequests[0].id.slice(0, 16)}...)
                        </span>
                      </h3>
                    </div>
                  </div>
                  <div>
                    {renderReturnStatusBadge(order.returnRequests[0].status)}
                  </div>
                </div>

                {/* Return Request Details */}
                <div className="p-4 bg-[#FAF9F5] border border-stone-200/80 rounded-xs space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-stone-700">
                    <p>
                      <strong>Reason:</strong> {order.returnRequests[0].reason}
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Requested on {new Date(order.returnRequests[0].createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {order.returnRequests[0].comments && (
                    <p className="text-stone-600 font-light italic">"{order.returnRequests[0].comments}"</p>
                  )}

                  {order.returnRequests[0].rejectionReason && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xs mt-2">
                      <strong className="block mb-0.5">Atelier Rejection Note:</strong>
                      <p className="font-light">{order.returnRequests[0].rejectionReason}</p>
                    </div>
                  )}

                  {order.returnRequests[0].inspectionNotes && (
                    <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xs mt-2">
                      <strong className="block mb-0.5">Atelier Physical Inspection:</strong>
                      <p className="font-light">{order.returnRequests[0].inspectionNotes}</p>
                    </div>
                  )}
                </div>

                {/* Return Items */}
                {Array.isArray(order.returnRequests[0].items) && order.returnRequests[0].items.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
                      Pieces Included in Return ({order.returnRequests[0].items.length})
                    </span>
                    <div className="divide-y divide-stone-100 border border-stone-200/80 rounded-xs bg-white overflow-hidden text-xs">
                      {order.returnRequests[0].items.map((it) => (
                        <div key={it.id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-semibold text-stone-900 block">{it.productTitle}</span>
                            <span className="text-[11px] font-mono text-stone-400">SKU: {it.sku}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-stone-900 block">Quantity: {it.quantity}</span>
                            <span className="text-[11px] font-mono text-stone-600">
                              @ ₹{Number(it.unitPrice).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Images */}
                {Array.isArray(order.returnRequests[0].evidenceImages) &&
                  order.returnRequests[0].evidenceImages.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
                        Uploaded Photos ({order.returnRequests[0].evidenceImages.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {order.returnRequests[0].evidenceImages.map((imgUrl, imgIdx) => (
                          <a
                            key={imgIdx}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-16 h-16 rounded-xs overflow-hidden border border-stone-200 hover:border-[#781D42] transition-colors"
                          >
                            <img
                              src={imgUrl}
                              alt={`Evidence ${imgIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Step 23: Processed Refunds Card */}
            {Array.isArray(order.refunds) && order.refunds.length > 0 && (
              <div className="bg-white border border-emerald-200 rounded-xs p-6 shadow-xs space-y-4 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-100 pb-3">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <h4 className="font-serif text-base font-semibold">Refund Transactions</h4>
                </div>
                <div className="divide-y divide-emerald-50">
                  {order.refunds.map((ref) => (
                    <div key={ref.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-stone-950">
                            ₹{Number(ref.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {ref.status}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400">
                            via {ref.paymentMethod === 'PAYU' ? 'PayU India Gateway' : 'Electronic Payout'}
                          </span>
                        </div>
                        <p className="text-stone-600 font-light">{ref.reason}</p>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(ref.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fulfillment Progress Timeline */}
            {!isCancelled ? (
              <div className="bg-white border border-stone-200 rounded-xs p-6 sm:p-8 shadow-xs">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-stone-500 mb-6">
                  Fulfillment Status Journey
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const isPassed = currentStep >= idx;
                    const isCurrent = currentStep === idx;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center space-y-2 relative z-10">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                            isCurrent
                              ? 'bg-[#781D42] text-amber-50 ring-4 ring-[#FAF4EB]'
                              : isPassed
                              ? 'bg-[#781D42] text-amber-50'
                              : 'bg-stone-100 text-stone-400 border border-stone-200'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <span
                          className={`text-xs font-medium leading-snug ${
                            isCurrent
                              ? 'text-[#781D42] font-semibold'
                              : isPassed
                              ? 'text-stone-900'
                              : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Recorded Customer-Safe Milestones Timeline */}
                {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-stone-100">
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 mb-3">
                      Status Milestones & Updates
                    </h4>
                    <div className="space-y-2">
                      {order.statusHistory.map((m, mIdx) => {
                        const mDate = m.timestamp
                          ? new Date(m.timestamp).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : null;

                        return (
                          <div
                            key={m.id || mIdx}
                            className="flex items-start justify-between p-3 rounded-xs bg-[#FAF9F5] border border-stone-200/80 text-xs gap-3"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-stone-900 block">{m.status}</span>
                              {m.note && (
                                <p className="text-stone-600 font-light text-[11px]">{m.note}</p>
                              )}
                            </div>
                            {mDate && (
                              <span className="font-mono text-stone-400 text-[10px] shrink-0 text-right">
                                {mDate}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-xs text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="text-rose-700 shrink-0" />
                  <h4 className="font-serif text-base font-semibold text-rose-950">This Order Has Been Cancelled</h4>
                </div>
                <p className="font-light text-rose-800 leading-relaxed">
                  Your cancellation request has been accepted. Any reserved atelier pieces have been returned to inventory.
                  {order.paymentMethod !== 'COD' && order.paymentStatus === 'REFUNDED' && (
                    <span className="block mt-1 font-semibold text-emerald-900">
                      ✓ Your PayU payment of ₹{Number(order.totalAmount).toLocaleString('en-IN')} has been refunded.
                    </span>
                  )}
                  {order.paymentMethod !== 'COD' && order.paymentStatus === 'REFUND_PENDING' && (
                    <span className="block mt-1 font-semibold text-amber-900">
                      ⏳ Your online refund of ₹{Number(order.totalAmount).toLocaleString('en-IN')} is pending settlement and will reflect in 5-7 business days.
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Live Shiprocket Courier Tracking Card (Step 22) */}
            {trackingData?.hasActiveShipment && (
              <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center shrink-0">
                      <Truck size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#781D42] font-semibold block">
                        Insured Express Courier Dispatch
                      </span>
                      <h4 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                        <span>{trackingData.courierName}</span>
                        <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                          {trackingData.shipmentStatus}
                        </span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {trackingData.trackingUrl && (
                      <a
                        href={trackingData.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF4EB] hover:bg-[#F3E7D3] text-[#781D42] border border-[#E6D7C3] rounded-xs text-xs font-medium transition-colors"
                      >
                        <span>Live Provider Tracking</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* AWB and Milestone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-stone-50 border border-stone-200/80 rounded-xs text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px] uppercase tracking-wider block">Consignment AWB</span>
                    <div className="flex items-center gap-2 mt-0.5 font-mono font-semibold text-stone-900 text-sm">
                      <span>{trackingData.awbCode}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(trackingData.awbCode);
                          setCopiedAwb(true);
                          setTimeout(() => setCopiedAwb(false), 2000);
                        }}
                        className="text-stone-400 hover:text-stone-700"
                        title="Copy AWB"
                      >
                        {copiedAwb ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-400 text-[10px] uppercase tracking-wider block">Latest Courier Event</span>
                    <p className="font-medium text-stone-900 mt-0.5">
                      {trackingData.latestActivity || trackingData.shipmentStatus}
                    </p>
                    {trackingData.latestActivityTime && (
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(trackingData.latestActivityTime).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tracking Milestones Activities */}
                {Array.isArray(trackingData.activities) && trackingData.activities.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
                      Carrier Transit Timeline
                    </span>
                    <div className="space-y-1.5">
                      {trackingData.activities.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="flex items-start justify-between p-2.5 bg-[#FAF9F5] border border-stone-200/80 rounded-xs text-xs gap-3"
                        >
                          <div className="space-y-0.5">
                            <span className="font-medium text-stone-900 block">{act.status}</span>
                            {act.location && (
                              <span className="text-stone-500 text-[11px]">Location: {act.location}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-stone-400 shrink-0">{act.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Two-Column Grid: Delivery Snapshot & Itemized Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Ordered Items (7 cols) */}
              <div className="md:col-span-7 bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-4">
                <h3 className="font-serif text-lg font-semibold text-stone-950 border-b border-stone-100 pb-3 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#781D42]" />
                  <span>Artisan Pieces ({orderItems.length})</span>
                </h3>

                <div className="divide-y divide-stone-100">
                  {orderItems.map((item) => (
                    <div key={item.id} className="py-4 flex items-center gap-4 text-xs">
                      <div className="w-16 h-20 bg-stone-100 rounded-xs overflow-hidden shrink-0 border border-stone-200">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productTitle}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-serif">
                            Couture
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h4 className="font-serif font-semibold text-stone-950 truncate">
                          {item.productTitle}
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Size: <span className="text-stone-800 font-medium">{item.size}</span> · Color:{' '}
                          <span className="text-stone-800 font-medium">{item.color}</span>
                        </p>
                        <p className="text-[10px] font-mono text-stone-400">SKU: {item.sku}</p>
                        <p className="text-[11px] text-stone-600 pt-0.5">
                          Quantity: <span className="font-semibold text-stone-900">{item.quantity}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-serif font-semibold text-stone-950 tabular-nums block text-sm">
                          ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          @ ₹{Number(item.unitPrice).toLocaleString('en-IN')} each
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address & Financials (5 cols) */}
              <div className="md:col-span-5 space-y-6">
                {/* Immutable Delivery Address Snapshot */}
                <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-3">
                  <h3 className="font-serif text-base font-semibold text-stone-950 border-b border-stone-100 pb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-[#781D42]" />
                    <span>Immutable Shipping Snapshot</span>
                  </h3>
                  <div className="text-xs text-stone-700 space-y-1 font-light leading-relaxed">
                    <p className="font-semibold text-stone-900">{shippingAddr.name}</p>
                    <p className="text-stone-500 font-mono text-[11px]">Phone: {shippingAddr.phone}</p>
                    <p>{shippingAddr.addressLine1}</p>
                    {shippingAddr.addressLine2 && <p>{shippingAddr.addressLine2}</p>}
                    {shippingAddr.landmark && (
                      <p className="text-stone-500 italic">Near {shippingAddr.landmark}</p>
                    )}
                    <p className="font-medium text-stone-900 pt-1">
                      {shippingAddr.city}, {shippingAddr.state} - {shippingAddr.pincode}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-stone-500">
                      {shippingAddr.country || 'India'}
                    </p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-4">
                  <h3 className="font-serif text-base font-semibold text-stone-950 border-b border-stone-100 pb-2">
                    Payment Summary
                  </h3>

                  <div className="space-y-2.5 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span className="font-mono tabular-nums font-medium text-stone-900">
                        ₹{Number(order.subtotal).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="block">Pan-India Express Shipping</span>
                        <span className="text-[10px] text-stone-400">Insured Tamper-Proof Transit</span>
                      </div>
                      <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[11px]">
                        Complimentary
                      </span>
                    </div>

                    <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline">
                      <span className="text-sm font-semibold text-stone-950">Grand Total</span>
                      <span className="font-serif text-xl font-semibold text-[#781D42] tabular-nums">
                        ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method & Settlement Card */}
                  <div className="p-4 bg-[#FAF4EB] border border-[#E6D7C3] rounded-xs text-xs text-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#781D42] uppercase tracking-wider text-[10px]">
                        Payment Details
                      </span>
                      <span className="font-semibold text-stone-900">
                        {order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'PayU Hosted Checkout'}
                      </span>
                    </div>

                    {order.paymentMethod === 'COD' ? (
                      <p className="text-[11px] text-stone-700 font-light leading-relaxed">
                        Payment of <strong>₹{Number(order.totalAmount).toLocaleString('en-IN')}</strong> will be collected in cash or UPI by our courier delivery partner upon parcel arrival.
                      </p>
                    ) : order.paymentStatus === 'PAID' ? (
                      <div className="text-[11px] text-emerald-900 font-light space-y-1">
                        <p className="flex items-center gap-1 font-medium text-emerald-800">
                          <CheckCircle2 size={13} />
                          <span>Online payment verified by PayU India.</span>
                        </p>
                        {order.paymentDetails?.txnid && (
                          <p className="font-mono text-[10px] text-stone-600">
                            Txn Ref: {order.paymentDetails.txnid} {order.paymentDetails.mihpayid ? `(PayU ID: ${order.paymentDetails.mihpayid})` : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] text-amber-900 font-light">
                          Payment is currently <strong>{order.paymentStatus}</strong>. You can finalize your online payment now via PayU Hosted Checkout.
                        </p>
                        {paymentError && (
                          <p className="text-[10px] text-rose-700">{paymentError}</p>
                        )}
                        <button
                          type="button"
                          disabled={isProcessingPayment}
                          onClick={handlePayNow}
                          className="w-full py-2.5 px-4 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2"
                        >
                          {isProcessingPayment ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Opening PayU Gateway...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={13} />
                              <span>Pay Now via PayU (₹{Number(order.totalAmount).toLocaleString('en-IN')})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Back link */}
            <div className="pt-4 text-center">
              <Link
                to="/account/orders"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#781D42] hover:text-[#5B1123] font-semibold underline underline-offset-4"
              >
                <ArrowLeft size={14} />
                <span>Return to All Orders</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 23: CUSTOMER ORDER CANCELLATION MODAL                         */}
      {/* ------------------------------------------------------------------ */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xs border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  Cancel Order {order.orderNumber}
                </h3>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                  Patron Order Cancellation
                </span>
              </div>
            </div>

            <p className="text-stone-600 font-light leading-relaxed">
              Are you sure you wish to cancel this order? Once cancelled, this action cannot be undone.
            </p>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Impact Notification */}
            <div className="p-3.5 bg-[#FAF4EB] border border-[#E6D7C3] rounded-xs space-y-2">
              <span className="font-semibold text-[#781D42] uppercase tracking-wider text-[10px] block">
                Financial & Inventory Settlement
              </span>
              {order.paymentMethod === 'COD' ? (
                <p className="text-[11px] text-stone-700 font-light leading-relaxed">
                  • <strong>Cash on Delivery:</strong> No payment has been collected, and no courier dispatch will occur.
                </p>
              ) : order.paymentStatus === 'PAID' ? (
                <p className="text-[11px] text-emerald-900 font-light leading-relaxed">
                  • <strong>PayU Online Refund:</strong> Your payment of <strong>₹{Number(order.totalAmount).toLocaleString('en-IN')}</strong> will be automatically refunded through PayU India to your original payment source (5-7 business days).
                </p>
              ) : (
                <p className="text-[11px] text-stone-700 font-light leading-relaxed">
                  • <strong>Payment Status:</strong> Pending transaction will be cancelled with no deduction.
                </p>
              )}
              <p className="text-[11px] text-stone-700 font-light leading-relaxed">
                • <strong>Inventory Release:</strong> Reserved hand-crafted couture pieces will be restored to inventory.
              </p>
            </div>

            {/* Cancellation Reason Selector */}
            <div className="space-y-1.5">
              <label className="font-medium text-stone-700 text-[11px] block">
                Please select a cancellation reason *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xs text-xs focus:outline-rose-800"
              >
                <option value="Ordered wrong size or color">Ordered wrong size or color</option>
                <option value="Changed my mind / No longer needed">Changed my mind / No longer needed</option>
                <option value="Found alternative product or price">Found alternative product or price</option>
                <option value="Delivery timeframe takes too long">Delivery timeframe takes too long</option>
                <option value="Placed order by mistake">Placed order by mistake</option>
                <option value="Other">Other reason</option>
              </select>

              {cancelReason === 'Other' && (
                <textarea
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  placeholder="Please specify why you are cancelling..."
                  rows={2}
                  className="w-full p-2 border border-stone-200 rounded-xs text-xs mt-1"
                />
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 font-semibold rounded-xs hover:bg-stone-50"
              >
                Keep My Order
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xs flex items-center gap-1.5"
              >
                {isSubmittingCancel ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Processing Cancellation...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 23: CUSTOMER RETURN & EXCHANGE REQUEST MODAL                  */}
      {/* ------------------------------------------------------------------ */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xs border border-stone-200 max-w-lg w-full p-6 shadow-2xl space-y-5 text-xs my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center shrink-0">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">
                    Request Return / Exchange
                  </h3>
                  <span className="text-[10px] text-[#781D42] uppercase tracking-wider font-semibold">
                    Order {order.orderNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <XCircle size={18} />
              </button>
            </div>

            {returnError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{returnError}</span>
              </div>
            )}

            {/* Policy Snapshot Notice */}
            <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xs space-y-1 text-stone-600 font-light">
              <p className="font-semibold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#781D42]" />
                <span>{policyInfo?.returnWindowDays || 7}-Day Atelier Return Policy</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Garments must be unworn, unwashed, and undamaged with all original heirloom tags and security packaging intact. Complimentary insured reverse pickup will be scheduled upon approval.
              </p>
            </div>

            {/* Itemized Selection */}
            <div className="space-y-2">
              <label className="font-semibold text-stone-900 uppercase tracking-wider text-[10px] block">
                Select Pieces to Return *
              </label>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xs overflow-hidden max-h-48 overflow-y-auto">
                {(order.items || []).map((item) => {
                  const isChecked = selectedReturnItems[item.id]?.selected ?? false;
                  const itemQty = selectedReturnItems[item.id]?.quantity ?? item.quantity;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isChecked ? 'bg-[#FAF9F5]' : 'bg-white opacity-60'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedReturnItems((prev) => ({
                              ...prev,
                              [item.id]: {
                                selected: checked,
                                quantity: checked ? item.quantity : 0,
                                condition: prev[item.id]?.condition || 'UNOPENED',
                              },
                            }));
                          }}
                          className="rounded-xs text-[#781D42] focus:ring-[#781D42]"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 truncate">{item.productTitle}</p>
                          <p className="text-[11px] text-stone-500">
                            Size: {item.size} · Color: {item.color} · SKU: {item.sku}
                          </p>
                        </div>
                      </label>

                      {isChecked && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-stone-500">Qty:</span>
                          <select
                            value={itemQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setSelectedReturnItems((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  quantity: val,
                                },
                              }));
                            }}
                            className="p-1 border border-stone-300 rounded-xs text-xs bg-white"
                          >
                            {Array.from({ length: item.quantity }, (_, i) => i + 1).map((q) => (
                              <option key={q} value={q}>
                                {q}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="font-medium text-stone-700 text-[11px] block">
                Primary Reason for Return *
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xs text-xs focus:outline-rose-800"
              >
                <option value="Size fitting too large / loose">Size fitting too large / loose</option>
                <option value="Size fitting too tight / small">Size fitting too tight / small</option>
                <option value="Color or fabric different from expectations">Color or fabric different from preview</option>
                <option value="Defective stitching or damaged embroidery">Defective stitching or damaged embroidery</option>
                <option value="Incorrect piece delivered">Incorrect piece delivered</option>
                <option value="Other reason">Other reason</option>
              </select>
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <label className="font-medium text-stone-700 text-[11px] block">
                Additional Comments / Fitting Notes (Optional)
              </label>
              <textarea
                value={returnComments}
                onChange={(e) => setReturnComments(e.target.value)}
                placeholder="Share any fitting or quality details with our artisan team..."
                rows={2}
                className="w-full p-2.5 border border-stone-200 rounded-xs text-xs"
              />
            </div>

            {/* Photo Evidence Upload */}
            <div className="space-y-2">
              <label className="font-medium text-stone-700 text-[11px] flex items-center justify-between">
                <span>Upload Photos (Recommended for Defects / Damaged Items)</span>
                {isUploadingImages && <RefreshCw size={12} className="animate-spin text-stone-400" />}
              </label>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={isUploadingImages}
                className="w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xs file:border-0 file:text-xs file:font-semibold file:bg-[#FAF4EB] file:text-[#781D42] hover:file:bg-[#F3E7D3] cursor-pointer"
              />

              {evidenceImages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {evidenceImages.map((imgUrl, i) => (
                    <div key={i} className="w-14 h-14 rounded-xs border border-stone-200 overflow-hidden relative group">
                      <img src={imgUrl} alt="Evidence" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEvidenceImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-stone-900/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="Remove photo"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isSubmittingReturn}
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 font-semibold rounded-xs hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReturn || isUploadingImages}
                onClick={handleSubmitReturn}
                className="px-5 py-2 bg-[#781D42] hover:bg-[#5B1123] text-amber-50 font-semibold rounded-xs flex items-center gap-1.5"
              >
                {isSubmittingReturn ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Submit Return Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
