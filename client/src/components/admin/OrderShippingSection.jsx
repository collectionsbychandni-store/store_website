import React, { useState, useEffect, useCallback } from 'react';
import * as shippingService from '../../services/shippingService';
import {
  Truck,
  Package,
  Printer,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Send,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

/**
 * Collections by Chandni - Admin Order Shipping & Logistics Section
 *
 * Implements Launch Step 22:
 * - Shiprocket live courier serviceability & rates lookup
 * - Forward consignment booking with weight/dimensions override
 * - AWB generation & courier selection
 * - Pickup scheduling with date selection
 * - Shipping label PDF & Manifest download
 * - Real-time tracking refresh & milestone timeline
 * - Shipment cancellation with reason capture
 * - Returns & reverse pickup order creation
 * - Strict segregation of order status, payment status, and shipment status
 */
export default function OrderShippingSection({ order, onOrderUpdated }) {
  // Config state
  const [shippingConfig, setShippingConfig] = useState(null);

  // Shipments state
  const [shipments, setShipments] = useState([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(true);

  // Packaging dimensions & weights
  const [weight, setWeight] = useState('0.5');
  const [length, setLength] = useState('15');
  const [breadth, setBreadth] = useState('10');
  const [height, setHeight] = useState('5');

  // Serviceability & rates
  const [serviceability, setServiceability] = useState(null);
  const [isCheckingServiceability, setIsCheckingServiceability] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState('');

  // Creation & Actions
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [isAssigningAwb, setIsAssigningAwb] = useState(false);
  const [pickupDate, setPickupDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [isSchedulingPickup, setIsSchedulingPickup] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isGeneratingManifest, setIsGeneratingManifest] = useState(false);
  const [isRefreshingTracking, setIsRefreshingTracking] = useState(false);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Cancelled by store administration');
  const [isCancelling, setIsCancelling] = useState(false);

  // Returns state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('Patron requested size exchange or atelier return');
  const [isCreatingReturn, setIsCreatingReturn] = useState(false);

  // Tracking details
  const [activeTracking, setActiveTracking] = useState(null);
  const [copiedAwb, setCopiedAwb] = useState(false);

  // Feedback messages
  const [feedback, setFeedback] = useState(null);

  // Load config & shipments
  const loadShipments = useCallback(async () => {
    if (!order?.id) return;
    try {
      setIsLoadingShipments(true);
      const [cfgRes, shipRes] = await Promise.all([
        shippingService.getShippingConfig().catch(() => null),
        shippingService.getOrderShipments(order.id).catch(() => ({ data: [] })),
      ]);

      if (cfgRes?.data) {
        setShippingConfig(cfgRes.data);
      }
      if (shipRes?.data) {
        setShipments(shipRes.data);
      }
    } catch (err) {
      console.error('Error loading shipping data:', err);
    } finally {
      setIsLoadingShipments(false);
    }
  }, [order?.id]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  // Find active forward shipment
  const activeForwardShipment = shipments.find(
    (s) => !s.isReturn && s.status !== 'CANCELLED'
  );
  const returnShipments = shipments.filter((s) => s.isReturn);

  // Load tracking when active forward shipment with AWB is available
  useEffect(() => {
    if (activeForwardShipment?.awbCode && !activeTracking) {
      shippingService
        .trackShipment(activeForwardShipment.id, { awb: activeForwardShipment.awbCode })
        .then((res) => {
          if (res?.data) setActiveTracking(res.data);
        })
        .catch(() => null);
    }
  }, [activeForwardShipment, activeTracking]);

  // Check courier serviceability & rates
  const handleCheckServiceability = async () => {
    if (!order?.shippingAddress?.pincode) {
      setFeedback({
        type: 'error',
        message: 'Order shipping address has no delivery PIN code.',
      });
      return;
    }

    setIsCheckingServiceability(true);
    setFeedback(null);
    try {
      const res = await shippingService.checkServiceability(order.id, {
        weight: parseFloat(weight) || 0.5,
      });

      if (res?.data) {
        setServiceability(res.data);
        if (res.data.couriers?.length > 0) {
          setSelectedCourierId(String(res.data.couriers[0].courierCompanyId));
          setFeedback({
            type: 'success',
            message: `Found ${res.data.couriers.length} serviceable courier partner(s) for PIN ${res.data.deliveryPostcode}`,
          });
        } else {
          setFeedback({
            type: 'error',
            message: `No serviceable couriers found for delivery PIN ${res.data.deliveryPostcode}`,
          });
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error checking courier serviceability',
      });
    } finally {
      setIsCheckingServiceability(false);
    }
  };

  // Create shipment with Shiprocket
  const handleCreateShipment = async () => {
    setIsCreatingShipment(true);
    setFeedback(null);
    try {
      const res = await shippingService.createShipment(order.id, {
        weight: parseFloat(weight) || 0.5,
        length: parseFloat(length) || 15,
        breadth: parseFloat(breadth) || 10,
        height: parseFloat(height) || 5,
        courierId: selectedCourierId ? parseInt(selectedCourierId, 10) : undefined,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Consignment created successfully with Shiprocket!',
      });
      await loadShipments();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to create Shiprocket consignment',
      });
    } finally {
      setIsCreatingShipment(false);
    }
  };

  // Assign AWB & Courier
  const handleAssignAwb = async (shipmentId, { simulate = false } = {}) => {
    setIsAssigningAwb(true);
    setFeedback(null);
    try {
      const res = await shippingService.assignAwb(shipmentId, {
        courierId: selectedCourierId ? parseInt(selectedCourierId, 10) : undefined,
        simulateIfWalletEmpty: simulate,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'AWB assigned successfully!',
      });
      await loadShipments();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to assign AWB';
      const isWallet =
        err.response?.data?.code === 'WALLET_RECHARGE_REQUIRED' ||
        errorMsg.toLowerCase().includes('wallet');

      setFeedback({
        type: 'error',
        message: errorMsg,
        isWalletError: isWallet,
        walletUrl: err.response?.data?.walletUrl || 'https://app.shiprocket.in/recharge-wallet',
        shipmentId,
      });
    } finally {
      setIsAssigningAwb(false);
    }
  };

  // Schedule pickup
  const handleSchedulePickup = async (shipmentId) => {
    setIsSchedulingPickup(true);
    setFeedback(null);
    try {
      const res = await shippingService.schedulePickup(shipmentId, {
        pickupDate,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Consignment pickup scheduled successfully!',
      });
      await loadShipments();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to schedule pickup',
      });
    } finally {
      setIsSchedulingPickup(false);
    }
  };

  // Generate / Download Label
  const handleGenerateLabel = async (shipmentId) => {
    setIsGeneratingLabel(true);
    setFeedback(null);
    try {
      const res = await shippingService.generateLabel(shipmentId);
      if (res?.data?.labelUrl) {
        window.open(res.data.labelUrl, '_blank', 'noopener,noreferrer');
        setFeedback({
          type: 'success',
          message: 'Shipping label PDF opened in a new tab.',
        });
      }
      await loadShipments();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to generate shipping label',
      });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  // Generate / Download Manifest
  const handleGenerateManifest = async (shipmentId) => {
    setIsGeneratingManifest(true);
    setFeedback(null);
    try {
      const res = await shippingService.generateManifest(shipmentId);
      if (res?.data?.manifestUrl) {
        window.open(res.data.manifestUrl, '_blank', 'noopener,noreferrer');
        setFeedback({
          type: 'success',
          message: 'Manifest PDF opened in a new tab.',
        });
      }
      await loadShipments();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to generate manifest',
      });
    } finally {
      setIsGeneratingManifest(false);
    }
  };

  // Refresh live tracking
  const handleRefreshTracking = async (shipmentId, awbCode) => {
    setIsRefreshingTracking(true);
    setFeedback(null);
    try {
      const res = await shippingService.trackShipment(shipmentId, { awb: awbCode });
      if (res?.data) {
        setActiveTracking(res.data);
        setFeedback({
          type: 'success',
          message: `Live tracking refreshed: ${res.data.latestActivity || res.data.currentStatus}`,
        });
      }
      await loadShipments();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to refresh tracking status',
      });
    } finally {
      setIsRefreshingTracking(false);
    }
  };

  // Cancel shipment
  const handleConfirmCancel = async () => {
    if (!activeForwardShipment) return;
    setIsCancelling(true);
    setFeedback(null);
    try {
      const res = await shippingService.cancelShipment(activeForwardShipment.id, {
        reason: cancelReason,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Shipment successfully cancelled with Shiprocket.',
      });
      setShowCancelModal(false);
      await loadShipments();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to cancel shipment',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Open return modal
  const handleOpenReturnModal = () => {
    const initialItems = (order.items || []).map((item) => ({
      orderItemId: item.id,
      productVariantId: item.productVariantId,
      productTitle: item.productTitle,
      sku: item.sku,
      maxQty: item.quantity,
      quantity: item.quantity,
      selected: true,
    }));
    setReturnItems(initialItems);
    setShowReturnModal(true);
  };

  // Submit return order
  const handleCreateReturn = async () => {
    const selected = returnItems.filter((i) => i.selected && i.quantity > 0);
    if (selected.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please select at least one item to return.',
      });
      return;
    }

    setIsCreatingReturn(true);
    setFeedback(null);
    try {
      const res = await shippingService.createReturnOrder(order.id, {
        items: selected.map((i) => ({
          orderItemId: i.orderItemId,
          productVariantId: i.productVariantId,
          quantity: parseInt(i.quantity, 10),
        })),
        returnReason,
        weight: parseFloat(weight) || 0.5,
        length: parseFloat(length) || 15,
        breadth: parseFloat(breadth) || 10,
        height: parseFloat(height) || 5,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Return order registered successfully with Shiprocket!',
      });
      setShowReturnModal(false);
      await loadShipments();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to create return order',
      });
    } finally {
      setIsCreatingReturn(false);
    }
  };

  // Copy AWB code helper
  const handleCopyAwb = (awb) => {
    if (!awb) return;
    navigator.clipboard.writeText(awb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const isPrepaidUnpaid = order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID';
  const isOrderCancelled = order.status === 'CANCELLED';

  return (
    <div className="space-y-4 pt-2">
      {/* Section Header */}
      <div className="p-4 bg-[#FAF4EB] border border-[#E6D7C3] rounded-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#781D42] text-amber-50 flex items-center justify-center shrink-0">
              <Truck size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm font-semibold text-stone-900">
                  Shiprocket Logistics & Tracking
                </h3>
                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-xs bg-amber-100 text-amber-900 border border-amber-300">
                  {shippingConfig?.environment === 'production' ? 'Production' : 'Test / Sandbox'}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 font-light">
                Official API integration for courier rates, AWB dispatch, pickup scheduling, and live tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadShipments}
              disabled={isLoadingShipments}
              className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 rounded-xs"
            >
              <RefreshCw size={11} className={isLoadingShipments ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Status Separation Indicator Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E6D7C3]/60 text-[11px]">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-500 block">Fulfillment</span>
            <span className="font-semibold text-stone-900">{order.status}</span>
          </div>

          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-500 block">Payment Method</span>
            <span className="font-semibold text-stone-900">
              {order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'PayU Online'}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-500 block">Payment Status</span>
            <span
              className={`font-semibold ${
                order.paymentStatus === 'PAID'
                  ? 'text-emerald-700'
                  : order.paymentStatus === 'FAILED'
                  ? 'text-rose-700'
                  : 'text-amber-800'
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-500 block">Shipment Status</span>
            <span className="font-semibold text-[#781D42]">
              {activeForwardShipment ? activeForwardShipment.status : 'NOT CREATED'}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-stone-500 italic">
          * Strictly decoupled states: shipping creation or milestone transitions never alter payment or order status automatically.
        </p>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div
          className={`p-3 rounded-xs text-xs flex flex-col gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-start gap-2 w-full">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 font-light">{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-700 text-xs"
            >
              <X size={13} />
            </button>
          </div>

          {feedback.isWalletError && (
            <div className="mt-1 pt-2 border-t border-rose-200/70 flex flex-wrap items-center gap-2">
              <a
                href={feedback.walletUrl || 'https://app.shiprocket.in/recharge-wallet'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#781D42] hover:bg-[#5B1123] text-amber-50 rounded-xs text-[11px] font-semibold uppercase tracking-wider"
              >
                <span>Recharge Shiprocket Wallet (₹100 min)</span>
                <ExternalLink size={11} />
              </a>
              <button
                type="button"
                onClick={() =>
                  handleAssignAwb(feedback.shipmentId || activeForwardShipment?.id, { simulate: true })
                }
                className="inline-flex items-center gap-1 px-3 py-1 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xs text-[11px] font-semibold uppercase tracking-wider"
              >
                <span>Generate Demo / Sandbox AWB</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. FORWARD SHIPMENT MANAGEMENT                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeForwardShipment ? (
        <div className="p-4 bg-white border border-stone-200 rounded-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
                Active Forward Consignment
              </span>
              <h4 className="font-serif text-sm font-semibold text-stone-900 flex items-center gap-2">
                <span>{activeForwardShipment.courierName || 'Shiprocket Partner Courier'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-normal bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {activeForwardShipment.status}
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {activeForwardShipment.status !== 'CANCELLED' && activeForwardShipment.status !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xs text-[11px] font-medium"
                >
                  Cancel Shipment
                </button>
              )}
            </div>
          </div>

          {/* Consignment Specs & Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-stone-50 rounded-xs text-[11px]">
            <div>
              <span className="text-stone-400 block text-[9px] uppercase tracking-wider">Shiprocket IDs</span>
              <span className="font-mono text-stone-800 font-medium block">
                Shipment #{activeForwardShipment.shiprocketShipmentId || activeForwardShipment.id}
              </span>
              {activeForwardShipment.shiprocketOrderId && (
                <span className="text-[10px] text-stone-500 font-mono">
                  Order: {activeForwardShipment.shiprocketOrderId}
                </span>
              )}
            </div>

            <div>
              <span className="text-stone-400 block text-[9px] uppercase tracking-wider">AWB Number</span>
              {activeForwardShipment.awbCode ? (
                <div className="flex items-center gap-1.5 font-mono font-semibold text-stone-900">
                  <span>{activeForwardShipment.awbCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyAwb(activeForwardShipment.awbCode)}
                    className="text-stone-400 hover:text-stone-700"
                    title="Copy AWB"
                  >
                    {copiedAwb ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              ) : (
                <span className="text-amber-800 italic">Pending Courier Assignment</span>
              )}
            </div>

            <div>
              <span className="text-stone-400 block text-[9px] uppercase tracking-wider">Packaging Weight</span>
              <span className="text-stone-800">
                {activeForwardShipment.weight || weight} kg ({activeForwardShipment.length || length}×
                {activeForwardShipment.breadth || breadth}×{activeForwardShipment.height || height} cm)
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {/* If no AWB, show assign AWB */}
            {!activeForwardShipment.awbCode && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isAssigningAwb}
                  onClick={() => handleAssignAwb(activeForwardShipment.id)}
                  className="px-3 py-1.5 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                  title="Assign live courier & generate official AWB (requires recharged Shiprocket wallet)"
                >
                  {isAssigningAwb ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>Assign AWB & Courier</span>
                </button>
                <button
                  type="button"
                  disabled={isAssigningAwb}
                  onClick={() => handleAssignAwb(activeForwardShipment.id, { simulate: true })}
                  className="px-2.5 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 rounded-xs text-[11px] font-medium flex items-center gap-1"
                  title="Assign sandbox demo AWB to test label, pickup scheduling, and tracking without wallet freight deductions"
                >
                  <span>Test / Sandbox AWB</span>
                </button>
              </div>
            )}

            {/* If AWB assigned, show pickup scheduling if not scheduled */}
            {activeForwardShipment.awbCode && activeForwardShipment.pickupStatus !== 'SCHEDULED' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="text-xs py-1 px-2 border border-stone-300 rounded-xs bg-stone-50"
                />
                <button
                  type="button"
                  disabled={isSchedulingPickup}
                  onClick={() => handleSchedulePickup(activeForwardShipment.id)}
                  className="px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                >
                  {isSchedulingPickup ? <RefreshCw size={12} className="animate-spin" /> : <Calendar size={12} />}
                  <span>Schedule Pickup</span>
                </button>
              </div>
            )}

            {/* Shipping Label Button */}
            {activeForwardShipment.awbCode && (
              <button
                type="button"
                disabled={isGeneratingLabel}
                onClick={() => handleGenerateLabel(activeForwardShipment.id)}
                className="px-3 py-1.5 bg-white border border-stone-300 hover:border-[#781D42] text-stone-800 hover:text-[#781D42] rounded-xs text-xs font-medium flex items-center gap-1.5"
              >
                {isGeneratingLabel ? <RefreshCw size={12} className="animate-spin" /> : <Printer size={12} />}
                <span>Print Label (PDF)</span>
              </button>
            )}

            {/* Manifest Button */}
            {activeForwardShipment.awbCode && (
              <button
                type="button"
                disabled={isGeneratingManifest}
                onClick={() => handleGenerateManifest(activeForwardShipment.id)}
                className="px-3 py-1.5 bg-white border border-stone-300 hover:border-stone-500 text-stone-700 rounded-xs text-xs font-medium flex items-center gap-1.5"
              >
                {isGeneratingManifest ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={12} />}
                <span>Generate Manifest</span>
              </button>
            )}

            {/* Refresh Live Tracking */}
            {activeForwardShipment.awbCode && (
              <button
                type="button"
                disabled={isRefreshingTracking}
                onClick={() => handleRefreshTracking(activeForwardShipment.id, activeForwardShipment.awbCode)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xs text-xs font-medium flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={isRefreshingTracking ? 'animate-spin' : ''} />
                <span>Refresh Tracking</span>
              </button>
            )}

            {/* Public Tracking Link */}
            {activeForwardShipment.awbCode && (
              <a
                href={
                  activeForwardShipment.trackingUrl ||
                  `https://shiprocket.co//tracking/${activeForwardShipment.awbCode}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-[#781D42] hover:underline rounded-xs text-xs font-medium flex items-center gap-1"
              >
                <span>Track on Shiprocket</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Live Milestone Tracking Activities */}
          {activeTracking && (
            <div className="p-3 bg-[#FAF9F5] border border-stone-200 rounded-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                  <Clock size={13} className="text-[#781D42]" />
                  <span>Real-Time Provider Milestones</span>
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  Status: {activeTracking.currentStatus}
                </span>
              </div>

              {activeTracking.activities?.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {activeTracking.activities.slice(0, 5).map((act, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-2 bg-white border border-stone-200/80 rounded-xs text-[11px] gap-2"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium text-stone-900 block">{act.status}</span>
                        {act.location && <span className="text-stone-500 text-[10px]">Location: {act.location}</span>}
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 shrink-0">{act.date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic">
                  Latest status: {activeTracking.latestActivity || 'Shipment manifest generated. Awaiting courier pickup scan.'}
                </p>
              )}
            </div>
          )}

          {/* Reverse Pickup Return Button for Delivered Consignments */}
          {(order.status === 'DELIVERED' || activeForwardShipment.status === 'DELIVERED') && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-stone-900 text-xs block">
                  Patron Return or Exchange Request?
                </span>
                <span className="text-[11px] text-stone-500 font-light">
                  Create a reverse pickup consignment with Shiprocket to return goods to the atelier.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenReturnModal}
                className="px-3 py-1.5 bg-stone-900 text-amber-50 hover:bg-stone-800 rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                <span>Prepare Return</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* 2. NO SHIPMENT CREATED YET - BOOKING WORKFLOW                       */
        /* ------------------------------------------------------------------ */
        <div className="p-4 bg-white border border-stone-200 rounded-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <div>
              <h4 className="font-serif text-sm font-semibold text-stone-900">
                Book Forward Consignment with Shiprocket
              </h4>
              <p className="text-[11px] text-stone-500 font-light">
                Configure parcel weight, dimensions, and check real-time courier rates
              </p>
            </div>
          </div>

          {/* Validation Warnings */}
          {isOrderCancelled ? (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xs flex items-center gap-2">
              <AlertTriangle size={15} className="text-rose-600 shrink-0" />
              <span>Cannot create shipments for cancelled orders.</span>
            </div>
          ) : isPrepaidUnpaid ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                <CreditCard size={14} className="text-amber-800" />
                <span>Prepaid Payment Required Before Dispatch</span>
              </div>
              <p className="text-[11px] font-light leading-relaxed">
                This order is marked as online prepaid, but payment status is currently{' '}
                <strong>{order.paymentStatus}</strong>. Shipments cannot be booked with Shiprocket until the patron completes payment via PayU or manual audit verification confirms receipt.
              </p>
            </div>
          ) : order.paymentMethod === 'COD' ? (
            <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-900 text-xs rounded-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                <Banknote size={14} className="text-amber-800" />
                <span>Cash on Delivery (COD) Collectable</span>
              </div>
              <p className="text-[11px] font-light leading-relaxed">
                Shiprocket will be notified to collect <strong>₹{Number(order.totalAmount).toLocaleString('en-IN')}</strong> from the customer upon parcel handover.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
              <span>Prepaid online payment verified. Ready for atelier packaging and dispatch.</span>
            </div>
          )}

          {/* Packaging Weight and Dimensions Input */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xs space-y-3">
            <span className="text-[10px] uppercase tracking-wider text-stone-600 font-semibold block">
              Package Physical Specifications (Review / Override)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-stone-500 mb-1">Weight (KG)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-stone-300 rounded-xs text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-stone-500 mb-1">Length (CM)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-stone-300 rounded-xs text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-stone-500 mb-1">Breadth (CM)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={breadth}
                  onChange={(e) => setBreadth(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-stone-300 rounded-xs text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-stone-500 mb-1">Height (CM)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-stone-300 rounded-xs text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[10px] text-stone-500">
                Destination: {order.shippingAddress?.city}, {order.shippingAddress?.state} ({order.shippingAddress?.pincode})
              </span>

              <button
                type="button"
                disabled={isCheckingServiceability}
                onClick={handleCheckServiceability}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xs text-xs font-medium flex items-center gap-1.5"
              >
                <Truck size={12} className={isCheckingServiceability ? 'animate-spin' : ''} />
                <span>Check Rates & Couriers</span>
              </button>
            </div>
          </div>

          {/* Available Couriers List */}
          {serviceability?.couriers?.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-600 font-semibold block">
                Select Courier Partner ({serviceability.couriers.length} available)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serviceability.couriers.map((c) => (
                  <label
                    key={c.courierCompanyId}
                    className={`p-2.5 rounded-xs border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      selectedCourierId === String(c.courierCompanyId)
                        ? 'bg-[#FAF4EB] border-[#781D42] text-stone-900 ring-1 ring-[#781D42]'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="courierSelection"
                        value={c.courierCompanyId}
                        checked={selectedCourierId === String(c.courierCompanyId)}
                        onChange={(e) => setSelectedCourierId(e.target.value)}
                        className="text-[#781D42] focus:ring-[#781D42]"
                      />
                      <div>
                        <span className="font-semibold block">{c.courierName}</span>
                        <span className="text-[10px] text-stone-500 block">
                          ETA: {c.etd} · Mode: {c.mode}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-serif font-semibold text-stone-950 block">
                        ₹{Number(c.rate).toLocaleString('en-IN')}
                      </span>
                      {c.rating && (
                        <span className="text-[9px] text-amber-700">★ {c.rating}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Book Shipment CTA */}
          <div className="text-right pt-2 border-t border-stone-100">
            <button
              type="button"
              disabled={isCreatingShipment || isOrderCancelled || isPrepaidUnpaid}
              onClick={handleCreateShipment}
              className="px-5 py-2 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] disabled:opacity-50 disabled:pointer-events-none rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ml-auto"
            >
              {isCreatingShipment ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Connecting to Shiprocket...</span>
                </>
              ) : (
                <>
                  <Package size={14} />
                  <span>Create Shipment with Shiprocket</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. RETURN / REVERSE PICKUP SHIPMENTS (IF ANY)                      */}
      {/* ------------------------------------------------------------------ */}
      {returnShipments.length > 0 && (
        <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-xs space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-orange-700" />
            <h4 className="font-serif text-sm font-semibold text-orange-950">
              Reverse Pickup Consignments ({returnShipments.length})
            </h4>
          </div>

          <div className="space-y-2">
            {returnShipments.map((ret) => (
              <div
                key={ret.id}
                className="p-3 bg-white border border-orange-200 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900">
                      Return #{ret.shiprocketShipmentId || ret.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-orange-100 text-orange-800 border border-orange-300">
                      {ret.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 pt-0.5">
                    Reason: <strong>{ret.returnReason || 'Patron Return'}</strong>
                  </p>
                  {ret.awbCode && (
                    <p className="text-[11px] font-mono text-stone-500">Reverse AWB: {ret.awbCode}</p>
                  )}
                </div>

                <div className="text-left sm:text-right text-[10px] text-stone-400 font-mono">
                  <span>Initiated: {new Date(ret.createdAt).toLocaleDateString('en-IN')}</span>
                  <p className="text-stone-500 italic text-[10px]">
                    * Awaiting physical atelier inspection for restock audit.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CANCEL SHIPMENT MODAL                                              */}
      {/* ------------------------------------------------------------------ */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isCancelling && setShowCancelModal(false)}
        >
          <div
            className="bg-white max-w-sm w-full p-6 rounded-xs shadow-xl border border-stone-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Cancel Shiprocket Shipment
              </h3>
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                Are you sure you want to cancel shipment{' '}
                <strong className="font-mono text-stone-900">
                  {activeForwardShipment?.awbCode || activeForwardShipment?.shiprocketShipmentId}
                </strong>
                ? This will notify Shiprocket and invalidate the pickup request.
              </p>
            </div>

            <div className="text-left space-y-1">
              <label className="block text-[10px] uppercase text-stone-500 font-semibold">
                Cancellation Reason
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 bg-stone-50 border border-stone-300 rounded-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-xs"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs uppercase tracking-wider font-semibold rounded-xs"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RETURN PREPARATION MODAL                                           */}
      {/* ------------------------------------------------------------------ */}
      {showReturnModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isCreatingReturn && setShowReturnModal(false)}
        >
          <div
            className="bg-white max-w-lg w-full p-6 rounded-xs shadow-xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold block">
                  Reverse Logistics
                </span>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  Prepare Return Order ({order.orderNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-600 font-light">
              Select artisan pieces and quantities being returned by the customer. A reverse courier pickup will be requested at the patron's address.
            </p>

            {/* Itemized selection */}
            <div className="space-y-2 border border-stone-200 rounded-xs p-3 bg-stone-50">
              <span className="text-[10px] uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                Select Return Items & Quantities
              </span>
              {returnItems.map((item, idx) => (
                <div
                  key={item.orderItemId || idx}
                  className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-xs text-xs gap-3"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        const copy = [...returnItems];
                        copy[idx].selected = e.target.checked;
                        setReturnItems(copy);
                      }}
                      className="text-[#781D42] focus:ring-[#781D42]"
                    />
                    <div className="truncate">
                      <span className="font-semibold block truncate">{item.productTitle}</span>
                      <span className="text-[10px] text-stone-400 font-mono">SKU: {item.sku}</span>
                    </div>
                  </label>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-stone-500">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      max={item.maxQty}
                      value={item.quantity}
                      disabled={!item.selected}
                      onChange={(e) => {
                        const copy = [...returnItems];
                        copy[idx].quantity = Math.max(1, Math.min(item.maxQty, parseInt(e.target.value, 10) || 1));
                        setReturnItems(copy);
                      }}
                      className="w-14 py-1 px-1.5 text-xs text-center border border-stone-300 rounded-xs bg-stone-50 disabled:opacity-40"
                    />
                    <span className="text-[10px] text-stone-400">/ {item.maxQty}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[10px] uppercase text-stone-500 font-semibold mb-1">
                Return Reason
              </label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Size exchange request, fitting adjustment..."
                className="w-full text-xs py-2 px-2.5 bg-stone-50 border border-stone-300 rounded-xs"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs text-[11px] font-light leading-relaxed">
              <strong>Atelier Quality Assurance Policy:</strong> Creating a reverse shipment does NOT automatically restock inventory or issue a refund. Stock must be physically inspected upon arrival at the atelier.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isCreatingReturn}
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-semibold rounded-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingReturn}
                onClick={handleCreateReturn}
                className="px-5 py-2 bg-[#781D42] hover:bg-[#5B1123] text-amber-50 text-xs uppercase tracking-wider font-semibold rounded-xs"
              >
                {isCreatingReturn ? 'Creating Return Consignment...' : 'Book Reverse Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
