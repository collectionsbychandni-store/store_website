import React, { useState } from 'react';
import { BarChart3, Info } from 'lucide-react';

// Monthly demo sales data for Collections by Chandni fashion brand
const DEMO_MONTHLY_DATA = [
  { month: 'Jan', revenue: 98000, orders: 42 },
  { month: 'Feb', revenue: 115000, orders: 49 },
  { month: 'Mar', revenue: 142000, orders: 61 },
  { month: 'Apr', revenue: 128000, orders: 55 },
  { month: 'May', revenue: 164000, orders: 70 },
  { month: 'Jun', revenue: 189000, orders: 82 },
  { month: 'Jul', revenue: 172000, orders: 74 },
  { month: 'Aug', revenue: 210000, orders: 89 },
  { month: 'Sep', revenue: 235000, orders: 98 },
  { month: 'Oct', revenue: 278000, orders: 116 },
  { month: 'Nov', revenue: 245000, orders: 104 },
  { month: 'Dec', revenue: 310000, orders: 132 },
];

/**
 * Sales Overview Chart Component
 * Responsive, zero-dependency SVG bar chart styled with boutique fashion aesthetics.
 */
export default function SalesOverviewChart({ isLoading = false, isEmpty = false }) {
  const [activeIdx, setActiveIdx] = useState(9); // Default highlight October

  const data = isEmpty ? [] : DEMO_MONTHLY_DATA;
  const maxRevenue = Math.max(...DEMO_MONTHLY_DATA.map((d) => d.revenue), 1);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs">
        <div className="h-6 w-44 bg-stone-100 rounded animate-pulse mb-6" />
        <div className="h-64 flex items-end justify-between gap-2 pt-8">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-full bg-stone-100 rounded-t animate-pulse"
              style={{ height: `${20 + (i * 7) % 80}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (isEmpty || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200/90 bg-white p-12 text-center shadow-xs min-h-[360px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-3">
          <BarChart3 size={24} />
        </div>
        <h3 className="font-serif text-lg font-medium text-stone-900">No Sales History Yet</h3>
        <p className="mt-1 text-xs text-stone-500 max-w-sm">
          Monthly sales trends and revenue metrics will populate automatically when transactions are recorded.
        </p>
      </div>
    );
  }

  const activeItem = activeIdx !== null ? data[activeIdx] : null;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-stone-900">
              Sales & Revenue Overview
            </h2>
            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-rose-800 font-semibold ring-1 ring-rose-200/60">
              Demo Data
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Annual monthly gross performance across ethnic wear & boutique accessories
          </p>
        </div>

        {/* Selected Data Badge */}
        {activeItem && (
          <div className="flex items-center space-x-4 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/60 text-xs">
            <div>
              <span className="text-stone-400 font-medium mr-1.5">{activeItem.month} Revenue:</span>
              <span className="font-serif font-bold text-stone-900 tabular-nums">
                ₹{activeItem.revenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="h-3 w-px bg-stone-200" />
            <div>
              <span className="text-stone-400 font-medium mr-1.5">Orders:</span>
              <span className="font-semibold text-rose-900 tabular-nums">{activeItem.orders}</span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Responsive Bar Visualizer */}
      <div className="pt-6 pb-2">
        <div className="relative h-60 w-full flex items-end justify-between gap-2 sm:gap-3">
          {/* Subtle horizontal grid lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[10px] font-mono text-stone-300">
            <div className="border-b border-stone-100 w-full pt-1">₹3.0L</div>
            <div className="border-b border-stone-100 w-full pt-1">₹2.0L</div>
            <div className="border-b border-stone-100 w-full pt-1">₹1.0L</div>
            <div className="border-b border-stone-200 w-full pt-1">₹0</div>
          </div>

          {/* Bars */}
          {data.map((item, idx) => {
            const heightPercent = Math.round((item.revenue / maxRevenue) * 88);
            const isHovered = activeIdx === idx;

            return (
              <div
                key={item.month}
                onMouseEnter={() => setActiveIdx(idx)}
                className="group relative z-10 flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
              >
                {/* Tooltip on active */}
                {isHovered && (
                  <div className="absolute -top-10 z-20 flex flex-col items-center">
                    <div className="rounded-md bg-stone-900 px-2 py-1 text-[11px] font-medium text-white shadow-md whitespace-nowrap tabular-nums">
                      ₹{(item.revenue / 1000).toFixed(0)}k · {item.orders} orders
                    </div>
                    <div className="h-1.5 w-1.5 rotate-45 bg-stone-900 -mt-0.5" />
                  </div>
                )}

                {/* Bar Element */}
                <div
                  className={`w-full max-w-[32px] rounded-t-md transition-all duration-200 ${
                    isHovered
                      ? 'bg-rose-700 shadow-sm'
                      : 'bg-rose-100/90 hover:bg-rose-300'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* X-axis Label */}
                <span
                  className={`mt-2 text-[11px] font-medium transition-colors ${
                    isHovered ? 'text-stone-900 font-bold' : 'text-stone-500'
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Footer Note */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
        <div className="flex items-center space-x-1.5">
          <Info size={13} className="text-stone-400 shrink-0" />
          <span>Interactive preview: hover over any bar to inspect monthly figures.</span>
        </div>
        <span className="font-mono text-stone-500">FY 2026-27</span>
      </div>
    </div>
  );
}
