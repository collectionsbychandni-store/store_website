import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNameMap = {
  admin: 'Admin',
  products: 'Products',
  categories: 'Categories',
  inventory: 'Inventory',
  orders: 'Orders',
  customers: 'Customers',
  banners: 'Banners',
  reports: 'Reports',
  settings: 'Settings',
};

/**
 * Breadcrumb navigation for the Admin Panel
 */
export default function AdminBreadcrumbs({ customCrumbs = null }) {
  const location = useLocation();

  if (customCrumbs && customCrumbs.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center text-xs text-stone-500">
        {customCrumbs.map((crumb, idx) => {
          const isLast = idx === customCrumbs.length - 1;
          return (
            <React.Fragment key={crumb.label}>
              {idx > 0 && <ChevronRight size={13} className="mx-1.5 text-stone-400 shrink-0" />}
              {isLast || !crumb.path ? (
                <span className="font-medium text-stone-800 truncate">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="hover:text-stone-900 transition-colors truncate">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  }

  // Derive crumbs automatically from pathname: /admin/products -> Admin / Products
  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, idx) => {
    const path = '/' + segments.slice(0, idx + 1).join('/');
    const label = routeNameMap[seg.toLowerCase()] || seg.charAt(0).toUpperCase() + seg.slice(1);
    return { label, path };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-stone-500">
      <Link to="/admin" className="flex items-center hover:text-stone-900 transition-colors">
        <Home size={13} className="mr-1 text-stone-400" />
        <span className="sr-only">Home</span>
      </Link>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        // Don't duplicate if root is just /admin
        if (crumbs.length === 1 && crumb.label === 'Admin') {
          return (
            <React.Fragment key={crumb.path}>
              <ChevronRight size={13} className="mx-1.5 text-stone-400 shrink-0" />
              <span className="font-medium text-stone-800">Dashboard</span>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={crumb.path}>
            <ChevronRight size={13} className="mx-1.5 text-stone-400 shrink-0" />
            {isLast ? (
              <span className="font-medium text-stone-800 truncate">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="hover:text-stone-900 transition-colors truncate">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
