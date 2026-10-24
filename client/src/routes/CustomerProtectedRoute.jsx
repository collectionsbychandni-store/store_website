import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * CustomerProtectedRoute Guard
 * Ensures user is authenticated before allowing access to customer pages like /account.
 * Redirects unauthenticated visitors to /login preserving target location.
 */
export default function CustomerProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#781D42]/20 border-t-[#781D42] rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
            Verifying Patron Credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
