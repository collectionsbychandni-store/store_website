import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import StockAdjustmentModal from '../../components/admin/StockAdjustmentModal';
import VariantFormModal from '../../components/admin/VariantFormModal';
import * as inventoryService from '../../services/inventoryService';
import * as variantService from '../../services/variantService';
import * as categoryService from '../../services/categoryService';
import {
  Search,
  X,
  Package,
  Layers,
  AlertTriangle,
  XCircle,
  TrendingUp,
  SlidersHorizontal,
  Edit2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  History,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

/**
 * Inventory Management Page (/admin/inventory)
 * Step 17: Inventory Reporting, Low-Stock Alerts, and CSV Export
 */
export default function InventoryManagement() {
  // Navigation tabs: 'all' | 'alerts' | 'reports' | 'history'
  const [activeTab, setActiveTab] = useState('all');

  // Core inventory state
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({
    totalVariants: 0,
    totalInactiveVariants: 0,
    totalUnitsInStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
    estimatedRetailValue: 0,
    valuationNotice: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Filters & Search for All Inventory
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Stock Alerts Tab State
  const [alerts, setAlerts] = useState([]);
  const [alertsFilter, setAlertsFilter] = useState('ALL_ALERTS'); // 'ALL_ALERTS' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [alertsSearch, setAlertsSearch] = useState('');
  const [debouncedAlertsSearch, setDebouncedAlertsSearch] = useState('');
  const [alertsCategory, setAlertsCategory] = useState('');
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsSummary, setAlertsSummary] = useState({ totalAlerts: 0, lowStockCount: 0, outOfStockCount: 0 });

  // Reports Tab State
  const [reportsData, setReportsData] = useState({
    byProduct: [],
    byCategory: [],
    lowStockList: [],
    outOfStockList: [],
    summary: null,
  });
  const [reportsCategory, setReportsCategory] = useState('');
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsSubView, setReportsSubView] = useState('byProduct'); // 'byProduct' | 'byCategory'

  // Adjustment History Tab State
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentsSearch, setAdjustmentsSearch] = useState('');
  const [debouncedAdjSearch, setDebouncedAdjSearch] = useState('');
  const [adjustmentsPagination, setAdjustmentsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isExporting, setIsExporting] = useState(false);

  // Modal states
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAlertsSearch(alertsSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [alertsSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAdjSearch(adjustmentsSearch);
      setAdjustmentsPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [adjustmentsSearch]);

  // Load categories for filter
  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryService.getCategories({ limit: 100 });
      if (res?.data) {
        setCategories(res.data);
      }
    } catch (e) {
      console.warn('Failed to load categories for inventory filters:', e);
    }
  }, []);

  // Fetch paginated inventory for main tab
  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await inventoryService.getInventory({
        search: debouncedSearch,
        categoryId: categoryFilter,
        stockStatus: stockStatusFilter,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res?.data) {
        setInventory(res.data);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, categoryFilter, stockStatusFilter, sortBy, sortOrder, pagination.page, pagination.limit]);

  // Fetch alerts for alerts tab
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await inventoryService.getLowStockAlerts({
        search: debouncedAlertsSearch,
        categoryId: alertsCategory,
        stockStatus: alertsFilter,
        sortBy: 'stock',
        sortOrder: 'asc',
        limit: 100,
      });
      if (res?.data) {
        setAlerts(res.data);
        if (res.summary) {
          setAlertsSummary(res.summary);
        }
      }
    } catch (err) {
      console.warn('Failed to load stock alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  }, [debouncedAlertsSearch, alertsCategory, alertsFilter]);

  // Fetch reports for reports tab
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await inventoryService.getInventoryReports({
        categoryId: reportsCategory,
      });
      if (res?.data) {
        setReportsData(res.data);
      }
    } catch (err) {
      console.warn('Failed to load inventory reports:', err);
    } finally {
      setReportsLoading(false);
    }
  }, [reportsCategory]);

  // Fetch adjustment history
  const loadAdjustments = useCallback(async () => {
    setAdjustmentsLoading(true);
    try {
      const res = await inventoryService.getAdjustments({
        search: debouncedAdjSearch,
        page: adjustmentsPagination.page,
        limit: adjustmentsPagination.limit,
      });
      if (res?.data) {
        setAdjustments(res.data);
        if (res.pagination) {
          setAdjustmentsPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Failed to load adjustment history:', err);
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [debouncedAdjSearch, adjustmentsPagination.page, adjustmentsPagination.limit]);

  // Initial & Tab-based data fetching
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (activeTab === 'all') {
      loadInventory();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    } else if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'history') {
      loadAdjustments();
    }
  }, [activeTab, loadInventory, loadAlerts, loadReports, loadAdjustments]);

  // Clear feedback message after 4s
  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Handle stock adjustment submit
  const handleStockSubmit = async ({ variantId, mode, quantity, reason }) => {
    setIsAdjusting(true);
    try {
      const res = await inventoryService.adjustStock(variantId, { mode, quantity, reason });
      setFeedback({
        type: 'success',
        message: `Stock updated successfully for SKU ${selectedVariant?.sku || ''}. New stock: ${res.data?.variant?.stock ?? 'updated'}.`,
      });
      setIsStockOpen(false);
      setSelectedVariant(null);
      // Reload current tab data and inventory summary
      loadInventory();
      if (activeTab === 'alerts') loadAlerts();
      if (activeTab === 'reports') loadReports();
      if (activeTab === 'history') loadAdjustments();
    } catch (err) {
      throw err;
    } finally {
      setIsAdjusting(false);
    }
  };

  // Handle variant edit submit
  const handleFormSubmit = async (formData) => {
    if (!editingVariant) return;
    setIsSubmitting(true);
    try {
      await variantService.updateVariant(editingVariant.id, formData);
      setFeedback({
        type: 'success',
        message: `Variant ${formData.sku} updated successfully.`,
      });
      setIsFormOpen(false);
      setEditingVariant(null);
      loadInventory();
      if (activeTab === 'alerts') loadAlerts();
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick toggle active status
  const handleToggleStatus = async (item) => {
    const nextStatus = !item.isActive;
    try {
      await variantService.updateVariantStatus(item.id, nextStatus);
      setFeedback({
        type: 'success',
        message: `Variant "${item.sku}" is now ${nextStatus ? 'Active' : 'Inactive'}.`,
      });
      loadInventory();
      if (activeTab === 'alerts') loadAlerts();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update status' });
    }
  };

  // Clear filters on main tab
  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryFilter('');
    setStockStatusFilter('ALL');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Export CSV Handler with formula-injection protection
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      if (activeTab === 'alerts') {
        // Export current filtered alerts
        inventoryService.exportRecordsToCsv(
          alerts,
          `collections-by-chandni-stock-alerts-${new Date().toISOString().split('T')[0]}.csv`
        );
        setFeedback({
          type: 'success',
          message: `Exported ${alerts.length} stock alert records to CSV successfully.`,
        });
      } else {
        // Export matching inventory items via server or fallback
        try {
          await inventoryService.downloadInventoryCsvFromServer({
            search: debouncedSearch,
            categoryId: categoryFilter,
            stockStatus: stockStatusFilter,
            sortBy,
            sortOrder,
          });
          setFeedback({
            type: 'success',
            message: 'Inventory CSV exported and downloaded successfully.',
          });
        } catch (serverErr) {
          // Fallback to client-side filtered export
          inventoryService.exportRecordsToCsv(
            inventory,
            `collections-by-chandni-inventory-${new Date().toISOString().split('T')[0]}.csv`
          );
          setFeedback({
            type: 'success',
            message: `Exported ${inventory.length} inventory records to CSV.`,
          });
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to export CSV',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout pageTitle="Inventory Management">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rose-200/60 bg-white p-6 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                Atelier Stock & Warehousing
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-800 border border-rose-200">
                Step 17 Active
              </span>
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 mt-1">
              Inventory Management & Reporting
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Real-time stock tracking, low inventory alerts, category reports, audited adjustments, and sanitized CSV exports.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download size={14} className="mr-1.5" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'all') loadInventory();
                else if (activeTab === 'alerts') loadAlerts();
                else if (activeTab === 'reports') loadReports();
                else if (activeTab === 'history') loadAdjustments();
              }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} className={`mr-1.5 ${isLoading || alertsLoading || reportsLoading || adjustmentsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
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
              className="text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 5 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Active Variants */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Active Variants
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <Layers size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                {summary.totalVariants}
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {summary.totalInactiveVariants > 0
                  ? `+${summary.totalInactiveVariants} inactive (archived)`
                  : 'Operational boutique catalog'}
              </p>
            </div>
          </div>

          {/* Card 2: Units in Stock (Available physical quantity) */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Available Units
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Package size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-emerald-800 tabular-nums">
                {summary.totalUnitsInStock.toLocaleString('en-IN')}
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">Physical items on hand</p>
            </div>
          </div>

          {/* Card 3: Low Stock Alerts */}
          <div
            onClick={() => {
              setActiveTab('alerts');
              setAlertsFilter('LOW_STOCK');
            }}
            className={`rounded-xl border p-5 shadow-xs transition-all cursor-pointer ${
              activeTab === 'alerts' && alertsFilter === 'LOW_STOCK'
                ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-400'
                : 'border-stone-200/80 bg-white hover:border-amber-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-900 uppercase tracking-wider">
                Low Stock
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-amber-800 tabular-nums">
                {summary.lowStockCount}
              </span>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Variants ≤ threshold · Click to view
              </p>
            </div>
          </div>

          {/* Card 4: Out of Stock */}
          <div
            onClick={() => {
              setActiveTab('alerts');
              setAlertsFilter('OUT_OF_STOCK');
            }}
            className={`rounded-xl border p-5 shadow-xs transition-all cursor-pointer ${
              activeTab === 'alerts' && alertsFilter === 'OUT_OF_STOCK'
                ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400'
                : 'border-stone-200/80 bg-white hover:border-rose-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-900 uppercase tracking-wider">
                Out of Stock
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                <XCircle size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-rose-800 tabular-nums">
                {summary.outOfStockCount}
              </span>
              <p className="text-[11px] text-rose-700 mt-0.5">
                0 units available · Click to restock
              </p>
            </div>
          </div>

          {/* Card 5: Estimated Retail Value */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Retail Value
                </span>
                <span
                  title="Valuation calculated using current active catalog selling prices (INR). Wholesale unit acquisition cost is not stored in the product model."
                  className="cursor-help text-stone-400 hover:text-stone-600"
                >
                  <Info size={12} />
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-800">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tabular-nums">
                ₹{Number(summary.estimatedRetailValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <p className="text-[10px] text-stone-400 mt-0.5 truncate" title="At selling price (Cost price not tracked)">
                At selling price (Cost not in DB)
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-stone-200">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'all'
                ? 'border-rose-800 text-rose-900'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
          >
            <Package size={15} />
            <span>All Inventory ({summary.totalVariants})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'alerts'
                ? 'border-rose-800 text-rose-900'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
          >
            <AlertTriangle size={15} className={summary.lowStockCount + summary.outOfStockCount > 0 ? 'text-amber-600' : ''} />
            <span>
              Stock Alerts{' '}
              <span className="ml-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                {summary.lowStockCount + summary.outOfStockCount}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'reports'
                ? 'border-rose-800 text-rose-900'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
          >
            <BarChart3 size={15} />
            <span>Inventory Reports</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'border-rose-800 text-rose-900'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
          >
            <History size={15} />
            <span>Adjustment History</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: ALL INVENTORY TABLE & FILTERS                         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            {/* Toolbar: Search, Filters, and Sorting */}
            <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by SKU, product, size, color, or category..."
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `↳ ${c.name}` : c.name}
                    </option>
                  ))}
                </select>

                {/* Stock Status Filter */}
                <select
                  value={stockStatusFilter}
                  onChange={(e) => {
                    setStockStatusFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                >
                  <option value="ALL">All Stock Levels</option>
                  <option value="IN_STOCK">In Stock (&gt; threshold)</option>
                  <option value="LOW_STOCK">Low Stock (≤ threshold)</option>
                  <option value="OUT_OF_STOCK">Out of Stock (0 units)</option>
                  <option value="INACTIVE">Archived / Inactive Only</option>
                </select>

                {/* Sort Filter */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sb, so] = e.target.value.split('-');
                    setSortBy(sb);
                    setSortOrder(so);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="stock-asc">Stock: Lowest First</option>
                  <option value="stock-desc">Stock: Highest First</option>
                  <option value="sku-asc">SKU (A–Z)</option>
                  <option value="sellingPrice-desc">Price: High to Low</option>
                  <option value="sellingPrice-asc">Price: Low to High</option>
                </select>

                {(search || categoryFilter || stockStatusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Inventory Data Table */}
            <div className="rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
              {isLoading && inventory.length === 0 ? (
                <div className="p-8 space-y-4">
                  <div className="h-4 w-48 bg-stone-100 rounded animate-pulse" />
                  <div className="space-y-3 pt-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-12 w-full bg-stone-50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="p-10 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <AlertCircle size={22} />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-stone-900">Failed to Load Inventory</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
                  <button
                    type="button"
                    onClick={loadInventory}
                    className="inline-flex items-center text-xs font-semibold text-rose-800 hover:text-rose-950 underline pt-1"
                  >
                    Try reloading
                  </button>
                </div>
              ) : inventory.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-400">
                    <Package size={26} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">No Inventory Items Found</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    {search || categoryFilter || stockStatusFilter !== 'ALL'
                      ? 'No variants match your selected filters. Try clearing criteria.'
                      : 'Variants created in products will appear here for inventory control.'}
                  </p>
                  {(search || categoryFilter || stockStatusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                        <th scope="col" className="py-3.5 pl-6 pr-3 font-semibold">Product & SKU</th>
                        <th scope="col" className="py-3.5 px-4 font-semibold">Variant Details</th>
                        <th scope="col" className="py-3.5 px-4 font-semibold">Category</th>
                        <th scope="col" className="py-3.5 px-4 font-semibold">Selling Price</th>
                        <th scope="col" className="py-3.5 px-4 font-semibold text-center">Stock Level</th>
                        <th scope="col" className="py-3.5 px-4 font-semibold text-center">Status</th>
                        <th scope="col" className="py-3.5 pl-4 pr-6 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {inventory.map((item) => {
                        const stock = Number(item.stock ?? item.stockQuantity ?? 0);
                        const threshold = Number(item.lowStockThreshold || 5);
                        const isOutOfStock = stock <= 0;
                        const isLowStock = !isOutOfStock && stock <= threshold;

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                            {/* Product Title & SKU */}
                            <td className="py-3.5 pl-6 pr-3 whitespace-nowrap">
                              <div>
                                <p className="font-semibold text-stone-900 text-xs">
                                  {item.productTitle || item.product?.title || 'Unknown Product'}
                                </p>
                                <span className="font-mono text-[11px] font-bold text-rose-900 bg-rose-50 border border-rose-200/70 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                  {item.sku}
                                </span>
                              </div>
                            </td>

                            {/* Size & Color */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-800">
                                  {item.size}
                                </span>
                                <span className="text-xs font-medium text-stone-700">
                                  {item.color}
                                </span>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center text-xs font-medium text-stone-600 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/60">
                                {item.categoryName || 'Uncategorized'}
                              </span>
                            </td>

                            {/* Price */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-serif font-semibold text-stone-900 tabular-nums">
                              ₹{Number(item.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              <span className="block font-mono text-[10px] text-stone-400 line-through">
                                ₹{Number(item.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Stock Level Pill (Click to adjust) */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVariant(item);
                                  setIsStockOpen(true);
                                }}
                                title="Click to adjust stock"
                                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-mono font-medium hover:opacity-85 transition-opacity cursor-pointer"
                                style={{
                                  backgroundColor: isOutOfStock
                                    ? '#FEF2F2'
                                    : isLowStock
                                    ? '#FFFBEB'
                                    : '#ECFDF5',
                                  borderColor: isOutOfStock
                                    ? '#FECACA'
                                    : isLowStock
                                    ? '#FDE68A'
                                    : '#A7F3D0',
                                  color: isOutOfStock
                                    ? '#991B1B'
                                    : isLowStock
                                    ? '#92400E'
                                    : '#065F46',
                                }}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isOutOfStock
                                      ? 'bg-rose-500'
                                      : isLowStock
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                                <span className="font-bold">{stock}</span>
                                <span className="text-[10px] opacity-75">
                                  {isOutOfStock ? '(Out of Stock)' : isLowStock ? `(Low ≤${threshold})` : 'in stock'}
                                </span>
                                <SlidersHorizontal size={11} className="ml-1 opacity-70" />
                              </button>
                            </td>

                            {/* Status Toggle Button */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                title={item.isActive ? 'Click to deactivate' : 'Click to activate'}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                                  item.isActive
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                    item.isActive ? 'bg-emerald-500' : 'bg-stone-400'
                                  }`}
                                />
                                {item.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 pl-4 pr-6 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedVariant(item);
                                    setIsStockOpen(true);
                                  }}
                                  className="inline-flex items-center space-x-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <TrendingUp size={12} className="text-stone-500" />
                                  <span>Adjust</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVariant(item);
                                    setIsFormOpen(true);
                                  }}
                                  title="Edit variant"
                                  className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Footer */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/40 text-xs text-stone-500">
                  <div>
                    Showing{' '}
                    <span className="font-semibold text-stone-800">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-stone-800">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-semibold text-stone-800">{pagination.total}</span>{' '}
                    variations
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                      }
                      className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={14} className="mr-1" />
                      <span>Prev</span>
                    </button>

                    <div className="text-xs font-mono font-medium text-stone-700 px-2">
                      {pagination.page} / {pagination.totalPages}
                    </div>

                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(prev.totalPages, prev.page + 1),
                        }))
                      }
                      className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} className="ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: STOCK ALERTS (LOW & OUT OF STOCK)                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Alerts Sub-Header & Filter Pill Bar */}
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-stone-900 flex items-center space-x-2">
                  <span>Operational Replenishment Alerts</span>
                  <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-bold font-mono">
                    {alertsSummary.totalAlerts} Needs Attention
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Alerts are strictly calculated on active boutique pieces. Out of stock (0 units) and low stock (≤ configured threshold) variants requiring procurement or tailoring.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAlertsFilter('ALL_ALERTS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                    alertsFilter === 'ALL_ALERTS'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  All Alerts ({alertsSummary.totalAlerts})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertsFilter('OUT_OF_STOCK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                    alertsFilter === 'OUT_OF_STOCK'
                      ? 'bg-rose-700 text-white border-rose-700'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  Out of Stock ({alertsSummary.outOfStockCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertsFilter('LOW_STOCK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                    alertsFilter === 'LOW_STOCK'
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Low Stock ({alertsSummary.lowStockCount})
                </button>
              </div>
            </div>

            {/* Alerts Search and Category Filter Toolbar */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  value={alertsSearch}
                  onChange={(e) => setAlertsSearch(e.target.value)}
                  placeholder="Search alert by SKU or product title..."
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
                {alertsSearch && (
                  <button
                    type="button"
                    onClick={() => setAlertsSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={alertsCategory}
                  onChange={(e) => setAlertsCategory(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center space-x-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download size={13} />
                  <span>Export Alerts CSV</span>
                </button>
              </div>
            </div>

            {/* Alerts Table */}
            <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
              {alertsLoading ? (
                <div className="p-8 text-center text-xs text-stone-500">
                  <RefreshCw size={20} className="animate-spin mx-auto text-rose-800 mb-2" />
                  Loading inventory alerts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">All Stock Healthy</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    {alertsSearch || alertsCategory || alertsFilter !== 'ALL_ALERTS'
                      ? 'No inventory alerts match your filter criteria.'
                      : 'All active catalog items currently exceed their low-stock thresholds.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/70 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                        <th scope="col" className="py-3.5 pl-6 pr-3">Product Name & Category</th>
                        <th scope="col" className="py-3.5 px-4">SKU</th>
                        <th scope="col" className="py-3.5 px-4">Size & Color</th>
                        <th scope="col" className="py-3.5 px-4 text-center">Available Stock</th>
                        <th scope="col" className="py-3.5 px-4 text-center">Threshold</th>
                        <th scope="col" className="py-3.5 px-4 text-center">Alert Status</th>
                        <th scope="col" className="py-3.5 pl-4 pr-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {alerts.map((item) => {
                        const isOutOfStock = item.stock <= 0;
                        return (
                          <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                            <td className="py-3.5 pl-6 pr-3">
                              <p className="font-semibold text-stone-900 text-xs">{item.productTitle}</p>
                              <span className="text-[11px] text-stone-500">{item.categoryName}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-rose-900">
                              {item.sku}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-stone-800">{item.size}</span>
                              <span className="text-stone-400 mx-1">·</span>
                              <span className="text-stone-600">{item.color}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`font-mono text-sm font-bold ${
                                  isOutOfStock ? 'text-rose-700' : 'text-amber-700'
                                }`}
                              >
                                {item.stock}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-stone-500">
                              {item.lowStockThreshold}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                                  isOutOfStock
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                              </span>
                            </td>
                            <td className="py-3.5 pl-4 pr-6 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVariant(item);
                                  setIsStockOpen(true);
                                }}
                                className="inline-flex items-center space-x-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                <TrendingUp size={13} />
                                <span>Restock</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: INVENTORY REPORTS (BY PRODUCT & BY CATEGORY)          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* Reports Sub-Nav & Category Filter */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setReportsSubView('byProduct')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    reportsSubView === 'byProduct'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Current Inventory by Product
                </button>
                <button
                  type="button"
                  onClick={() => setReportsSubView('byCategory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    reportsSubView === 'byCategory'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Stock Grouped by Category
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={reportsCategory}
                  onChange={(e) => setReportsCategory(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:border-rose-600 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center space-x-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download size={13} />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* SubView: Current Inventory by Product */}
            {reportsSubView === 'byProduct' && (
              <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                  <h3 className="font-serif text-sm font-semibold text-stone-900">
                    Product-Level Stock Aggregations ({reportsData.byProduct.length} Products)
                  </h3>
                  <span className="text-[11px] text-stone-500">
                    Aggregated across all active product variations
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider font-semibold text-stone-500 bg-stone-50/70">
                        <th className="py-3 pl-6 pr-3">Product Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Variations</th>
                        <th className="py-3 px-4 text-center">Total Stock (Units)</th>
                        <th className="py-3 px-4 text-center">Low Stock</th>
                        <th className="py-3 px-4 text-center">Out of Stock</th>
                        <th className="py-3 pl-4 pr-6 text-right">Retail Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {reportsData.byProduct.map((p) => (
                        <tr key={p.productId} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3.5 pl-6 pr-3 font-semibold text-stone-900">
                            {p.productTitle}
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">
                            {p.categoryName}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium">
                            {p.variantCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-900">
                            {p.totalUnits.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {p.lowStockCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {p.lowStockCount}
                              </span>
                            ) : (
                              <span className="text-stone-300">0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {p.outOfStockCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                {p.outOfStockCount}
                              </span>
                            ) : (
                              <span className="text-stone-300">0</span>
                            )}
                          </td>
                          <td className="py-3.5 pl-4 pr-6 text-right font-serif font-semibold text-stone-900 tabular-nums">
                            ₹{Number(p.estimatedRetailValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SubView: Stock Grouped by Category */}
            {reportsSubView === 'byCategory' && (
              <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                  <h3 className="font-serif text-sm font-semibold text-stone-900">
                    Category Stock Health & Valuation ({reportsData.byCategory.length} Categories)
                  </h3>
                  <span className="text-[11px] text-stone-500">
                    Departmental distribution for inventory forecasting
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider font-semibold text-stone-500 bg-stone-50/70">
                        <th className="py-3 pl-6 pr-3">Category</th>
                        <th className="py-3 px-4 text-center">Products</th>
                        <th className="py-3 px-4 text-center">Variations</th>
                        <th className="py-3 px-4 text-center">Total Available Units</th>
                        <th className="py-3 px-4 text-center">Low Stock Items</th>
                        <th className="py-3 px-4 text-center">Depleted Items</th>
                        <th className="py-3 pl-4 pr-6 text-right">Estimated Retail Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {reportsData.byCategory.map((cat) => (
                        <tr key={cat.categoryId} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3.5 pl-6 pr-3 font-semibold text-stone-900">
                            {cat.categoryName}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium">
                            {cat.productCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium">
                            {cat.variantCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-900">
                            {cat.totalUnits.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-amber-700 font-bold">
                            {cat.lowStockCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-rose-700 font-bold">
                            {cat.outOfStockCount}
                          </td>
                          <td className="py-3.5 pl-4 pr-6 text-right font-serif font-semibold text-stone-900 tabular-nums">
                            ₹{Number(cat.estimatedRetailValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: STOCK ADJUSTMENT HISTORY (AUDIT TRAIL)                */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* History Toolbar */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  value={adjustmentsSearch}
                  onChange={(e) => setAdjustmentsSearch(e.target.value)}
                  placeholder="Search adjustments by SKU, product, or reason..."
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
                {adjustmentsSearch && (
                  <button
                    type="button"
                    onClick={() => setAdjustmentsSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (inventory.length > 0) {
                      setSelectedVariant(inventory[0]);
                      setIsStockOpen(true);
                    }
                  }}
                  className="inline-flex items-center space-x-1.5 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
                >
                  <TrendingUp size={13} />
                  <span>New Stock Adjustment</span>
                </button>
              </div>
            </div>

            {/* Adjustments Table */}
            <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                <h3 className="font-serif text-sm font-semibold text-stone-900">
                  Inventory Movement Audit Trail
                </h3>
                <span className="text-[11px] text-stone-500">
                  Permanent record of stock receipts, reconciliations, and deductions
                </span>
              </div>

              {adjustmentsLoading ? (
                <div className="p-8 text-center text-xs text-stone-500">
                  <RefreshCw size={20} className="animate-spin mx-auto text-rose-800 mb-2" />
                  Loading audit log...
                </div>
              ) : adjustments.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-400">
                    <History size={26} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">No Adjustment Records</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Manual stock adjustments and audit receipts will be permanently recorded here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider font-semibold text-stone-500 bg-stone-50/70">
                        <th className="py-3 pl-6 pr-3">Date & Time</th>
                        <th className="py-3 px-4">SKU & Product</th>
                        <th className="py-3 px-4">Size & Color</th>
                        <th className="py-3 px-4 text-center">Previous Qty</th>
                        <th className="py-3 px-4 text-center">New Qty</th>
                        <th className="py-3 px-4 text-center">Delta</th>
                        <th className="py-3 pl-4 pr-6">Adjustment Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {adjustments.map((a) => {
                        const isPositive = a.quantityDelta > 0;
                        const isZero = a.quantityDelta === 0;
                        const formattedDate = new Date(a.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr key={a.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-3.5 pl-6 pr-3 whitespace-nowrap text-stone-500 font-mono text-[11px]">
                              {formattedDate}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                {a.sku}
                              </span>
                              <span className="block text-stone-700 text-[11px] mt-0.5">
                                {a.productTitle}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-stone-600">
                              {a.size} {a.color ? `· ${a.color}` : ''}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              {a.previousQuantity}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-900">
                              {a.newQuantity}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                                  isZero
                                    ? 'bg-stone-100 text-stone-600'
                                    : isPositive
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {isPositive ? `+${a.quantityDelta}` : a.quantityDelta}
                              </span>
                            </td>
                            <td className="py-3.5 pl-4 pr-6">
                              <p className="text-xs text-stone-800">{a.reason}</p>
                              {a.adminUserId && (
                                <span className="text-[10px] text-stone-400">
                                  Audited by: {a.adminUserId}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Adjustment Pagination */}
              {adjustmentsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50/40 text-xs text-stone-500">
                  <div>
                    Page {adjustmentsPagination.page} of {adjustmentsPagination.totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={adjustmentsPagination.page <= 1}
                      onClick={() =>
                        setAdjustmentsPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                      }
                      className="px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={adjustmentsPagination.page >= adjustmentsPagination.totalPages}
                      onClick={() =>
                        setAdjustmentsPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      className="px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isStockOpen}
        onClose={() => {
          setIsStockOpen(false);
          setSelectedVariant(null);
        }}
        onSubmit={handleStockSubmit}
        variant={selectedVariant}
        isSubmitting={isAdjusting}
      />

      {/* Variant Form Modal for Editing */}
      <VariantFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingVariant(null);
        }}
        onSubmit={handleFormSubmit}
        variantToEdit={editingVariant}
        product={{ title: editingVariant?.productTitle || 'Product' }}
        isSubmitting={isSubmitting}
      />
    </AdminLayout>
  );
}
