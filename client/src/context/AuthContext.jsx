import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import { getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await authService.getMe();
        if (isMounted && response?.data) {
          setUser(response.data);
          setToken(storedToken);
        }
      } catch (error) {
        console.warn('Failed to restore session or token expired:', error.message);
        removeStoredToken();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Customer Login
  const loginCustomer = useCallback(async (email, password) => {
    const response = await authService.loginCustomer({ email, password });
    if (response?.data?.token && response?.data?.user) {
      const receivedToken = response.data.token;
      const receivedUser = response.data.user;

      setStoredToken(receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return response;
    }
    throw new Error('Invalid login response from server');
  }, []);

  // Admin Login
  const loginAdmin = useCallback(async (email, password) => {
    const response = await authService.loginAdmin({ email, password });
    if (response?.data?.token && response?.data?.user) {
      const receivedToken = response.data.token;
      const receivedUser = response.data.user;

      setStoredToken(receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return response;
    }
    throw new Error('Invalid login response from server');
  }, []);

  // Customer Registration
  const registerCustomer = useCallback(async ({ name, email, password, phone }) => {
    const response = await authService.registerCustomer({ name, email, password, phone });
    if (response?.data?.token && response?.data?.user) {
      const receivedToken = response.data.token;
      const receivedUser = response.data.user;

      setStoredToken(receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return response;
    }
    throw new Error('Invalid registration response from server');
  }, []);

  // Profile Update
  const updateProfile = useCallback(async ({ name, phone }) => {
    const response = await authService.updateProfile({ name, phone });
    if (response?.data) {
      setUser((prev) => ({
        ...prev,
        ...response.data,
      }));
      return response;
    }
    throw new Error('Invalid profile update response from server');
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Backend logout notification skipped/failed:', e.message);
    } finally {
      removeStoredToken();
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isAdmin: Boolean(user && user.role === 'ADMIN'),
    isCustomer: Boolean(user && user.role === 'CUSTOMER'),
    loading,
    loginCustomer,
    loginAdmin,
    login: loginCustomer, // backward compatibility default
    registerCustomer,
    updateProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
