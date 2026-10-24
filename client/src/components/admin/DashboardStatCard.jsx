import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Reusable Dashboard Statistic Card
 * @param {string} label - Card metric label (e.g., "Total Products")
 * @param {string|number} value - Formatted value (e.g., "48" or "₹1,42,850")
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} [subtitle] - Optional descriptive subtext
 * @param {object} [trend] - Optional trend { value: '+8.4%', isPositive: true, label: 'vs last month' }
 * @param {boolean} [isDemo=true] - Clearly flags demo data state
 */
export default function DashboardStatCard({
  label,
  value,
  icon: Icon,
  subtitle = '',
  trend = null,
  isDemo = true,
}) {
  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-rose-200/80 transition-all duration-200">
      {/* Top row: Label & Icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
          {label}
        </span>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50/70 text-rose-800 ring-1 ring-rose-100">
            <Icon size={19} strokeWidth={1.75} />
          </div>
        )}
      </div>

      {/* Middle row: Metric Value */}
      <div className="mt-3">
        <div className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
          {value}
        </div>
      </div>

      {/* Bottom row: Subtext or Trend */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
        {trend ? (
          <div className="flex items-center space-x-1.5">
            <span
              className={`inline-flex items-center font-medium ${
                trend.isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp size={13} className="mr-0.5" />
              ) : (
                <TrendingDown size={13} className="mr-0.5" />
              )}
              {trend.value}
            </span>
            {trend.label && <span className="text-stone-400">{trend.label}</span>}
          </div>
        ) : (
          <span className="text-stone-400 truncate">{subtitle}</span>
        )}

        {isDemo && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-rose-800/80 bg-rose-50 px-1.5 py-0.5 rounded">
            Demo
          </span>
        )}
      </div>
    </div>
  );
}
