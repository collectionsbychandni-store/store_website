import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

/**
 * Shared Admin Layout Component
 * Provides responsive desktop sidebar, mobile drawer, administrative header, and main content canvas.
 */
export default function AdminLayout({ children, pageTitle = 'Dashboard', noPadding = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 flex selection:bg-rose-100 selection:text-rose-950">
      {/* Sidebar Navigation */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Administrative Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Header Bar */}
        <AdminHeader
          onOpenSidebar={() => setIsSidebarOpen(true)}
          pageTitle={pageTitle}
        />

        {/* Content Viewport */}
        <main className={`flex-1 ${noPadding ? 'p-0 overflow-hidden flex flex-col' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'}`}>
          <div className={noPadding ? 'w-full flex-1 flex flex-col min-h-0' : 'mx-auto max-w-7xl'}>
            {children ? children : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
