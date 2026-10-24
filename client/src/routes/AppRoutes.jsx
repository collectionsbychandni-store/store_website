import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import ShopPage from '../pages/ShopPage';
import ProductDetailsPage from '../pages/ProductDetailsPage';
import CategoriesPage from '../pages/CategoriesPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import AccountPage from '../pages/AccountPage';
import AddressesPage from '../pages/AddressesPage';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailsPage from '../pages/OrderDetailsPage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import PaymentStatusPage from '../pages/PaymentStatusPage';
import CustomerProtectedRoute from './CustomerProtectedRoute';

// Admin Authentication & Pages
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProductManagement from '../pages/admin/ProductManagement';
import CategoryManagement from '../pages/admin/CategoryManagement';
import InventoryManagement from '../pages/admin/InventoryManagement';
import OrderManagement from '../pages/admin/OrderManagement';
import ReturnsManagement from '../pages/admin/ReturnsManagement';
import BannerManagement from '../pages/admin/BannerManagement';
import CustomerManagement from '../pages/admin/CustomerManagement';
import SalesReport from '../pages/admin/SalesReport';
import AdminPlaceholder from '../pages/admin/AdminPlaceholder';
import ProtectedRoute from './ProtectedRoute';

/**
 * Route declarations for Collections by Chandni
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Admin Public Route */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute>
            <ProductManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute>
            <CategoryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute>
            <InventoryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute>
            <OrderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/returns"
        element={
          <ProtectedRoute>
            <ReturnsManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute>
            <CustomerManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/banners"
        element={
          <ProtectedRoute>
            <BannerManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute>
            <SalesReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute>
            <AdminPlaceholder title="Settings" />
          </ProtectedRoute>
        }
      />

      {/* Storefront Layout & Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="product/:slug" element={<ProductDetailsPage />} />
        <Route path="products/:slug" element={<ProductDetailsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="account"
          element={
            <CustomerProtectedRoute>
              <AccountPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="account/addresses"
          element={
            <CustomerProtectedRoute>
              <AddressesPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="account/orders"
          element={
            <CustomerProtectedRoute>
              <OrdersPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="account/orders/:id"
          element={
            <CustomerProtectedRoute>
              <OrderDetailsPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="checkout"
          element={
            <CustomerProtectedRoute>
              <CheckoutPage />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="checkout/payment-status"
          element={
            <CustomerProtectedRoute>
              <PaymentStatusPage />
            </CustomerProtectedRoute>
          }
        />
        <Route path="cart" element={<CartPage />} />

        {/* 404 Fallback */}
        <Route
          path="*"
          element={
            <div className="py-24 text-center">
              <h2 className="font-serif text-3xl font-medium text-stone-900">
                404 - Page Not Found
              </h2>
              <p className="text-stone-600 mt-2">The requested page does not exist.</p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
