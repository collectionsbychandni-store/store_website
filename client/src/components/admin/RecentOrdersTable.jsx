import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowUpRight, CheckCircle2, Clock, Truck, PackageCheck } from 'lucide-react';

const DEMO_ORDERS = [
  {
    id: 'CBC-9481',
    customer: { name: 'Pooja Sharma', email: 'pooja.s@example.com' },
    date: '14 Oct 2026',
    items: "Women's Designer Kurti (Blush Pink)",
    amount: 2499,
    paymentStatus: 'Paid',
    orderStatus: 'DELIVERED',
  },
  {
    id: 'CBC-9480',
    customer: { name: 'Ananya Verma', email: 'ananya.v@example.com' },
    date: '13 Oct 2026',
    items: 'Elegant Party Wear Dress (Wine Burgundy)',
    amount: 4299,
    paymentStatus: 'Paid',
    orderStatus: 'SHIPPED',
  },
  {
    id: 'CBC-9479',
    customer: { name: 'Ritu Sen', email: 'ritu.sen@example.com' },
    date: '13 Oct 2026',
    items: 'Floral Print Kurti (Sage Green)',
    amount: 1599,
    paymentStatus: 'Paid',
    orderStatus: 'CONFIRMED',
  },
  {
    id: 'CBC-9478',
    customer: { name: 'Meera Patel', email: 'meera.p@example.com' },
    date: '12 Oct 2026',
    items: "Embroidered Women's Kurti (Crimson Red)",
    amount: 3299,
    paymentStatus: 'COD Pending',
    orderStatus: 'PACKED',
  },
  {
    id: 'CBC-9477',
    customer: { name: 'Sneha Kulkarni', email: 'sneha.k@example.com' },
    date: '11 Oct 2026',
    items: 'Cotton Casual Kurti + Kundan Earrings',
    amount: 2698,
    paymentStatus: 'Paid',
    orderStatus: 'DELIVERED',
  },
];

const statusStyles = {
  DELIVERED: {
    label: 'Delivered',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  SHIPPED: {
    label: 'Shipped',
    bg: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  PACKED: {
    label: 'Packed',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bg: 'bg-stone-100 text-stone-800 border-stone-200',
  },
  PENDING: {
    label: 'Pending',
    bg: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

/**
 * Recent Orders Table Component
 */
export default function RecentOrdersTable({ orders = DEMO_ORDERS, isEmpty = false }) {
  if (isEmpty || orders.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-serif text-lg font-semibold tracking-tight text-stone-900">
              Recent Orders
            </h2>
            <p className="text-xs text-stone-500">Live order fulfillment stream</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-rose-800 hover:text-rose-950 inline-flex items-center"
          >
            <span>View All Orders</span>
            <ArrowUpRight size={14} className="ml-0.5" />
          </Link>
        </div>
        <div className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-3">
            <ShoppingBag size={22} />
          </div>
          <p className="font-serif text-base font-medium text-stone-900">No Orders Received Yet</p>
          <p className="text-xs text-stone-500 mt-1">
            Customer purchases made through the storefront will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-stone-900">
              Recent Orders
            </h2>
            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-rose-800 font-semibold ring-1 ring-rose-200/60">
              Demo Data
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Latest customer orders requiring dispatch and fulfillment
          </p>
        </div>

        <Link
          to="/admin/orders"
          className="inline-flex items-center text-xs font-semibold text-rose-800 hover:text-rose-950 transition-colors"
        >
          <span>View All Orders</span>
          <ArrowUpRight size={14} className="ml-1" />
        </Link>
      </div>

      {/* Table Container with horizontal scroll protection */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200/80 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              <th scope="col" className="py-3 pr-4 font-semibold">Order ID</th>
              <th scope="col" className="py-3 px-4 font-semibold">Customer</th>
              <th scope="col" className="py-3 px-4 font-semibold">Date</th>
              <th scope="col" className="py-3 px-4 font-semibold">Amount</th>
              <th scope="col" className="py-3 px-4 font-semibold">Payment</th>
              <th scope="col" className="py-3 pl-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700">
            {orders.map((order) => {
              const statusInfo = statusStyles[order.orderStatus] || {
                label: order.orderStatus,
                bg: 'bg-stone-100 text-stone-800 border-stone-200',
              };

              return (
                <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                  {/* Order ID */}
                  <td className="py-3.5 pr-4 font-mono font-medium text-stone-900 whitespace-nowrap">
                    {order.id}
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-medium text-stone-900">{order.customer.name}</div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {order.customer.email}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-stone-600 font-mono text-[11px]">
                    {order.date}
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-serif font-bold text-stone-900 tabular-nums">
                    ₹{order.amount.toLocaleString('en-IN')}
                  </td>

                  {/* Payment Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        order.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>

                  {/* Order Status Badge */}
                  <td className="py-3.5 pl-4 whitespace-nowrap text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.bg}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
