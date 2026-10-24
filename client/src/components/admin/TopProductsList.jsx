import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Shirt, Tag } from 'lucide-react';

const DEMO_TOP_PRODUCTS = [
  {
    id: 'prod-1',
    title: "Women's Designer Kurti",
    category: 'Kurtis',
    sku: 'WDK-PNK-M',
    unitsSold: 148,
    revenue: 369852,
    price: 2499,
  },
  {
    id: 'prod-2',
    title: 'Elegant Party Wear Dress',
    category: 'Dresses',
    sku: 'EPW-BUR-S',
    unitsSold: 94,
    revenue: 404106,
    price: 4299,
  },
  {
    id: 'prod-3',
    title: "Embroidered Women's Kurti",
    category: 'Kurtis',
    sku: 'EWK-RED-L',
    unitsSold: 86,
    revenue: 283714,
    price: 3299,
  },
  {
    id: 'prod-4',
    title: 'Floral Print Kurti',
    category: 'Kurtis',
    sku: 'FPK-SGE-M',
    unitsSold: 81,
    revenue: 129519,
    price: 1599,
  },
  {
    id: 'prod-5',
    title: 'Cotton Casual Kurti',
    category: 'Kurtis',
    sku: 'CCK-WHT-XL',
    unitsSold: 67,
    revenue: 80333,
    price: 1199,
  },
];

/**
 * Top-Selling Products Component
 */
export default function TopProductsList({ products = DEMO_TOP_PRODUCTS }) {
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
              <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-rose-800 font-semibold ring-1 ring-rose-200/60">
                Demo Data
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

        {/* Product Items List */}
        <div className="mt-4 divide-y divide-stone-100">
          {products.map((item, index) => (
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
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-stone-400">{item.sku}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-serif text-xs font-bold text-stone-900 tabular-nums">
                  ₹{item.revenue.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                  {item.unitsSold} units
                </div>
              </div>
            </div>
          ))}
        </div>
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
