import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  Boxes,
  ShoppingBag,
  Users,
  Image as BannerIcon,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
  X,
  Sparkles,
  RotateCcw,
  Receipt,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'POS Billing', path: '/admin/pos', icon: Receipt },
  { name: 'Products', path: '/admin/products', icon: Shirt },
  { name: 'Categories', path: '/admin/categories', icon: FolderTree },
  { name: 'Inventory', path: '/admin/inventory', icon: Boxes },
  { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { name: 'Returns & Refunds', path: '/admin/returns', icon: RotateCcw },
  { name: 'Customers', path: '/admin/customers', icon: Users },
  { name: 'Banners', path: '/admin/banners', icon: BannerIcon },
  { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

/**
 * Admin Sidebar component
 * Fixed/sticky on desktop, responsive drawer on mobile.
 */
export default function AdminSidebar({ isOpen, onClose }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation sidebar"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onClose();
          }}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-stone-200/90 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-stone-100 px-6">
          <Link
            to="/admin"
            onClick={handleNavClick}
            className="group flex items-center space-x-3 focus:outline-none"
          >
            <img
              src="/assets/aistudio/logo_454bd7ce.png"
              alt="Collections by Chandni Emblem"
              className="h-11 w-11 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-serif text-sm font-semibold tracking-tight text-stone-900 group-hover:text-rose-900 transition-colors leading-tight">
                Collections by Chandni
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-rose-800/80">
                Admin Atelier
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 lg:hidden focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 pb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
              Management
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.exact}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-rose-50/80 text-rose-950 font-semibold shadow-xs ring-1 ring-rose-200/60'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <div className="flex items-center space-x-3 truncate">
                      <Icon
                        size={17}
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? 'text-rose-700'
                            : 'text-stone-400 group-hover:text-stone-700'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Secondary Links divider */}
          <div className="pt-6 px-3 pb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
              Shortcuts
            </span>
          </div>

          <div className="space-y-1">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <ExternalLink size={17} className="text-stone-400" />
                <span>View Storefront</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-mono text-stone-400">
                Live
              </span>
            </Link>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="border-t border-stone-100 p-4 bg-stone-50/50">
          <div className="mb-3 flex items-center space-x-3 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-900 font-serif text-xs font-semibold ring-1 ring-rose-200">
              {user?.name
                ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-stone-900">
                {user?.name || 'Administrator'}
              </p>
              <p className="truncate text-[11px] text-stone-500 font-mono">
                {user?.email || 'admin@collectionsbychandni.in'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center space-x-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-rose-50 hover:text-rose-900 hover:border-rose-200 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <LogOut size={14} className="text-stone-500" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
