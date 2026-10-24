import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminBreadcrumbs from './AdminBreadcrumbs';
import { Menu, Search, Bell, ShieldCheck } from 'lucide-react';

/**
 * Admin Header Bar
 * Displays page title, breadcrumb, visual search, notifications, and admin profile badge.
 */
export default function AdminHeader({ onOpenSidebar, pageTitle = 'Dashboard' }) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AD';

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-stone-200/90 bg-white/95 px-4 sm:px-8 backdrop-blur-xs">
      {/* Left zone: Menu toggle (mobile) + Page Title & Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar navigation"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 lg:hidden focus:outline-none focus:ring-1 focus:ring-rose-500"
        >
          <Menu size={18} />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h1 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">
              {pageTitle}
            </h1>
          </div>
          <div className="hidden sm:block pt-0.5">
            <AdminBreadcrumbs />
          </div>
        </div>
      </div>

      {/* Right zone: Visual Search, Notifications & Admin Profile */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        {/* Search Field (Visual only) */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
            <Search size={15} />
          </div>
          <input
            type="search"
            readOnly
            placeholder="Search orders, catalog..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50/70 py-2 pl-9 pr-3 text-xs text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-default"
          />
        </div>

        {/* Notification Icon (Visual only) */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500"
        >
          <Bell size={16} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-stone-200" aria-hidden="true" />

        {/* Admin Profile Section */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-900 font-serif text-xs font-semibold ring-1 ring-rose-200">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-stone-900 leading-tight">
              {user?.name || 'Administrator'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-rose-800/80 font-medium">
              Store Manager
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
