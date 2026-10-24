import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../layouts/AdminLayout';
import DashboardStatCard from '../../components/admin/DashboardStatCard';
import SalesOverviewChart from '../../components/admin/SalesOverviewChart';
import RecentOrdersTable from '../../components/admin/RecentOrdersTable';
import TopProductsList from '../../components/admin/TopProductsList';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Admin Dashboard Page (/admin)
 * Displays:
 * - AdminLayout wrapper
 * - 4 Key Statistic Cards (reusable DashboardStatCard)
 * - Sales Overview Chart (responsive monthly demo chart)
 * - Recent Orders Section (demo table with status tags)
 * - Top-Selling Products Section (catalog best-sellers)
 */
export default function AdminDashboard() {
  const { user } = useAuth();

  // Reusable Statistic Cards configuration (Identified as Demo Data)
  const statCardsData = [
    {
      label: 'Total Products',
      value: '48',
      icon: Package,
      subtitle: '5 active boutique lines',
      trend: { value: '+4 added', isPositive: true, label: 'this week' },
    },
    {
      label: 'Total Orders',
      value: '128',
      icon: ShoppingBag,
      subtitle: '9 orders in dispatch queue',
      trend: { value: '+14.2%', isPositive: true, label: 'vs last month' },
    },
    {
      label: 'Total Customers',
      value: '96',
      icon: Users,
      subtitle: '62 repeat clientele',
      trend: { value: '+18%', isPositive: true, label: 'vs last month' },
    },
    {
      label: 'Total Sales',
      value: '₹2,78,450',
      icon: DollarSign,
      subtitle: 'Gross revenue across store',
      trend: { value: '+22.5%', isPositive: true, label: 'vs last month' },
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
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                  Step 4 Active · Admin Layout & Dashboard
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900">
                Welcome back, {user?.name || 'Administrator'}
              </h1>
              <p className="text-stone-600 text-xs sm:text-sm max-w-2xl font-light">
                Here is the real-time operational overview for Collections by Chandni. Review
                customer purchase orders, monthly sales trajectories, and inventory health.
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <Link
                to="/admin/products"
                className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs"
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
                value={card.value}
                icon={card.icon}
                subtitle={card.subtitle}
                trend={card.trend}
                isDemo={true}
              />
            ))}
          </div>
        </section>

        {/* Sales Overview Chart */}
        <section aria-label="Sales and Revenue Analytics">
          <SalesOverviewChart />
        </section>

        {/* 2-Column Split: Recent Orders (wide) + Top Products (narrow) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Recent Orders Table (takes 2 of 3 columns on large screens) */}
          <div className="lg:col-span-2">
            <RecentOrdersTable />
          </div>

          {/* Top Selling Products (takes 1 column on large screens) */}
          <div className="lg:col-span-1">
            <TopProductsList />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
