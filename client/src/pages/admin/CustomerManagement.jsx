import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import CustomerDetailsModal from '../../components/admin/CustomerDetailsModal';
import * as customerService from '../../services/customerService';
import {
  Users,
  Search,
  X,
  Filter,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  UserX,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Mail,
  Phone,
} from 'lucide-react';

/**
 * Customer Management Page (/admin/customers)
 * Step 19: Admin Customer Management
 */
export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
    newThisMonth: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Detail Modal & Action State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Quick Deactivate Confirm Modal
  const [customerToDeactivate, setCustomerToDeactivate] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load KPI Statistics
  const loadStats = useCallback(async () => {
    try {
      const res = await customerService.getCustomerStats();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.warn('Failed to load customer stats:', e);
    }
  }, []);

  // Fetch paginated customers
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await customerService.getCustomers({
        search: debouncedSearch,
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res?.data) {
        setCustomers(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load customer directory');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, startDate, endDate, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Clear feedback after 4s
  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // View Customer Details
  const handleViewCustomer = async (customerId) => {
    setIsLoadingDetail(true);
    try {
      const res = await customerService.getCustomerById(customerId);
      if (res?.data) {
        setSelectedCustomer(res.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load customer details',
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Update Account Status (Activate / Deactivate)
  const handleStatusChange = async (customerId, nextStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await customerService.updateCustomerStatus(customerId, nextStatus);
      setFeedback({
        type: 'success',
        message: `Account for "${res.data.name}" has been ${
          nextStatus ? 'activated' : 'deactivated'
        } successfully.`,
      });

      // Update selected modal customer if open
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer((prev) => ({ ...prev, isActive: nextStatus }));
      }

      setCustomerToDeactivate(null);
      await loadCustomers();
      await loadStats();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update account status',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <AdminLayout pageTitle="Customer Management">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rose-200/60 bg-white p-6 shadow-xs">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
              Clientele Directory & Accounts
            </span>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 mt-1">
              Customer Management
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Directory of registered patrons, order fulfillment histories, audited lifetime spending, and account access management.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                loadCustomers();
                loadStats();
              }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Directory</span>
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

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Registered Customers */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Total Clientele
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                {stats.totalCustomers}
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Excludes atelier administration accounts
              </p>
            </div>
          </div>

          {/* Card 2: Active Patrons */}
          <div
            onClick={() => {
              setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`rounded-xl border p-5 shadow-xs transition-colors cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-400'
                : 'border-stone-200/80 bg-white hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-900 uppercase tracking-wider">
                Active Patrons
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <UserCheck size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-emerald-800 tabular-nums">
                {stats.activeCustomers}
              </span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {statusFilter === 'ACTIVE' ? 'Showing filtered' : 'Authorized for checkout & orders'}
              </p>
            </div>
          </div>

          {/* Card 3: Inactive / Deactivated */}
          <div
            onClick={() => {
              setStatusFilter(statusFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`rounded-xl border p-5 shadow-xs transition-colors cursor-pointer ${
              statusFilter === 'INACTIVE'
                ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400'
                : 'border-stone-200/80 bg-white hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-900 uppercase tracking-wider">
                Deactivated Accounts
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                <UserX size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-rose-800 tabular-nums">
                {stats.inactiveCustomers}
              </span>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {statusFilter === 'INACTIVE' ? 'Showing filtered' : 'Access revoked · Click to filter'}
              </p>
            </div>
          </div>

          {/* Card 4: New This Month */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Joined This Month
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-800">
                <Calendar size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-stone-900 tabular-nums">
                {stats.newThisMonth}
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">
                New patron registrations
              </p>
            </div>
          </div>
        </div>

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
              placeholder="Search by customer name, email, or phone..."
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

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
            >
              <option value="ALL">All Account Statuses</option>
              <option value="ACTIVE">Active Patrons Only</option>
              <option value="INACTIVE">Deactivated Accounts Only</option>
            </select>

            {/* Sort Options */}
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
              <option value="createdAt-desc">Registration: Newest First</option>
              <option value="createdAt-asc">Registration: Oldest First</option>
              <option value="name-asc">Customer Name (A–Z)</option>
              <option value="name-desc">Customer Name (Z–A)</option>
              <option value="orderCount-desc">Most Orders First</option>
              <option value="totalSpent-desc">Highest Spending First</option>
            </select>

            {/* Registration Date Range Filters */}
            <div className="flex items-center space-x-1.5 bg-stone-50/80 border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-600">
              <Calendar size={13} className="text-stone-400 shrink-0" />
              <span className="text-[11px] text-stone-400">Joined:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="bg-transparent text-xs text-stone-800 focus:outline-none cursor-pointer"
                title="Registration Start Date"
              />
              <span className="text-stone-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="bg-transparent text-xs text-stone-800 focus:outline-none cursor-pointer"
                title="Registration End Date"
              />
            </div>

            {(search || statusFilter !== 'ALL' || startDate || endDate) && (
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

        {/* Customer Directory Table */}
        <div className="rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
          {isLoading && customers.length === 0 ? (
            <div className="p-8 space-y-4">
              <div className="h-4 w-48 bg-stone-100 rounded animate-pulse" />
              <div className="space-y-3 pt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 w-full bg-stone-50 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertCircle size={22} />
              </div>
              <h3 className="font-serif text-lg font-medium text-stone-900">
                Failed to Load Customer Directory
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={loadCustomers}
                className="inline-flex items-center text-xs font-semibold text-rose-800 hover:text-rose-950 underline pt-1"
              >
                Try reloading
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-400">
                <Users size={26} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                No Customers Found
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {search || statusFilter !== 'ALL'
                  ? 'No patrons match your search or filter criteria. Try clearing filters.'
                  : 'Client accounts created through boutique storefront registration will appear here.'}
              </p>
              {(search || statusFilter !== 'ALL') && (
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
                    <th scope="col" className="py-3.5 pl-6 pr-3">Customer</th>
                    <th scope="col" className="py-3.5 px-4">Contact Details</th>
                    <th scope="col" className="py-3.5 px-4">Registration</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Orders</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Lifetime Spend</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Status</th>
                    <th scope="col" className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 pl-6 pr-3 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-900 font-serif font-bold text-xs border border-rose-200/70 shrink-0">
                            {c.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleViewCustomer(c.id)}
                              className="font-semibold text-stone-900 text-xs hover:text-rose-900 text-left cursor-pointer"
                            >
                              {c.name}
                            </button>
                            <span className="block font-mono text-[10px] text-stone-400">
                              ID: {c.id.slice(0, 14)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5 text-stone-800 text-xs">
                            <Mail size={12} className="text-stone-400" />
                            <span>{c.email}</span>
                          </div>
                          {c.phone ? (
                            <div className="flex items-center space-x-1.5 text-stone-500 text-[11px] font-mono">
                              <Phone size={11} className="text-stone-400" />
                              <span>{c.phone}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">No phone saved</span>
                          )}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-600 text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Order Count */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span className="font-mono font-bold text-xs text-stone-800">
                          {c.orderCount}
                        </span>
                        {c.completedOrders > 0 && (
                          <span className="block text-[10px] text-emerald-700">
                            ({c.completedOrders} completed)
                          </span>
                        )}
                      </td>

                      {/* Lifetime Spending */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-serif font-semibold text-stone-900 tabular-nums">
                        {c.spendingFormatted || `₹${Number(c.totalSpent || 0).toLocaleString('en-IN')}`}
                      </td>

                      {/* Status Indicator */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              c.isActive ? 'bg-emerald-500' : 'bg-stone-400'
                            }`}
                          />
                          <span className={c.isActive ? 'text-emerald-800' : 'text-stone-500'}>
                            {c.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-4 pr-6 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleViewCustomer(c.id)}
                            className="inline-flex items-center space-x-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye size={12} className="text-stone-500" />
                            <span>Details</span>
                          </button>

                          {c.isActive ? (
                            <button
                              type="button"
                              onClick={() => setCustomerToDeactivate(c)}
                              title="Deactivate customer account"
                              className="rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            >
                              <UserX size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(c.id, true)}
                              title="Reactivate customer account"
                              className="rounded-lg p-1 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                            >
                              <UserCheck size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                of <span className="font-semibold text-stone-800">{pagination.total}</span> patrons
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

      {/* Customer Profile Details Modal */}
      <CustomerDetailsModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={isUpdatingStatus}
      />

      {/* Deactivate Account Confirmation Dialog */}
      {customerToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
                <UserX size={20} />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Deactivate Customer Account?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-stone-900">{customerToDeactivate.name}</strong> ({customerToDeactivate.email})?
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              <strong>Access Revocation:</strong> Deactivating an account immediately prevents future customer login and blocks any subsequent authenticated requests. Historical order records and fulfillment addresses are preserved.
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDeactivate(null)}
                className="px-3.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(customerToDeactivate.id, false)}
                className="px-4 py-1.5 rounded-lg bg-rose-800 text-white text-xs font-semibold hover:bg-rose-900 cursor-pointer"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
