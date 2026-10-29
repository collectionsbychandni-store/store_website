import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import * as orderService from '../../services/orderService';
import OrderShippingSection from '../../components/admin/OrderShippingSection';
import OrderReturnRefundSection from '../../components/admin/OrderReturnRefundSection';
import {
  Package,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  User,
  CreditCard,
  Banknote,
  RotateCcw,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

const ALL_ORDER_STATUSES = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
];

const ALL_PAYMENT_STATUSES = [
  'ALL',
  'AWAITING_PAYMENT',
  'PAID',
  'FAILED',
  'REFUNDED',
];

const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Admin Order Management Page (/admin/orders)
 *
 * Implements Step 15:
 * - Searchable, filterable, paginated order fulfillment dashboard
 * - Order detail modal/drawer with immutable snapshots
 * - State machine status transitions with confirmation
 * - Segregated payment status updates
 * - Full audit logs
 */
export default function OrderManagement() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Detail Modal / Drawer state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Status Update state
  const [targetStatus, setTargetStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Payment Status Update state
  const [targetPayment, setTargetPayment] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Load orders
  const loadOrders = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setError('');
      const res = await orderService.getAdminOrders({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        paymentStatus: paymentFilter !== 'ALL' ? paymentFilter : undefined,
      });

      if (res?.data) {
        setOrders(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, paymentFilter]);

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  // Open detail drawer
  const handleOpenDetail = (order) => {
    setSelectedOrder(order);
    setTargetStatus('');
    setStatusNote('');
    setIsInternalNote(false);
    setTargetPayment(order.paymentStatus || 'AWAITING_PAYMENT');
    setPaymentNote('');
    setIsDetailOpen(true);
  };

  // Trigger status transition
  const handleInitiateStatusChange = (status) => {
    setTargetStatus(status);
    setIsInternalNote(false);
    setStatusNote('');
    setShowStatusConfirm(true);
  };

  // Confirm status update
  const handleConfirmStatusUpdate = async () => {
    if (!selectedOrder || !targetStatus) return;
    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      const res = await orderService.updateOrderStatus(selectedOrder.id, {
        status: targetStatus,
        note: statusNote,
        isInternalNote,
      });

      if (res?.data) {
        setSelectedOrder(res.data);
        const invNotice =
          res.inventoryAction === 'DEDUCTED'
            ? ' · Inventory stock allocated'
            : res.inventoryAction === 'RESTORED'
            ? ' · Inventory stock released & restored'
            : '';
        setFeedback({
          type: 'success',
          message: `Order ${selectedOrder.orderNumber} updated to ${targetStatus}${invNotice}`,
        });
        setShowStatusConfirm(false);
        setTargetStatus('');
        setStatusNote('');
        setIsInternalNote(false);
        await loadOrders(pagination.page);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update order status',
      });
      setShowStatusConfirm(false);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Update payment status
  const handleUpdatePaymentStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !targetPayment) return;
    setIsUpdatingPayment(true);
    setFeedback(null);

    try {
      const res = await orderService.updateOrderPaymentStatus(selectedOrder.id, {
        paymentStatus: targetPayment,
        note: paymentNote,
      });

      if (res?.data) {
        setSelectedOrder(res.data);
        setFeedback({
          type: 'success',
          message: `Payment status for ${selectedOrder.orderNumber} updated to ${targetPayment}`,
        });
        await loadOrders(pagination.page);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update payment status',
      });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={11} />
            Delivered
          </span>
        );
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <Truck size={11} />
            In Transit
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Sparkles size={11} />
            Processing
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            <Package size={11} />
            Packed
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF4EB] text-[#781D42] border border-[#E6D7C3]">
            <Sparkles size={11} />
            Confirmed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle size={11} />
            Cancelled
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
            <RotateCcw size={11} />
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={11} />
            Pending
          </span>
        );
    }
  };

  // Inventory Handling Indicator
  const renderInventoryBadge = (ord) => {
    if (!ord) return null;
    if (ord.isStockDeducted) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={10} />
          Stock Allocated
        </span>
      );
    }
    if (ord.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
          No Stock Held
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
        <Clock size={10} />
        Pending Allocation
      </span>
    );
  };

  // Payment Status Badge Helper
  const renderPaymentBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-xs bg-emerald-100/80 text-emerald-900">
            Paid
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-xs bg-stone-200 text-stone-800">
            Refunded
          </span>
        );
      case 'FAILED':
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-xs bg-rose-100 text-rose-800">
            Failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-xs bg-amber-100 text-amber-900">
            Awaiting
          </span>
        );
    }
  };

  // Metrics summary
  const totalOrdersCount = pagination.total || orders.length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const inTransitCount = orders.filter((o) => ['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900">
              Orders & Fulfillment
            </h1>
            <p className="text-xs text-stone-500 font-light mt-0.5">
              Monitor customer purchases, manage fulfillment statuses, and inspect immutable order snapshots.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadOrders(pagination.page)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs uppercase tracking-wider rounded-xs font-medium transition-colors self-start sm:self-auto"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Global Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xs border text-xs flex items-center justify-between gap-3 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              Total Orders
            </span>
            <p className="font-serif text-2xl font-semibold text-stone-900 tabular-nums">
              {totalOrdersCount}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
              Pending Fulfillment
            </span>
            <p className="font-serif text-2xl font-semibold text-amber-800 tabular-nums">
              {pendingCount}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">
              In Transit / Packed
            </span>
            <p className="font-serif text-2xl font-semibold text-blue-800 tabular-nums">
              {inTransitCount}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">
              Settled Revenue
            </span>
            <p className="font-serif text-2xl font-semibold text-emerald-800 tabular-nums">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white border border-stone-200 rounded-xs p-3.5 sm:p-4 shadow-xs space-y-3 max-w-full">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full min-w-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order #, customer name, email, or phone..."
                className="w-full text-xs py-2 pl-9 pr-8 bg-stone-50 border border-stone-200 rounded-xs focus:outline-none focus:border-[#781D42] text-stone-900"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-xs focus:outline-none focus:border-[#781D42] text-stone-800 truncate"
              >
                {ALL_ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    Fulfillment: {st}
                  </option>
                ))}
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full md:w-auto text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-xs focus:outline-none focus:border-[#781D42] text-stone-800 truncate"
              >
                {ALL_PAYMENT_STATUSES.map((pst) => (
                  <option key={pst} value={pst}>
                    Payment: {pst}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-stone-200 rounded-xs shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-[#781D42] rounded-full animate-spin mx-auto" />
              <p className="text-xs uppercase tracking-wider text-stone-500 font-medium">
                Loading orders database...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-2 text-rose-700 text-xs">
              <AlertCircle size={24} className="mx-auto" />
              <p>{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center space-y-2 text-stone-500 text-xs">
              <Package size={28} className="text-stone-400 mx-auto" />
              <p className="font-serif text-base font-semibold text-stone-800">No Orders Found</p>
              <p className="font-light">No orders match the current filter or search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order # & Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Pieces</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Fulfillment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((ord) => {
                    const customerName = ord.customer?.name || ord.shippingAddress?.name || 'Patron';
                    const customerEmail = ord.customer?.email || 'Registered Customer';
                    const itemsCount = ord.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
                    const formattedDate = ord.createdAt
                      ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '-';

                    return (
                      <tr key={ord.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-stone-900 block">
                            {ord.orderNumber}
                          </span>
                          <span className="text-[10px] text-stone-500">{formattedDate}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-medium text-stone-900 block">{customerName}</span>
                          <span className="text-[10px] text-stone-500 truncate block max-w-[160px]">
                            {customerEmail}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-stone-700">
                          {itemsCount} {itemsCount === 1 ? 'piece' : 'pieces'}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-serif font-semibold text-stone-950 tabular-nums">
                            ₹{Number(ord.totalAmount).toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div>{renderPaymentBadge(ord.paymentStatus)}</div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-600">
                              {ord.paymentMethod === 'COD' ? (
                                <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200 inline-flex items-center gap-1">
                                  <Banknote size={10} /> COD
                                </span>
                              ) : (
                                <span className="text-[#781D42] bg-[#FAF4EB] px-1.5 py-0.5 rounded-xs border border-[#E6D7C3] inline-flex items-center gap-1">
                                  <CreditCard size={10} /> PayU
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div>{renderStatusBadge(ord.status)}</div>
                            <div>{renderInventoryBadge(ord)}</div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-200 hover:border-[#781D42] text-[#781D42] hover:bg-[#FAF4EB] rounded-xs text-xs font-medium transition-colors"
                          >
                            <Eye size={13} />
                            <span>Manage</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
              <span>
                Showing {orders.length} of {pagination.total} orders
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => loadOrders(pagination.page - 1)}
                  className="px-3 py-1 border border-stone-200 rounded-xs text-xs uppercase tracking-wider disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="font-mono text-stone-800">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadOrders(pagination.page + 1)}
                  className="px-3 py-1 border border-stone-200 rounded-xs text-xs uppercase tracking-wider disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ORDER DETAILS & FULFILLMENT DRAWER                                 */}
      {/* ------------------------------------------------------------------ */}
      {isDetailOpen && selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
          onClick={() => setIsDetailOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-20">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#781D42] font-semibold block">
                  Atelier Fulfillment Order
                </span>
                <h2 className="font-serif text-xl font-semibold text-stone-900">
                  {selectedOrder.orderNumber}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Quick Status Bar */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider block">
                    Current Fulfillment Status
                  </span>
                  <div className="mt-1">{renderStatusBadge(selectedOrder.status)}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider block">
                    Inventory Coordination
                  </span>
                  <div className="mt-1">{renderInventoryBadge(selectedOrder)}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider block">
                    Payment Status
                  </span>
                  <div className="mt-1">{renderPaymentBadge(selectedOrder.paymentStatus)}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider block">
                    Payment Method
                  </span>
                  <div className="mt-1 font-semibold text-stone-900">
                    {selectedOrder.paymentMethod === 'COD' ? (
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-xs border border-amber-200 inline-flex items-center gap-1 text-[11px]">
                        <Banknote size={11} /> Cash on Delivery (COD)
                      </span>
                    ) : (
                      <span className="text-[#781D42] bg-[#FAF4EB] px-2 py-0.5 rounded-xs border border-[#E6D7C3] inline-flex items-center gap-1 text-[11px]">
                        <CreditCard size={11} /> PayU Hosted
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider block">
                    Order Total
                  </span>
                  <span className="font-serif text-base font-semibold text-stone-950 tabular-nums">
                    ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status Transition Action Panel */}
              <div className="p-4 bg-[#FAF9F5] border border-stone-200 rounded-xs space-y-3">
                <h3 className="font-serif text-sm font-semibold text-stone-900">
                  Update Fulfillment Status
                </h3>

                {(() => {
                  const allowedNext = ALLOWED_TRANSITIONS[selectedOrder.status] || [];
                  if (allowedNext.length === 0) {
                    return (
                      <p className="text-[11px] text-stone-500 italic">
                        This order is in terminal state ({selectedOrder.status}) and cannot transition further.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <p className="text-[11px] text-stone-600">
                        Select next valid milestone according to atelier fulfillment workflow:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allowedNext.map((nextSt) => (
                          <button
                            key={nextSt}
                            type="button"
                            onClick={() => handleInitiateStatusChange(nextSt)}
                            className={`px-3 py-1.5 rounded-xs text-xs uppercase tracking-wider font-semibold transition-colors ${
                              nextSt === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                                : 'bg-[#781D42] text-amber-50 hover:bg-[#5B1123]'
                            }`}
                          >
                            Advance to {nextSt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Payment Gateway / Method Technical Details */}
              {selectedOrder.paymentMethod === 'COD' ? (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xs space-y-1 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                    <Banknote size={15} className="text-amber-800" />
                    <span>Cash on Delivery (COD) Instructions</span>
                  </div>
                  <p className="font-light text-[11px] leading-relaxed">
                    This order is marked for cash or UPI collection of <strong>₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}</strong> by the courier delivery partner upon handover. When collection is confirmed, set Payment Status to <strong>PAID</strong> below.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-[#FAF9F5] border border-stone-200 rounded-xs space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                      <CreditCard size={15} className="text-[#781D42]" />
                      <span>PayU Hosted Checkout Information</span>
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      Env: {selectedOrder.paymentDetails?.environment || 'TEST'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-stone-700 pt-1">
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase tracking-wider">Gateway Txn ID</span>
                      <span className="truncate block font-semibold">{selectedOrder.paymentDetails?.txnid || selectedOrder.lastTxnId || 'Awaiting Checkout Initiation'}</span>
                    </div>
                    {selectedOrder.paymentDetails?.mihpayid && (
                      <div>
                        <span className="text-stone-400 block text-[9px] uppercase tracking-wider">PayU Payment ID</span>
                        <span className="truncate block font-semibold">{selectedOrder.paymentDetails.mihpayid}</span>
                      </div>
                    )}
                    {selectedOrder.paymentDetails?.mode && (
                      <div>
                        <span className="text-stone-400 block text-[9px] uppercase tracking-wider">Payment Mode</span>
                        <span>{selectedOrder.paymentDetails.mode}</span>
                      </div>
                    )}
                    {selectedOrder.paymentDetails?.bankRefNum && (
                      <div>
                        <span className="text-stone-400 block text-[9px] uppercase tracking-wider">Bank Reference #</span>
                        <span>{selectedOrder.paymentDetails.bankRefNum}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Audited Payment Adjustment */}
              <form onSubmit={handleUpdatePaymentStatus} className="p-4 bg-white border border-stone-200 rounded-xs space-y-3">
                <h3 className="font-serif text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                  <CreditCard size={15} className="text-[#781D42]" />
                  <span>Manual Payment Status Audit</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                      Payment Status
                    </label>
                    <select
                      value={targetPayment}
                      onChange={(e) => setTargetPayment(e.target.value)}
                      className="w-full text-xs py-2 px-2.5 bg-stone-50 border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                    >
                      {ALL_PAYMENT_STATUSES.filter((s) => s !== 'ALL').map((pst) => (
                        <option key={pst} value={pst}>
                          {pst}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                      Audit Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g. Bank wire verified ref #..."
                      className="w-full text-xs py-2 px-2.5 bg-stone-50 border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    disabled={isUpdatingPayment}
                    className="px-4 py-1.5 bg-stone-900 text-white hover:bg-stone-800 text-xs uppercase tracking-wider font-semibold rounded-xs"
                  >
                    {isUpdatingPayment ? 'Updating...' : 'Update Payment Status'}
                  </button>
                </div>
              </form>

              {/* Shiprocket Logistics, AWB, Tracking & Returns Section */}
              <OrderShippingSection
                order={selectedOrder}
                onOrderUpdated={async () => {
                  try {
                    const refreshed = await orderService.getAdminOrder(selectedOrder.id);
                    if (refreshed?.data) setSelectedOrder(refreshed.data);
                  } catch (e) {
                    // Ignore
                  }
                  await loadOrders(pagination.page);
                }}
              />

              {/* Returns, Refunds & RTO Section (Step 23) */}
              <OrderReturnRefundSection
                order={selectedOrder}
                onOrderUpdated={async () => {
                  try {
                    const refreshed = await orderService.getAdminOrder(selectedOrder.id);
                    if (refreshed?.data) setSelectedOrder(refreshed.data);
                  } catch (e) {
                    // Ignore
                  }
                  await loadOrders(pagination.page);
                }}
              />

              {/* Customer & Shipping Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Info */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xs space-y-2">
                  <h4 className="font-serif font-semibold text-stone-900 flex items-center gap-1.5 text-xs">
                    <User size={14} className="text-stone-500" />
                    <span>Customer Details</span>
                  </h4>
                  <div className="text-stone-600 space-y-0.5">
                    <p className="font-semibold text-stone-900">
                      {selectedOrder.customer?.name || selectedOrder.shippingAddress?.name}
                    </p>
                    <p className="text-stone-500">{selectedOrder.customer?.email || 'Guest / Patron'}</p>
                    <p className="font-mono text-stone-500">
                      {selectedOrder.customer?.phone || selectedOrder.shippingAddress?.phone}
                    </p>
                  </div>
                </div>

                {/* Delivery Snapshot */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xs space-y-2">
                  <h4 className="font-serif font-semibold text-stone-900 flex items-center gap-1.5 text-xs">
                    <MapPin size={14} className="text-[#781D42]" />
                    <span>Immutable Shipping Address</span>
                  </h4>
                  <div className="text-stone-600 space-y-0.5 font-light">
                    <p className="font-semibold text-stone-900">{selectedOrder.shippingAddress?.name}</p>
                    <p>{selectedOrder.shippingAddress?.addressLine1}</p>
                    {selectedOrder.shippingAddress?.addressLine2 && (
                      <p>{selectedOrder.shippingAddress?.addressLine2}</p>
                    )}
                    <p className="font-medium text-stone-800">
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} -{' '}
                      {selectedOrder.shippingAddress?.pincode}
                    </p>
                    <p className="text-[10px] uppercase text-stone-400">
                      {selectedOrder.shippingAddress?.country || 'India'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Itemized Order Pieces */}
              <div className="space-y-3">
                <h4 className="font-serif font-semibold text-stone-900 border-b border-stone-100 pb-2">
                  Artisan Pieces ({(selectedOrder.items || []).length})
                </h4>

                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xs overflow-hidden">
                  {(selectedOrder.items || []).map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3 bg-white">
                      <div className="w-12 h-14 bg-stone-100 rounded-xs overflow-hidden shrink-0 border border-stone-200">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productTitle}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-stone-400 font-serif">
                            Couture
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 truncate">{item.productTitle}</p>
                        <p className="text-[11px] text-stone-500">
                          Variant: {item.size} / {item.color} · SKU: {item.sku}
                        </p>
                        <p className="text-[11px] text-stone-600">Qty: {item.quantity}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-serif font-semibold text-stone-950 tabular-nums">
                          ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-stone-400">
                          @ ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History Audit Log */}
              {Array.isArray(selectedOrder.statusHistory) && selectedOrder.statusHistory.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-serif font-semibold text-stone-900 border-b border-stone-100 pb-2 flex items-center justify-between">
                    <span>Status History Timeline</span>
                    <span className="text-[10px] text-stone-400 font-sans font-normal">
                      {selectedOrder.statusHistory.length} recorded event(s)
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.statusHistory.map((log, idx) => {
                      const displayStatus =
                        log.previousStatus && log.newStatus
                          ? `${log.previousStatus} → ${log.newStatus}`
                          : log.newStatus || log.status || log.paymentStatus;
                      const dateStr = new Date(log.createdAt || log.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={log.id || idx}
                          className="p-3 bg-stone-50 border border-stone-200 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-stone-900">{displayStatus}</span>
                              {log.isCustomerSafe === false && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-xs bg-amber-100 text-amber-800 border border-amber-200">
                                  Internal Note
                                </span>
                              )}
                              {log.inventoryAction === 'DEDUCTED' && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Stock Deducted
                                </span>
                              )}
                              {log.inventoryAction === 'RESTORED' && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-xs bg-purple-100 text-purple-800 border border-purple-200">
                                  Stock Restored
                                </span>
                              )}
                            </div>
                            <p className="text-stone-600 font-light">{log.note || 'No notes attached'}</p>
                          </div>

                          <div className="text-left sm:text-right shrink-0 text-stone-400 font-mono text-[10px]">
                            <span className="block font-medium text-stone-600">
                              {log.adminName || log.changedBy || 'System'}
                            </span>
                            <span className="block">{dateStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STATUS TRANSITION CONFIRMATION MODAL                               */}
      {/* ------------------------------------------------------------------ */}
      {showStatusConfirm && selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isUpdatingStatus && setShowStatusConfirm(false)}
        >
          <div
            className="bg-white max-w-sm w-full p-6 rounded-xs shadow-xl border border-stone-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center mx-auto">
              <Sparkles size={20} />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Confirm Status Transition
              </h3>
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                Are you sure you want to transition order{' '}
                <strong className="font-mono text-stone-900">{selectedOrder.orderNumber}</strong> from{' '}
                <span className="font-semibold text-stone-800">{selectedOrder.status}</span> to{' '}
                <span className="font-semibold text-[#781D42]">{targetStatus}</span>?
              </p>
            </div>

            {/* Inventory Impact Notice */}
            {(() => {
              const isFulfillment = [
                'CONFIRMED',
                'PROCESSING',
                'PACKED',
                'SHIPPED',
                'OUT_FOR_DELIVERY',
                'DELIVERED',
              ].includes(targetStatus);
              const willDeduct = isFulfillment && !selectedOrder.isStockDeducted;
              const willRestore = targetStatus === 'CANCELLED' && selectedOrder.isStockDeducted;

              if (willDeduct) {
                return (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xs text-[11px] text-amber-900 text-left">
                    <strong className="font-semibold">Inventory Notice:</strong> Advancing to{' '}
                    {targetStatus} will conditionally verify and deduct stock for all items in this
                    order.
                  </div>
                );
              }
              if (willRestore) {
                return (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xs text-[11px] text-rose-900 text-left">
                    <strong className="font-semibold">Inventory Notice:</strong> Cancelling this order
                    will release and restore allocated stock back into inventory.
                  </div>
                );
              }
              if (targetStatus === 'CANCELLED' && !selectedOrder.isStockDeducted) {
                return (
                  <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xs text-[11px] text-stone-600 text-left">
                    <strong className="font-semibold">Inventory Notice:</strong> Stock was never deducted
                    for this pending order, so no inventory adjustment will occur.
                  </div>
                );
              }
              return null;
            })()}

            <div className="text-left space-y-2">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                  Fulfillment Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Inspected and hand-packed in bespoke box..."
                  className="w-full text-xs py-2 px-2.5 bg-stone-50 border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="internalNoteCheck"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded text-[#781D42] focus:ring-[#781D42]"
                />
                <label
                  htmlFor="internalNoteCheck"
                  className="text-[11px] text-stone-600 cursor-pointer select-none"
                >
                  Internal note only (hidden from customer tracking)
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusConfirm(false)}
                disabled={isUpdatingStatus}
                className="flex-1 py-2 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider rounded-xs hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusUpdate}
                disabled={isUpdatingStatus}
                className="flex-1 py-2 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-wider font-semibold rounded-xs"
              >
                {isUpdatingStatus ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
