import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as cartService from '../services/cartService';

const CartContext = createContext(null);

/**
 * CartProvider handles persistent cart state across the entire storefront
 */
export function CartProvider({ children }) {
  const [cart, setCart] = useState({
    id: null,
    items: [],
    subtotal: 0,
    totalQuantity: 0,
    totalItems: 0,
    hasUnavailableItems: false,
    hasStockIssues: false,
  });
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart on initial load
  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await cartService.getCart();
      if (res?.data) {
        setCart(res.data);
      }
    } catch (err) {
      console.warn('Failed to load cart:', err);
      setError(err.message || 'Unable to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Add item to cart
  const addToCart = useCallback(async (productId, variantId, quantity = 1) => {
    setMutating(true);
    setError(null);
    try {
      const res = await cartService.addCartItem({ productId, variantId, quantity });
      if (res?.data) {
        setCart(res.data);
      }
      return { success: true, message: res?.message || 'Item added to bag', data: res?.data };
    } catch (err) {
      const msg = err.message || 'Failed to add item to bag';
      setError(msg);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId, quantity) => {
    setMutating(true);
    setError(null);
    try {
      const res = await cartService.updateCartItem(itemId, quantity);
      if (res?.data) {
        setCart(res.data);
      }
      return { success: true, message: res?.message || 'Bag updated', data: res?.data };
    } catch (err) {
      const msg = err.message || 'Failed to update item quantity';
      setError(msg);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  // Remove item
  const removeFromCart = useCallback(async (itemId) => {
    setMutating(true);
    setError(null);
    try {
      const res = await cartService.removeCartItem(itemId);
      if (res?.data) {
        setCart(res.data);
      }
      return { success: true, message: res?.message || 'Item removed', data: res?.data };
    } catch (err) {
      const msg = err.message || 'Failed to remove item';
      setError(msg);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  // Clear cart
  const clearCart = useCallback(async () => {
    setMutating(true);
    setError(null);
    try {
      const res = await cartService.clearCart();
      if (res?.data) {
        setCart(res.data);
      }
      return { success: true, message: res?.message || 'Bag cleared', data: res?.data };
    } catch (err) {
      const msg = err.message || 'Failed to clear bag';
      setError(msg);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const totalItems = cart?.totalQuantity || 0;

  const value = {
    cart,
    loading,
    mutating,
    error,
    totalItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart: loadCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
