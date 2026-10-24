import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Info } from 'lucide-react';

/**
 * SalesTrendChart Component
 * Responsive zero-dependency SVG visualization for sales revenue and order counts over time.
 */
export default function SalesTrendChart({
  trends = [],
  isLoading = false,
  period = {},
}) {
  const [metricMode, setMetricMode] = useState('sales'); // 'sales' | 'orders'
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-48 bg-stone-100 rounded animate-pulse" />
          <div className="h-8 w-36 bg-stone-100 rounded animate-pulse" />
        </div>
        <div className="h-64 flex items-end justify-between gap-1.5 pt-8">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="w-full bg-stone-100 rounded-t animate-pulse"
              style={{ height: `${15 + (i * 9) % 75}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const validTrends = Array.isArray(trends) ? trends : [];
  const totalSales = validTrends.reduce((sum, t) => sum + (t.sales || 0), 0);
  const totalOrders = validTrends.reduce((sum, t) => sum + (t.orders || 0), 0);

  if (validTrends.length === 0 || (totalSales === 0 && totalOrders === 0)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200/90 bg-white p-12 text-center shadow-xs min-h-[340px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-3">
          <BarChart3 size={24} />
        </div>
        <h3 className="font-serif text-lg font-medium text-stone-900">
          No Sales in this Period
        </h3>
        <p className="mt-1 text-xs text-stone-500 max-w-sm">
          No qualifying paid orders were recorded between {period.startDate} and {period.endDate}. Try selecting a broader date range.
        </p>
      </div>
    );
  }

  const maxVal = metricMode === 'sales'
    ? Math.max(...validTrends.map((t) => t.sales || 0), 1)
    : Math.max(...validTrends.map((t) => t.orders || 0), 1);

  // Active item for callout badge
  const activeItem = hoveredIdx !== null ? validTrends[hoveredIdx] : validTrends[validTrends.length - 1];

  return (
    <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-stone-900">
              Sales & Order Trajectory
            </h2>
            <span className="text-[11px] font-mono text-stone-400">
              ({period.startDate} → {period.endDate})
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Daily distribution of verified paid order volume and gross merchandise revenue in Asia/Kolkata
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center space-x-2 bg-stone-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('sales')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              metricMode === 'sales'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Gross Revenue (INR)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('orders')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              metricMode === 'orders'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Paid Orders
          </button>
        </div>
      </div>

      {/* Active Callout Pill */}
      {activeItem && (
        <div className="flex items-center space-x-4 bg-stone-50 px-3.5 py-2 mt-4 rounded-lg border border-stone-200/70 text-xs w-fit">
          <div className="flex items-center space-x-1 text-stone-500">
            <Calendar size={13} className="text-stone-400" />
            <span className="font-medium text-stone-700">{activeItem.date} ({activeItem.label})</span>
          </div>
          <div className="h-3 w-px bg-stone-200" />
          <div>
            <span className="text-stone-400 font-medium mr-1.5">Revenue:</span>
            <span className="font-serif font-bold text-stone-900 tabular-nums">
              ₹{Number(activeItem.sales || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="h-3 w-px bg-stone-200" />
          <div>
            <span className="text-stone-400 font-medium mr-1.5">Orders:</span>
            <span className="font-semibold text-rose-900 tabular-nums">{activeItem.orders}</span>
          </div>
          {activeItem.units > 0 && (
            <>
              <div className="h-3 w-px bg-stone-200" />
              <div>
                <span className="text-stone-400 font-medium mr-1.5">Units:</span>
                <span className="font-semibold text-stone-700 tabular-nums">{activeItem.units}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chart Canvas */}
      <div className="pt-6 pb-2">
        <div className="relative h-60 w-full flex items-end justify-between gap-1 sm:gap-2">
          {/* Background horizontal guide lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[10px] font-mono text-stone-300">
            <div className="border-b border-stone-100 w-full pt-1">
              {metricMode === 'sales' ? `₹${Math.round(maxVal).toLocaleString('en-IN')}` : `${maxVal} orders`}
            </div>
            <div className="border-b border-stone-100 w-full pt-1">
              {metricMode === 'sales' ? `₹${Math.round(maxVal * 0.66).toLocaleString('en-IN')}` : `${Math.round(maxVal * 0.66)} orders`}
            </div>
            <div className="border-b border-stone-100 w-full pt-1">
              {metricMode === 'sales' ? `₹${Math.round(maxVal * 0.33).toLocaleString('en-IN')}` : `${Math.round(maxVal * 0.33)} orders`}
            </div>
            <div className="border-b border-stone-200 w-full pt-1">0</div>
          </div>

          {/* Individual Bars */}
          {validTrends.map((item, idx) => {
            const currentVal = metricMode === 'sales' ? item.sales : item.orders;
            const heightPercent = maxVal > 0 ? Math.round((currentVal / maxVal) * 88) : 0;
            const isHovered = hoveredIdx === idx;
            const hasData = currentVal > 0;

            return (
              <div
                key={item.date}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="group relative z-10 flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
              >
                {/* Floating tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 flex flex-col items-center pointer-events-none">
                    <div className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg whitespace-nowrap tabular-nums text-center">
                      <div className="font-bold">{item.label}</div>
                      <div>₹{item.sales.toLocaleString('en-IN')} · {item.orders} ord</div>
                    </div>
                    <div className="h-1.5 w-1.5 rotate-45 bg-stone-900 -mt-0.5" />
                  </div>
                )}

                {/* Bar element */}
                <div
                  className={`w-full max-w-[28px] rounded-t-sm transition-all duration-200 ${
                    isHovered
                      ? 'bg-rose-800 shadow-md ring-2 ring-rose-900/30'
                      : hasData
                      ? 'bg-rose-700/85 hover:bg-rose-800'
                      : 'bg-stone-100 hover:bg-stone-200'
                  }`}
                  style={{
                    height: `${Math.max(4, heightPercent)}%`,
                    minHeight: hasData ? '8px' : '4px',
                  }}
                />

                {/* X-axis labels (render selectively if many dates) */}
                {(validTrends.length <= 15 || idx % Math.ceil(validTrends.length / 10) === 0 || idx === validTrends.length - 1) && (
                  <span
                    className={`mt-2 text-[10px] font-mono transition-colors truncate max-w-[42px] ${
                      isHovered ? 'text-stone-900 font-bold' : 'text-stone-400'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Footer Info */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-stone-400 gap-2">
        <div className="flex items-center space-x-1.5">
          <Info size={13} className="text-stone-400 shrink-0" />
          <span>Missing calendar days with 0 sales are zero-filled for continuity. Hover over bars for exact numbers.</span>
        </div>
        <div className="font-mono text-stone-500">
          Period Gross: <strong className="text-stone-800">₹{totalSales.toLocaleString('en-IN')}</strong> · <strong className="text-stone-800">{totalOrders}</strong> paid orders
        </div>
      </div>
    </div>
  );
}
