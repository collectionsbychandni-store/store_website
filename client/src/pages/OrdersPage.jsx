import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import * as orderService from '../services/orderService';
import {
  Package,
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  XCircle,
  RotateCcw,
  ShoppingBag,
  MapPin,
  Calendar,
  Sparkles,
  Search,
} from 'lucide-react';

/**
 * Customer Order History Page (/account/orders)
 * Implements Step 15:
 * - Displays authentic historical orders belonging strictly to customer
 * - Status filters, item summaries, financial totals
 * - Luxury Indian aesthetic matching Collections by Chandni
 */
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async (page = 1, status = '') => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.getCustomerOrders({
        page,
        limit: 10,
        status: status || undefined,
      });

      if (res?.data) {
        setOrders(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve your orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(1, statusFilter);
  }, [loadOrders, statusFilter]);

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} />
            Delivered
          </span>
        );
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <Truck size={12} />
            In Transit
          </span>
        );
      case 'CONFIRMED':
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF4EB] text-[#781D42] border border-[#E6D7C3]">
            <Sparkles size={12} />
            Atelier Confirmed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle size={12} />
            Cancelled
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
            <RotateCcw size={12} />
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={12} />
            Pending Fulfillment
          </span>
        );
    }
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
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-xs bg-purple-100 text-purple-900">
            Partially Refunded
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
            Payment Failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-xs bg-amber-100/80 text-amber-900">
            Awaiting Payment
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 pb-20">
      {/* Header */}
      <section className="bg-stone-100/60 border-b border-stone-200/80 py-10 sm:py-14">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-4">
              <Link to="/account" className="hover:text-[#781D42] transition-colors flex items-center gap-1">
                <ArrowLeft size={14} />
                <span>My Account</span>
              </Link>
              <span>/</span>
              <span className="text-stone-800 font-medium">Bespoke Orders</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                  Patron Archive
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-stone-950">
                  My Orders & Purchases
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-lg font-light leading-relaxed">
                  Review historical artisan couture orders, fulfillment milestones, and delivery snapshots.
                </p>
              </div>

              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#781D42] hover:text-[#5B1123] font-semibold self-start sm:self-auto underline underline-offset-4"
              >
                <span>Continue Shopping →</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-8 sm:py-10">
        <Container>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200/80 text-xs scrollbar-none">
              {[
                { label: 'All Orders', value: '' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Confirmed', value: 'CONFIRMED' },
                { label: 'Shipped', value: 'SHIPPED' },
                { label: 'Delivered', value: 'DELIVERED' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleStatusChange(tab.value)}
                  className={`px-4 py-2 rounded-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-[#781D42] text-amber-50 shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:text-stone-950 hover:border-stone-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="p-6 bg-white border border-stone-200 rounded-xs shadow-xs animate-pulse space-y-4"
                  >
                    <div className="flex justify-between">
                      <div className="h-4 bg-stone-200 rounded-xs w-1/4" />
                      <div className="h-4 bg-stone-200 rounded-xs w-1/6" />
                    </div>
                    <div className="h-16 bg-stone-100 rounded-xs w-full" />
                    <div className="h-4 bg-stone-200 rounded-xs w-1/5" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-white border border-stone-200 rounded-xs space-y-3">
                <AlertCircle size={28} className="text-rose-600 mx-auto" />
                <h3 className="font-serif text-lg font-medium text-stone-900">
                  Unable to Load Orders
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
                <button
                  type="button"
                  onClick={() => loadOrders(1, statusFilter)}
                  className="px-4 py-2 bg-stone-900 text-white text-xs uppercase tracking-wider rounded-xs"
                >
                  Retry
                </button>
              </div>
            ) : orders.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center bg-white border border-dashed border-stone-300 rounded-xs space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center mx-auto">
                  <Package size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl font-semibold text-stone-900">
                    No Orders Found
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto font-light">
                    {statusFilter
                      ? `You currently have no orders in "${statusFilter}" status.`
                      : 'You have not placed any orders yet. Explore our handcrafted collection to acquire your first heirloom piece.'}
                  </p>
                </div>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors shadow-xs"
                >
                  <ShoppingBag size={16} />
                  <span>Explore The Atelier</span>
                </Link>
              </div>
            ) : (
              /* Orders List */
              <div className="space-y-4">
                {orders.map((order) => {
                  const orderItems = order.items || [];
                  const shippingAddr = order.shippingAddress || {};
                  const formattedDate = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recent';

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-stone-200/90 rounded-xs shadow-xs hover:border-stone-300 transition-colors p-5 sm:p-6 space-y-4"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-stone-950 text-sm">
                              {order.orderNumber}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="text-xs text-stone-500">{formattedDate}</span>
                          </div>
                          {shippingAddr.city && (
                            <p className="text-[11px] text-stone-500 font-light flex items-center gap-1">
                              <MapPin size={11} className="text-stone-400" />
                              <span>Delivering to {shippingAddr.name} ({shippingAddr.city}, {shippingAddr.state})</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {renderPaymentBadge(order.paymentStatus)}
                          {renderStatusBadge(order.status)}
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-3">
                        {orderItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 text-xs">
                            <div className="w-14 h-16 bg-stone-100 rounded-xs overflow-hidden shrink-0 border border-stone-200">
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

                            <div className="flex-1 min-w-0">
                              <h4 className="font-serif font-semibold text-stone-950 truncate">
                                {item.productTitle}
                              </h4>
                              <p className="text-stone-500 text-[11px]">
                                Variant: {item.size} / {item.color} · Qty: {item.quantity}
                              </p>
                              <p className="text-[10px] font-mono text-stone-400">SKU: {item.sku}</p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-serif font-semibold text-stone-950 tabular-nums">
                                ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Summary & Actions */}
                      <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-stone-600">
                          <span>Total Amount:{' '}</span>
                          <span className="font-serif text-base font-semibold text-stone-950 tabular-nums">
                            ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-stone-400 ml-2 font-light">
                            (Includes All Taxes & Delivery)
                          </span>
                        </div>

                        <Link
                          to={`/account/orders/${order.orderNumber || order.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-stone-300 hover:border-[#781D42] text-[#781D42] hover:bg-[#FAF4EB] text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors self-end sm:self-auto group"
                        >
                          <span>View Order Details</span>
                          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="pt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => loadOrders(pagination.page - 1, statusFilter)}
                      className="px-3 py-1.5 border border-stone-300 rounded-xs text-xs uppercase tracking-wider disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-stone-600 px-2 font-mono">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => loadOrders(pagination.page + 1, statusFilter)}
                      className="px-3 py-1.5 border border-stone-300 rounded-xs text-xs uppercase tracking-wider disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
