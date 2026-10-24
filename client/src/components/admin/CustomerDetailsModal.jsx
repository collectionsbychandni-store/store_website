import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  MapPin,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingUp,
} from 'lucide-react';

/**
 * CustomerDetailsModal
 * Comprehensive administrative view of a patron's profile, fulfillment addresses,
 * spending metrics, and order history.
 */
export default function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
  onStatusChange,
  isUpdatingStatus = false,
}) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  if (!isOpen || !customer) return null;

  const orders = customer.orders || [];
  const addresses = customer.addresses || [];
  const summary = customer.summary || {
    totalOrders: orders.length,
    completedOrders: orders.filter((o) =>
      ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status)
    ).length,
    totalSpent: orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
    spendingFormatted: `₹${orders
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
      .toLocaleString('en-IN')}`,
  };

  const handleToggleClick = () => {
    if (customer.isActive) {
      // Prompt confirmation before deactivating
      setShowDeactivateConfirm(true);
    } else {
      // Activating can be done immediately
      onStatusChange(customer.id, true);
    }
  };

  const confirmDeactivate = async () => {
    setShowDeactivateConfirm(false);
    await onStatusChange(customer.id, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#FAF9F5] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-900 font-serif font-bold text-base">
              {customer.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                {customer.name}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-stone-500">
                <span>Client ID: {customer.id}</span>
                <span>·</span>
                <span
                  className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium border ${
                    customer.isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full mr-1 ${
                      customer.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  {customer.isActive ? 'Active Patron' : 'Deactivated'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-3.5">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                Total Orders Placed
              </span>
              <span className="font-serif text-xl font-bold text-stone-900 tabular-nums">
                {summary.totalOrders}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                {summary.completedOrders} fulfilled / completed
              </span>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-3.5">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                Lifetime Spending
              </span>
              <span className="font-serif text-xl font-bold text-rose-950 tabular-nums">
                {summary.spendingFormatted || `₹${Number(summary.totalSpent || 0).toLocaleString('en-IN')}`}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Excludes cancelled & returned orders
              </span>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-3.5">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                Patron Since
              </span>
              <span className="font-serif text-base font-bold text-stone-900">
                {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Registered customer account
              </span>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
              <User size={14} className="text-stone-500" />
              <span>Contact & Account Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2 text-stone-700">
                <Mail size={14} className="text-stone-400 shrink-0" />
                <span className="font-medium text-stone-900 select-all">{customer.email}</span>
              </div>

              <div className="flex items-center space-x-2 text-stone-700">
                <Phone size={14} className="text-stone-400 shrink-0" />
                <span>{customer.phone || 'Phone number not provided'}</span>
              </div>
            </div>

            {/* Account Status Switch & Explanatory Notice */}
            <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-stone-800">
                  Account Status:{' '}
                  <strong className={customer.isActive ? 'text-emerald-700' : 'text-rose-700'}>
                    {customer.isActive ? 'Active' : 'Deactivated'}
                  </strong>
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {customer.isActive
                    ? 'Patron can sign in, manage bag, and place orders.'
                    : 'Deactivated. Subsequent logins and authenticated requests are rejected.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleClick}
                disabled={isUpdatingStatus}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  customer.isActive
                    ? 'border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                    : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                {isUpdatingStatus ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : customer.isActive ? (
                  <ShieldAlert size={13} />
                ) : (
                  <ShieldCheck size={13} />
                )}
                <span>{customer.isActive ? 'Deactivate Account' : 'Reactivate Account'}</span>
              </button>
            </div>
          </div>

          {/* Saved Addresses Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
              <MapPin size={14} className="text-stone-500" />
              <span>Saved Shipping Addresses ({addresses.length})</span>
            </h3>

            {addresses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-200 p-4 text-center text-xs text-stone-400">
                No saved fulfillment addresses found for this customer.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-lg border border-stone-200 bg-stone-50/40 p-3.5 text-xs text-stone-700 space-y-1 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900">{addr.name}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700">
                          {addr.addressType || 'HOME'}
                        </span>
                        {addr.isDefault && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-stone-600">
                      {addr.addressLine1}
                      {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                    </p>
                    {addr.landmark && (
                      <p className="text-[11px] text-stone-400">Landmark: {addr.landmark}</p>
                    )}
                    <p className="text-stone-700 font-medium">
                      {addr.city}, {addr.state} - <span className="font-mono">{addr.pincode}</span>
                    </p>
                    <p className="text-[11px] text-stone-500">{addr.country || 'India'}</p>
                    {addr.phone && (
                      <p className="text-[11px] text-stone-500 font-mono pt-1">
                        Phone: {addr.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order History Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
              <ShoppingBag size={14} className="text-stone-500" />
              <span>Order History ({orders.length})</span>
            </h3>

            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
                No orders placed by this patron yet.
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/70 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                      <th className="py-2.5 pl-4 pr-2">Order #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Payment</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 pl-2 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-rose-900">
                          {o.orderNumber}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 whitespace-nowrap text-[11px]">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              o.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : o.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] font-medium ${
                              o.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-stone-600'
                            }`}
                          >
                            {o.paymentStatus || 'AWAITING'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold text-stone-900 tabular-nums">
                          ₹{Number(o.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                          <Link
                            to={`/admin/orders?search=${o.orderNumber}`}
                            onClick={onClose}
                            className="inline-flex items-center text-rose-800 hover:text-rose-950 font-semibold text-[11px] space-x-1"
                          >
                            <span>View Order</span>
                            <ExternalLink size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50/70 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>

      {/* Confirmation Dialog before Deactivating Account */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Deactivate Customer Account?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-stone-900">{customer.name}</strong> ({customer.email})?
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              <strong>Security Policy:</strong> Deactivating an account immediately blocks the customer from signing in. If the customer currently has an active session, subsequent authenticated requests will be rejected. Historical orders and address records are safely preserved.
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeactivate}
                className="px-4 py-1.5 rounded-lg bg-rose-800 text-white text-xs font-semibold hover:bg-rose-900 cursor-pointer"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
