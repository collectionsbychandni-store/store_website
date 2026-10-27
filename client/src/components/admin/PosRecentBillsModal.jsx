import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import * as posService from '../../services/posService';

/**
 * Collections by Chandni - Recent POS Bills Drawer & History Viewer
 *
 * Implements Step 27:
 * - Search past in-store sales by invoice number, patron, or date
 * - Safe reprinting of any bill without creating duplicate orders
 */
export default function PosRecentBillsModal({
  isOpen,
  onClose,
  onSelectBillForReprint,
}) {
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await posService.getPosBills({
        page: pagination.page,
        limit: pagination.limit,
        search,
        date,
        paymentMethod,
      });
      if (res?.success) {
        setBills(res.bills || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Failed to load POS bills:', err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, date, paymentMethod]);

  useEffect(() => {
    if (isOpen) {
      fetchBills();
    }
  }, [isOpen, fetchBills]);

  if (!isOpen) return null;

  const getPaymentIcon = (method) => {
    switch (String(method).toUpperCase()) {
      case 'CASH':
        return <Banknote size={14} className="text-emerald-700" />;
      case 'UPI':
        return <Smartphone size={14} className="text-blue-700" />;
      case 'CARD':
        return <CreditCard size={14} className="text-purple-700" />;
      default:
        return <Banknote size={14} className="text-stone-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 rounded-xs shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-[#FAF9F5]">
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Recent In-Store POS Invoices
            </h3>
            <p className="text-xs text-stone-500">
              Audit past counter transactions, inspect customer details, and reprint receipts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xs transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search invoice number, customer name, phone, or cashier..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full pl-8 pr-3 py-2 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="py-1.5 px-2.5 border border-stone-300 rounded-xs text-xs text-stone-700 bg-white"
            />

            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="py-1.5 px-2.5 border border-stone-300 rounded-xs text-xs text-stone-700 bg-white"
            >
              <option value="">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="OTHER_OFFLINE">Other Offline</option>
            </select>

            <button
              type="button"
              onClick={fetchBills}
              className="p-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xs"
              title="Refresh bills"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Invoices List / Table */}
        <div className="flex-1 overflow-y-auto">
          {loading && bills.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#781D42]" />
              <p className="text-xs">Loading POS sales records...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="py-16 text-center text-stone-400 space-y-1">
              <Clock size={32} className="mx-auto text-stone-300 mb-2" />
              <p className="text-sm font-medium text-stone-700">No POS bills found</p>
              <p className="text-xs text-stone-500">
                Completed in-store billing transactions will be listed here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-semibold uppercase tracking-wider text-stone-500 sticky top-0">
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patron</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bills.map((b) => {
                  const billDate = new Date(b.createdAt);
                  const itemCount = (b.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
                  const patron = b.customerDetails?.name || b.customer?.name || 'Walk-in Patron';
                  const phone = b.customerDetails?.phone || b.customer?.phone;

                  return (
                    <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                        {b.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                        {billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ·{' '}
                        {billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-3 px-4 text-stone-800">
                        <div className="font-medium">{patron}</div>
                        {phone && <div className="text-[10px] text-stone-400 font-mono">{phone}</div>}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {itemCount} {itemCount === 1 ? 'piece' : 'pieces'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-stone-700">
                          {getPaymentIcon(b.paymentMethod)}
                          <span>{b.paymentMethod || 'CASH'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-serif font-bold text-stone-900 whitespace-nowrap text-sm">
                        ₹{Number(b.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBillForReprint(b);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-[11px] border border-[#781D42] text-[#781D42] hover:bg-rose-50 rounded-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Printer size={12} />
                          <span>Reprint</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>
            Total {pagination.total} POS {pagination.total === 1 ? 'bill' : 'bills'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              className="px-3 py-1 border border-stone-300 bg-white rounded-xs disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-stone-700 font-medium">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))}
              className="px-3 py-1 border border-stone-300 bg-white rounded-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
