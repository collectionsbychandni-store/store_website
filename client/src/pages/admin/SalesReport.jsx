import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import SalesTrendChart from '../../components/admin/SalesTrendChart';
import * as reportService from '../../services/reportService';
import {
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Package,
  RotateCcw,
  Percent,
  CreditCard,
  Layers,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  X,
  ArrowUpDown,
} from 'lucide-react';

const PRESET_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Previous Month' },
  { id: 'custom', label: 'Custom Range' },
];

/**
 * Sales Reports and Business Analytics (/admin/reports)
 * Step 20: Sales Reports and Business Analytics
 */
export default function SalesReport() {
  // Date range state
  const [preset, setPreset] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Active view tab: 'products' | 'categories' | 'breakdown' | 'customers'
  const [activeTab, setActiveTab] = useState('products');

  // Loading & Data states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Core analytics state
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsPagination, setProductsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [productSortBy, setProductSortBy] = useState('unitsSold');
  const [productSortOrder, setProductSortOrder] = useState('desc');

  const [categories, setCategories] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [customerMetrics, setCustomerMetrics] = useState(null);

  // CSV Export & Methodology Modal
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback.message) {
      const timer = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load all analytics for the selected range
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const queryParams = {
      preset,
      ...(preset === 'custom' ? { startDate: customStart, endDate: customEnd } : {}),
    };

    try {
      const [
        summaryRes,
        trendsRes,
        productsRes,
        categoriesRes,
        breakdownRes,
        custMetricsRes,
      ] = await Promise.all([
        reportService.getSalesSummary(queryParams),
        reportService.getSalesTrends(queryParams),
        reportService.getProductPerformance({
          ...queryParams,
          page: productsPagination.page,
          limit: productsPagination.limit,
          sortBy: productSortBy,
          sortOrder: productSortOrder,
        }),
        reportService.getCategoryPerformance(queryParams),
        reportService.getOrderBreakdown(queryParams),
        reportService.getCustomerMetrics(queryParams),
      ]);

      if (summaryRes?.data) setSummary(summaryRes.data);
      if (trendsRes?.data) setTrends(trendsRes.data.trends || []);
      if (productsRes?.data) {
        setProducts(productsRes.data);
        if (productsRes.pagination) setProductsPagination(productsRes.pagination);
      }
      if (categoriesRes?.data) setCategories(categoriesRes.data);
      if (breakdownRes?.data) setBreakdown(breakdownRes.data);
      if (custMetricsRes?.data) setCustomerMetrics(custMetricsRes.data.metrics);
    } catch (err) {
      setError(err.message || 'Failed to load sales analytics');
    } finally {
      setIsLoading(false);
    }
  }, [preset, customStart, customEnd, productsPagination.page, productsPagination.limit, productSortBy, productSortOrder]);

  useEffect(() => {
    // Only execute if not custom or both custom dates are filled
    if (preset !== 'custom' || (customStart && customEnd)) {
      loadReports();
    }
  }, [loadReports, preset]);

  // Apply custom date range
  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      setFeedback({ type: 'error', message: 'Please select both start date and end date' });
      return;
    }
    if (customStart > customEnd) {
      setFeedback({ type: 'error', message: 'Start date cannot be after end date' });
      return;
    }
    setProductsPagination((prev) => ({ ...prev, page: 1 }));
    loadReports();
  };

  // Trigger CSV Download
  const handleExportCsv = async (reportType) => {
    setIsExporting(true);
    try {
      const queryParams = {
        preset,
        ...(preset === 'custom' ? { startDate: customStart, endDate: customEnd } : {}),
      };
      const res = await reportService.downloadReportCsv(reportType, queryParams);
      setFeedback({
        type: 'success',
        message: `Report exported successfully as ${res.filename}`,
      });
      setShowExportModal(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error downloading CSV report',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const periodLabel = summary?.period
    ? `${summary.period.startDate} to ${summary.period.endDate} (${summary.period.daysCount} days · ${summary.period.timezone})`
    : 'Asia/Kolkata Business Timezone';

  const m = summary?.metrics || {
    totalOrders: 0,
    paidOrders: 0,
    unitsSold: 0,
    grossSales: 0,
    refundAmount: 0,
    netSales: 0,
    averageOrderValue: 0,
    grossSalesFormatted: '₹0',
    refundAmountFormatted: '₹0',
    netSalesFormatted: '₹0',
    aovFormatted: '₹0',
  };

  return (
    <AdminLayout pageTitle="Sales Reports & Business Analytics">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-rose-200/60 bg-white p-6 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                Financial Intelligence & Atelier Analytics
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                · Timezone: Asia/Kolkata (IST)
              </span>
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 mt-1">
              Sales Reports & Analytics
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Audited gross sales, verified revenue trajectories, best-selling artisan styles, and order fulfillment distributions.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Methodology Explainer Button */}
            <button
              type="button"
              onClick={() => setShowMethodologyModal(true)}
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
              title="View metric definitions and calculation methodology"
            >
              <HelpCircle size={14} className="mr-1.5 text-stone-500" />
              <span>Calculation Rules</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
            >
              <Download size={14} className="mr-1.5 text-rose-800" />
              <span>Export CSV</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadReports}
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white p-2 text-stone-700 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback.message && (
          <div
            className={`rounded-lg p-3.5 text-xs font-medium flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={15} />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback({ type: '', message: '' })}
              className="text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Date-Range Selector Bar */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-stone-400 mr-1 flex items-center">
              <Calendar size={13} className="mr-1 text-stone-500" />
              Period:
            </span>
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPreset(opt.id);
                  setProductsPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  preset === opt.id
                    ? 'bg-rose-900 text-white shadow-xs font-semibold'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Picker (when preset === 'custom') */}
          {preset === 'custom' && (
            <form onSubmit={handleApplyCustom} className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 text-stone-800 focus:border-rose-600 focus:outline-none"
                title="Start Date (IST)"
              />
              <span className="text-stone-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 text-stone-800 focus:border-rose-600 focus:outline-none"
                title="End Date (IST)"
              />
              <button
                type="submit"
                className="rounded-lg bg-stone-900 px-3 py-1.5 font-semibold text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Apply Range
              </button>
            </form>
          )}

          <div className="text-[11px] font-mono text-stone-500 shrink-0">
            {periodLabel}
          </div>
        </div>

        {/* 7 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Gross Merchandise Sales */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Gross Merchandise Sales
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-900">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                {m.grossSalesFormatted}
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">
                From {m.paidOrders} verified paid orders (excl. delivery fees)
              </p>
            </div>
          </div>

          {/* Card 2: Net Sales */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-900 uppercase tracking-wider">
                Net Revenue
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-emerald-900 tabular-nums">
                {m.netSalesFormatted}
              </span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Gross sales minus recorded refunds
              </p>
            </div>
          </div>

          {/* Card 3: Total Orders vs. Paid Orders */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Orders (Total / Paid)
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <ShoppingBag size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline space-x-1.5">
                <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                  {m.totalOrders}
                </span>
                <span className="text-xs text-stone-400">placed</span>
                <span className="text-stone-300">/</span>
                <span className="font-serif text-xl font-bold text-rose-900 tabular-nums">
                  {m.paidOrders}
                </span>
                <span className="text-xs text-rose-800">paid</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {m.unpaidOrders > 0 && `${m.unpaidOrders} unpaid · `}
                {m.cancelledOrders > 0 && `${m.cancelledOrders} cancelled`}
                {m.unpaidOrders === 0 && m.cancelledOrders === 0 && 'All orders verified'}
              </p>
            </div>
          </div>

          {/* Card 4: Average Order Value */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Average Order Value
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <Percent size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                {m.aovFormatted}
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Gross sales / verified paid orders
              </p>
            </div>
          </div>
        </div>

        {/* 3 Secondary Metric Cards (Units Sold, Refunds, Repeat Customers) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                Artisan Units Sold
              </span>
              <span className="font-serif text-xl font-bold text-stone-900 tabular-nums">
                {m.unitsSold}
              </span>
              <span className="text-[10px] text-stone-400 block">
                Quantities across verified paid orders
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-stone-50 flex items-center justify-center text-stone-600">
              <Package size={17} />
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                Recorded Refunds
              </span>
              <span className="font-serif text-xl font-bold text-rose-900 tabular-nums">
                {m.refundAmountFormatted}
              </span>
              <span className="text-[10px] text-stone-400 block">
                From {m.refundedOrders} fully refunded orders
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-800">
              <RotateCcw size={17} />
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                Repeat Patron Rate
              </span>
              <span className="font-serif text-xl font-bold text-stone-900 tabular-nums">
                {customerMetrics?.repeatCustomerRate || '0%'}
              </span>
              <span className="text-[10px] text-stone-400 block">
                {customerMetrics?.repeatCustomers || 0} repeat clientele with ≥ 2 orders
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-stone-50 flex items-center justify-center text-stone-600">
              <Users size={17} />
            </div>
          </div>
        </div>

        {/* Sales Trend Chart Section */}
        <SalesTrendChart
          trends={trends}
          isLoading={isLoading}
          period={summary?.period || { startDate: customStart, endDate: customEnd }}
        />

        {/* Tabbed Detailed Reports Section */}
        <div className="rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex border-b border-stone-200 bg-stone-50/60 px-4 pt-3 overflow-x-auto gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-t border-l border-r ${
                activeTab === 'products'
                  ? 'bg-white text-rose-950 border-stone-200 -mb-px'
                  : 'text-stone-600 hover:text-stone-900 border-transparent'
              }`}
            >
              Best-Selling Products
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-t border-l border-r ${
                activeTab === 'categories'
                  ? 'bg-white text-rose-950 border-stone-200 -mb-px'
                  : 'text-stone-600 hover:text-stone-900 border-transparent'
              }`}
            >
              Category Performance
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-t border-l border-r ${
                activeTab === 'breakdown'
                  ? 'bg-white text-rose-950 border-stone-200 -mb-px'
                  : 'text-stone-600 hover:text-stone-900 border-transparent'
              }`}
            >
              Order & Payment Breakdown
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-t border-l border-r ${
                activeTab === 'customers'
                  ? 'bg-white text-rose-950 border-stone-200 -mb-px'
                  : 'text-stone-600 hover:text-stone-900 border-transparent'
              }`}
            >
              Customer Cohorts
            </button>
          </div>

          {/* TAB 1: Best-Selling Products */}
          {activeTab === 'products' && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-semibold text-stone-900">
                    Product Performance Rankings
                  </h3>
                  <p className="text-xs text-stone-500">
                    Based on historical order-item price snapshots at time of transaction (excluding cancelled & unpaid orders).
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProductSortBy(productSortBy === 'unitsSold' ? 'grossSales' : 'unitsSold');
                      setProductsPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    <ArrowUpDown size={13} className="text-stone-400" />
                    <span>Sort by: {productSortBy === 'unitsSold' ? 'Units Sold' : 'Gross Sales'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCsv('products')}
                    disabled={isExporting}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
                  >
                    <Download size={13} className="text-rose-800" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400">
                  No product sales recorded in this reporting period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                        <th className="py-3 pl-4 pr-3">Product Title & SKU</th>
                        <th className="py-3 px-3">Size / Color</th>
                        <th className="py-3 px-3 text-center">Units Sold</th>
                        <th className="py-3 px-3 text-center">Orders Count</th>
                        <th className="py-3 px-3 text-right">Avg Unit Price</th>
                        <th className="py-3 pl-3 pr-4 text-right">Gross Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {products.map((p, idx) => (
                        <tr key={p.sku || idx} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3.5 pl-4 pr-3">
                            <span className="font-semibold text-stone-900 block">{p.productTitle}</span>
                            <span className="font-mono text-[11px] text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                              {p.sku}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-stone-600">
                            {p.size} {p.color ? `· ${p.color}` : ''}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-900">
                            {p.unitsSold}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-stone-600">
                            {p.ordersCount}
                          </td>
                          <td className="py-3.5 px-3 text-right font-serif text-stone-700">
                            ₹{Number(p.avgSellingPrice).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 pl-3 pr-4 text-right font-serif font-bold text-rose-950 tabular-nums">
                            {p.grossSalesFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Products Pagination */}
              {productsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-500">
                  <div>
                    Page {productsPagination.page} of {productsPagination.totalPages} ({productsPagination.total} styles)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={productsPagination.page <= 1}
                      onClick={() => setProductsPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      className="px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={productsPagination.page >= productsPagination.totalPages}
                      onClick={() => setProductsPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                      className="px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Category Performance */}
          {activeTab === 'categories' && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-semibold text-stone-900">
                    Category Revenue Distribution
                  </h3>
                  <p className="text-xs text-stone-500">
                    Proportion of gross merchandise sales by boutique line. Reflects current catalog taxonomy mapping.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportCsv('categories')}
                  disabled={isExporting}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer self-start sm:self-auto disabled:opacity-50"
                >
                  <Download size={13} className="text-rose-800" />
                  <span>Export Categories CSV</span>
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400">
                  No category sales recorded in this period.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {categories.map((c) => (
                    <div key={c.categoryName} className="rounded-lg border border-stone-200 bg-stone-50/40 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-stone-900 text-sm">{c.categoryName}</span>
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-600">{c.unitsSold} units sold</span>
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-600">{c.ordersCount} orders</span>
                        </div>
                        <div className="text-right">
                          <span className="font-serif font-bold text-stone-900 text-sm mr-2">
                            {c.grossSalesFormatted}
                          </span>
                          <span className="text-xs font-semibold text-rose-800">
                            {c.shareFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Share progress bar */}
                      <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-900 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, c.shareOfSales))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Order & Payment Breakdown */}
          {activeTab === 'breakdown' && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-semibold text-stone-900">
                    Order Fulfillment & Payment Distribution
                  </h3>
                  <p className="text-xs text-stone-500">
                    Fulfillment progression vs. payment confirmation status across all transactions created in this period.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportCsv('order-breakdown')}
                  disabled={isExporting}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer self-start sm:self-auto disabled:opacity-50"
                >
                  <Download size={13} className="text-rose-800" />
                  <span>Export Breakdown CSV</span>
                </button>
              </div>

              {!breakdown || breakdown.totalOrders === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400">
                  No orders recorded in this reporting period.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Column 1: Order Status */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                      <ShoppingBag size={14} className="text-stone-500" />
                      <span>By Fulfillment Status</span>
                    </h4>
                    <div className="divide-y divide-stone-200/60 text-xs">
                      {breakdown.byOrderStatus.map((item) => (
                        <div key={item.status} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-stone-800 block">{item.status}</span>
                            <span className="text-[11px] text-stone-500">{item.count} orders ({item.shareOfOrders}%)</span>
                          </div>
                          <span className="font-serif font-bold text-stone-900">{item.amountFormatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Payment Status */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                      <CreditCard size={14} className="text-stone-500" />
                      <span>By Payment Status</span>
                    </h4>
                    <div className="divide-y divide-stone-200/60 text-xs">
                      {breakdown.byPaymentStatus.map((item) => (
                        <div key={item.paymentStatus} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className={`font-semibold block ${
                              item.paymentStatus === 'PAID'
                                ? 'text-emerald-700'
                                : item.paymentStatus === 'FAILED'
                                ? 'text-rose-700'
                                : 'text-stone-800'
                            }`}>
                              {item.paymentStatus}
                            </span>
                            <span className="text-[11px] text-stone-500">{item.count} orders ({item.shareOfOrders}%)</span>
                          </div>
                          <span className="font-serif font-bold text-stone-900">{item.amountFormatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Payment Method */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                      <CreditCard size={14} className="text-stone-500" />
                      <span>By Payment Gateway / Method</span>
                    </h4>
                    <div className="divide-y divide-stone-200/60 text-xs">
                      {breakdown.byPaymentMethod.map((item) => (
                        <div key={item.paymentMethod} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-stone-800 block">{item.paymentMethod}</span>
                            <span className="text-[11px] text-stone-500">{item.count} orders ({item.shareOfOrders}%)</span>
                          </div>
                          <span className="font-serif font-bold text-stone-900">{item.amountFormatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 4: Sales Channel */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                      <Layers size={14} className="text-stone-500" />
                      <span>By Sales Channel</span>
                    </h4>
                    <div className="divide-y divide-stone-200/60 text-xs">
                      {(breakdown.bySalesChannel || []).map((item) => (
                        <div key={item.channel} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-stone-800 block">{item.channel}</span>
                            <span className="text-[11px] text-stone-500">{item.count} orders ({item.shareOfOrders}%)</span>
                          </div>
                          <span className="font-serif font-bold text-stone-900">{item.amountFormatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Customer Cohorts */}
          {activeTab === 'customers' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  Patron Acquisition & Retention Metrics
                </h3>
                <p className="text-xs text-stone-500">
                  Calculated from customer registrations and transaction histories during the selected reporting period.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4">
                  <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                    New Patron Registrations
                  </span>
                  <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                    {customerMetrics?.newRegistrations ?? 0}
                  </span>
                  <span className="text-[10px] text-stone-400 block mt-1">
                    Patrons registered during this period
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4">
                  <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                    Purchasing Clientele
                  </span>
                  <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                    {customerMetrics?.purchasingCustomers ?? 0}
                  </span>
                  <span className="text-[10px] text-stone-400 block mt-1">
                    Unique patrons who placed eligible paid orders
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4">
                  <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                    Repeat Patrons
                  </span>
                  <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                    {customerMetrics?.repeatCustomers ?? 0}
                  </span>
                  <span className="text-[10px] text-stone-400 block mt-1">
                    Patrons with ≥ 2 lifetime completed orders
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4">
                  <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">
                    Orders / Purchasing Patron
                  </span>
                  <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                    {customerMetrics?.avgOrdersPerCustomer ?? '0.00'}
                  </span>
                  <span className="text-[10px] text-stone-400 block mt-1">
                    Average purchase frequency in this period
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export CSV Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet size={18} className="text-rose-900" />
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  Export Analytics CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Export verified data matching the active date range (<strong className="text-stone-900">{summary?.period?.startDate} to {summary?.period?.endDate}</strong> in Asia/Kolkata).
              Spreadsheet formula-injection protection (CWE-1236) is automatically applied.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExportCsv('sales-summary')}
                className="w-full text-left p-3 rounded-lg border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 transition-colors flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer disabled:opacity-50"
              >
                <div>
                  <span className="block font-medium">1. Sales Summary & KPIs</span>
                  <span className="text-[11px] font-normal text-stone-500">Gross sales, net revenue, units sold, refunds, and AOV</span>
                </div>
                <Download size={14} className="text-rose-800 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExportCsv('products')}
                className="w-full text-left p-3 rounded-lg border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 transition-colors flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer disabled:opacity-50"
              >
                <div>
                  <span className="block font-medium">2. Best-Selling Products Performance</span>
                  <span className="text-[11px] font-normal text-stone-500">Product titles, SKUs, units sold, and historical sales values</span>
                </div>
                <Download size={14} className="text-rose-800 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExportCsv('categories')}
                className="w-full text-left p-3 rounded-lg border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 transition-colors flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer disabled:opacity-50"
              >
                <div>
                  <span className="block font-medium">3. Category Revenue Distribution</span>
                  <span className="text-[11px] font-normal text-stone-500">Category gross revenue and percentage share of sales</span>
                </div>
                <Download size={14} className="text-rose-800 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExportCsv('order-breakdown')}
                className="w-full text-left p-3 rounded-lg border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 transition-colors flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer disabled:opacity-50"
              >
                <div>
                  <span className="block font-medium">4. Order & Payment Breakdown</span>
                  <span className="text-[11px] font-normal text-stone-500">Orders and values grouped by fulfillment, payment status, & gateway</span>
                </div>
                <Download size={14} className="text-rose-800 shrink-0 ml-2" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Methodology Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-stone-200 p-6 space-y-4 my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Info size={18} className="text-rose-900" />
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  Sales Calculation Rules & Transparency Disclosures
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMethodologyModal(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-stone-700 space-y-3 overflow-y-auto flex-1 pr-1 leading-relaxed">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <strong className="block text-stone-900 mb-0.5">Timezone Standard: Asia/Kolkata (IST = UTC + 5:30)</strong>
                All calendar day boundaries, presets, and daily time-series buckets are calculated strictly in Indian Standard Time (IST). Date ranges begin at 00:00:00.000 IST and end at 23:59:59.999 IST to prevent clipping late evening patron orders.
              </div>

              <div>
                <strong className="block text-stone-900 font-semibold">1. Gross Merchandise Sales (GMS)</strong>
                <p className="text-stone-600 mt-0.5">
                  Sum of line-item purchase values for orders with verified payment status (<code className="bg-stone-100 px-1 py-0.5 rounded text-[11px]">paymentStatus === 'PAID'</code>) that are neither cancelled nor failed. Delivery fees and shipping amounts are excluded from gross merchandise figures.
                </p>
              </div>

              <div>
                <strong className="block text-stone-900 font-semibold">2. Paid Orders vs. Total Orders</strong>
                <p className="text-stone-600 mt-0.5">
                  Total Orders records all transaction intents registered in the period. Verified Paid Orders counts distinct orders where payment was completed successfully. Pending, awaiting payment, or failed orders are explicitly excluded from paid revenue calculations.
                </p>
              </div>

              <div>
                <strong className="block text-stone-900 font-semibold">3. Immutable Historical Pricing</strong>
                <p className="text-stone-600 mt-0.5">
                  Product performance rankings use immutable <code className="bg-stone-100 px-1 py-0.5 rounded text-[11px]">unitPrice</code> and <code className="bg-stone-100 px-1 py-0.5 rounded text-[11px]">totalPrice</code> recorded on <code className="bg-stone-100 px-1 py-0.5 rounded text-[11px]">OrderItem</code> at the instant of checkout. Subsequent changes to current catalog prices never retroactively alter historical reporting.
                </p>
              </div>

              <div>
                <strong className="block text-stone-900 font-semibold">4. Refunds and Net Revenue</strong>
                <p className="text-stone-600 mt-0.5">
                  Refunds reflect recorded orders marked as <code className="bg-stone-100 px-1 py-0.5 rounded text-[11px]">REFUNDED</code> in the database. Net sales is calculated as Gross Merchandise Sales minus Recorded Refunds. Line-item partial refund tracking is not supported by the current database schema.
                </p>
              </div>

              <div>
                <strong className="block text-stone-900 font-semibold">5. Category Reporting Taxonomy</strong>
                <p className="text-stone-600 mt-0.5">
                  Order items connect to the current catalog hierarchy via their product variants. Category metrics reflect current category classification.
                </p>
              </div>

              <div>
                <strong className="block text-stone-900 font-semibold">6. Average Order Value (AOV)</strong>
                <p className="text-stone-600 mt-0.5">
                  Calculated as Gross Merchandise Sales divided by the count of Verified Paid Orders in the reporting period.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
