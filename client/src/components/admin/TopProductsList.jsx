import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Shirt } from 'lucide-react';

/**
 * Top-Selling Products Component
 * Displays real catalog performance based on live orders
 */
export default function TopProductsList({ products = [] }) {
  return (
    <div className="rounded-xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif text-lg font-semibold tracking-tight text-stone-900">
                Top Products
              </h2>
              <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-stone-600 font-medium ring-1 ring-stone-200/60">
                Live Performance
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Best-performing catalog items by volume
            </p>
          </div>

          <Link
            to="/admin/products"
            className="inline-flex items-center text-xs font-semibold text-rose-800 hover:text-rose-950 transition-colors"
          >
            <span>All Catalog</span>
            <ArrowUpRight size={14} className="ml-1" />
          </Link>
        </div>

        {/* Product Items List or Zero State */}
        {products.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <Shirt size={20} strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-xs font-medium text-stone-700">No Sales Recorded Yet</p>
            <p className="mt-0.5 text-[11px] text-stone-400">
              Top-performing products will populate automatically as orders are placed.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-stone-100">
            {products.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors rounded-lg px-2"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-900 ring-1 ring-rose-100/80">
                    <Shirt size={18} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">{item.title}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-0.5">
                      <span>{item.category}</span>
                      {item.sku && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-stone-400">{item.sku}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-serif text-xs font-bold text-stone-900 tabular-nums">
                    ₹{(item.revenue || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                    {item.unitsSold || 0} units
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer link to catalog */}
      <div className="pt-4 border-t border-stone-100 mt-2 text-center">
        <Link
          to="/admin/inventory"
          className="text-xs font-medium text-stone-600 hover:text-stone-950 transition-colors"
        >
          Inspect stock & variant breakdown →
        </Link>
      </div>
    </div>
  );
}
