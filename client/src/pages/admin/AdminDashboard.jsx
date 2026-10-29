import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../layouts/AdminLayout';
import DashboardStatCard from '../../components/admin/DashboardStatCard';
import SalesOverviewChart from '../../components/admin/SalesOverviewChart';
import RecentOrdersTable from '../../components/admin/RecentOrdersTable';
import TopProductsList from '../../components/admin/TopProductsList';
import * as dashboardService from '../../services/dashboardService';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Store,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Admin Dashboard Page (/admin)
 * Displays live, aggregated operational metrics:
 * - 4 Key Statistic Cards (Products, Orders, Customers, Sales)
 * - Sales Overview Chart (Live monthly revenue & POS/Online breakdown)
 * - Recent Orders Section (Live orders feed)
 * - Top-Selling Products Section (Catalog best-sellers from live data)
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    stats: {
      totalProducts: 0,
      categoriesCount: 0,
      totalOrders: 0,
      dispatchQueueCount: 0,
      totalCustomers: 0,
      totalSales: 0,
      totalSalesFormatted: '₹0',
    },
    recentOrders: [],
    topProducts: [],
    chartData: [],
  });

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const summary = await dashboardService.getDashboardSummary();
      if (summary) {
        setData(summary);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCardsData = [
    {
      label: 'Total Products',
      value: data.stats.totalProducts.toString(),
      icon: Package,
      subtitle: `${data.stats.categoriesCount} active boutique lines`,
      trend: null,
    },
    {
      label: 'Total Orders',
      value: data.stats.totalOrders.toString(),
      icon: ShoppingBag,
      subtitle: `${data.stats.dispatchQueueCount} in dispatch queue`,
      trend: null,
    },
    {
      label: 'Total Customers',
      value: data.stats.totalCustomers.toString(),
      icon: Users,
      subtitle: 'Registered accounts & clientele',
      trend: null,
    },
    {
      label: 'Total Sales',
      value: data.stats.totalSalesFormatted,
      icon: DollarSign,
      subtitle: 'Gross revenue (In-store & Online)',
      trend: null,
    },
  ];

  return (
    <AdminLayout pageTitle="Dashboard Overview">
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Banner Card */}
        <div className="relative overflow-hidden rounded-xl border border-rose-200/60 bg-gradient-to-r from-rose-50/70 via-white to-stone-50 p-6 sm:p-7 shadow-xs">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Operations · Atelier Command Center</span>
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900">
                Welcome back, {user?.name || 'Administrator'}
              </h1>
              <p className="text-stone-600 text-xs sm:text-sm max-w-2xl font-light">
                Here is the real-time operational overview for Collections by Chandni. Review
                customer purchase orders, monthly sales trajectories, and catalog inventory health.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                title="Refresh live data"
                className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
              >
                <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              <Link
                to="/admin/pos"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors shadow-xs"
              >
                <Store size={14} className="mr-1.5" />
                <span>Open POS Billing</span>
              </Link>

              <Link
                to="/admin/products"
                className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs"
              >
                <span>Manage Products</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Statistics Cards Grid */}
        <section aria-label="Key Performance Indicators">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {statCardsData.map((card) => (
              <DashboardStatCard
                key={card.label}
                label={card.label}
                value={loading ? '...' : card.value}
                icon={card.icon}
                subtitle={card.subtitle}
                trend={card.trend}
                isDemo={false}
              />
            ))}
          </div>
        </section>

        {/* Sales Overview Chart */}
        <section aria-label="Sales and Revenue Analytics">
          <SalesOverviewChart data={data.chartData} />
        </section>

        {/* 2-Column Split: Recent Orders (wide) + Top Products (narrow) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Recent Orders Table (takes 2 of 3 columns on large screens) */}
          <div className="lg:col-span-2">
            <RecentOrdersTable orders={data.recentOrders} />
          </div>

          {/* Top Selling Products (takes 1 column on large screens) */}
          <div className="lg:col-span-1">
            <TopProductsList products={data.topProducts} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
