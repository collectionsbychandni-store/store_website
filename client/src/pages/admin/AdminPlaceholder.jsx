import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import {
  Shirt,
  FolderTree,
  Boxes,
  ShoppingBag,
  Users,
  Image as BannerIcon,
  BarChart3,
  Settings,
  ArrowLeft,
  Clock,
} from 'lucide-react';

const sectionMeta = {
  '/admin/products': {
    title: 'Products Management',
    description: 'Product catalog, pricing, variants, and image gallery will be available in the next development step.',
    icon: Shirt,
  },
  '/admin/categories': {
    title: 'Categories Management',
    description: 'Hierarchical category trees, subcategories, and banner assignments will be available in the next development step.',
    icon: FolderTree,
  },
  '/admin/inventory': {
    title: 'Inventory & Stock Management',
    description: 'Variant-level SKU stock counts, low inventory alerts, and warehouse logs will be available in the next development step.',
    icon: Boxes,
  },
  '/admin/orders': {
    title: 'Orders & Fulfillment',
    description: 'Comprehensive order processing, airway bills, dispatch tracking, and invoice downloads will be available in the next development step.',
    icon: ShoppingBag,
  },
  '/admin/customers': {
    title: 'Customers Directory',
    description: 'Customer profiles, saved delivery addresses, and customer lifetime value metrics will be available in the next development step.',
    icon: Users,
  },
  '/admin/banners': {
    title: 'Banners & Marketing Sliders',
    description: 'Promotional homepage banners, seasonal collection lookbooks, and CTA buttons will be available in the next development step.',
    icon: BannerIcon,
  },
  '/admin/reports': {
    title: 'Reports & Business Analytics',
    description: 'Financial ledger statements, GST tax breakdowns, and sales conversion analytics will be available in the next development step.',
    icon: BarChart3,
  },
  '/admin/settings': {
    title: 'Store Settings',
    description: 'Brand configurations, payment gateway keys, shipping rate zones, and email notifications will be available in the next development step.',
    icon: Settings,
  },
};

/**
 * Reusable Admin Placeholder component wrapped in AdminLayout
 */
export default function AdminPlaceholder({ title = 'Admin Section' }) {
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase();

  const meta = sectionMeta[currentPath] || {
    title,
    description: 'This management section will be available in upcoming development steps.',
    icon: Clock,
  };

  const Icon = meta.icon;

  return (
    <AdminLayout pageTitle={meta.title}>
      <div className="flex min-h-[480px] items-center justify-center py-10">
        <div className="w-full max-w-lg rounded-xl border border-stone-200/90 bg-white p-8 sm:p-10 text-center shadow-xs space-y-6">
          {/* Icon Badge */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-800 ring-1 ring-rose-200/70">
            <Icon size={28} strokeWidth={1.5} />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800/80">
              Module Placeholder
            </span>
            <h2 className="font-serif text-2xl font-semibold text-stone-900">
              {meta.title}
            </h2>
            <p className="text-xs font-mono text-stone-400">{location.pathname}</p>
          </div>

          {/* Description */}
          <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            {meta.description}
          </p>

          {/* Back button */}
          <div className="pt-2">
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
            >
              <ArrowLeft size={14} className="mr-2 text-stone-500" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
