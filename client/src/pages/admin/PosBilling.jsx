import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import PosReceiptModal from '../../components/admin/PosReceiptModal';
import PosRecentBillsModal from '../../components/admin/PosRecentBillsModal';
import * as posService from '../../services/posService';
import * as categoryService from '../../services/categoryService';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Receipt,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Coins,
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  ShoppingBag,
  Layers,
  ArrowRight,
  Printer,
  ChevronRight,
  Tag,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

/**
 * Collections by Chandni - Point of Sale (POS) Billing Module
 * Route: /admin/pos
 * 
 * Implements Launch Step 27:
 * - Ultra-fast shop counter interface optimized for keyboard & touchscreen
 * - Product search by title, SKU, or barcode
 * - Category filter chips
 * - Variant selection (Size, Color, SKU, Stock)
 * - Real-time stock boundary enforcement
 * - Cart management with dynamic subtotal, custom discount, and GST tax computation
 * - Walk-in patron or registered customer search
 * - Offline payment recording: Cash (with auto change calculator), UPI, Card, Other
 * - Atomic inventory deduction & server-authoritative checkout
 * - Thermal 80mm & A4 print receipt modal
 * - Recent bills drawer for reprint & audit
 */

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'pos-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

export default function PosBilling() {
  const { user } = useAuth();

  // Master Data & Search
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [storeConfig, setStoreConfig] = useState(null);

  // Cart State
  const [cart, setCart] = useState([]);

  // Customer State
  const [customerMode, setCustomerMode] = useState('walkin'); // 'walkin' | 'registered'
  const [customerName, setCustomerName] = useState('Walk-in Patron');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Financial Breakdown & Modifiers
  const [discountType, setDiscountType] = useState('FIXED'); // 'FIXED' | 'PERCENTAGE'
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0); // 0, 5, 12, 18
  const [notes, setNotes] = useState('');

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'UPI' | 'CARD' | 'OTHER'
  const [cashTendered, setCashTendered] = useState('');
  const [offlineRef, setOfflineRef] = useState('');

  // Modals & History
  const [activeVariantProduct, setActiveVariantProduct] = useState(null);
  const [receiptBill, setReceiptBill] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState('');
  const [mobileTab, setMobileTab] = useState('catalog'); // 'catalog' | 'cart'

  // Search input ref for quick keyboard focus
  const searchInputRef = useRef(null);

  // Load Categories & Store Config
  useEffect(() => {
    async function init() {
      try {
        const [catsRes, cfgRes] = await Promise.all([
          categoryService.getCategories().catch(() => ({ data: [] })),
          posService.getPosConfig().catch(() => ({ data: null })),
        ]);
        if (catsRes?.data) setCategories(catsRes.data);
        if (cfgRes?.data) setStoreConfig(cfgRes.data);
      } catch (err) {
        console.error('Failed to initialize POS master data:', err);
      }
    }
    init();
  }, []);

  // Fetch / Search Products
  const fetchProducts = useCallback(async (search = '', categoryId = '') => {
    setLoadingProducts(true);
    try {
      const res = await posService.searchPosProducts({
        search,
        categoryId,
        inStockOnly: false,
      });
      const prods = res?.products || res?.data || (Array.isArray(res) ? res : []);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to fetch POS products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchTerm, selectedCategory);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, fetchProducts]);

  // Customer Search Debounce
  useEffect(() => {
    if (customerMode !== 'registered' || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const res = await posService.searchPosCustomers(customerQuery);
        const custs = res?.customers || res?.data || (Array.isArray(res) ? res : []);
        setCustomerResults(custs);
      } catch (err) {
        console.error('Customer search failed:', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery, customerMode]);

  // Keyboard Shortcuts (F2 / Slash = focus search, F9 = trigger checkout, Escape = clear/close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if writing inside inputs or textareas unless it's F-keys
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === 'Escape') {
        if (activeVariantProduct) setActiveVariantProduct(null);
        if (isReceiptOpen) setIsReceiptOpen(false);
        if (isHistoryOpen) setIsHistoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Add Item to Cart
  const addItemToCart = (product, variant) => {
    setCheckoutError('');
    const availableStock = Number(
      variant.stockQuantity !== undefined ? variant.stockQuantity : (variant.stock ?? 0)
    );

    if (availableStock <= 0) {
      setCheckoutError(`"${product.title} (${variant.size || variant.color || 'Standard'})" is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.variantId === variant.id);
      if (existingIdx > -1) {
        const existing = prev[existingIdx];
        if (existing.quantity >= availableStock) {
          setCheckoutError(`Cannot add more. Available stock for this variant is ${availableStock}.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          quantity: existing.quantity + 1,
        };
        return updated;
      }

      const newItem = {
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        sku: variant.sku || product.sku || 'N/A',
        size: variant.size || '',
        color: variant.color || '',
        price: Number(variant.sellingPrice || variant.price || product.price || 0),
        mrp: Number(variant.mrp || product.mrp || 0),
        image: variant.image || product.primaryImage || product.imageUrl || '/placeholder-product.png',
        availableStock,
        quantity: 1,
      };

      return [...prev, newItem];
    });

    if (activeVariantProduct) {
      setActiveVariantProduct(null);
    }
  };

  // Update Cart Item Quantity
  const updateQuantity = (variantId, newQty) => {
    setCheckoutError('');
    if (newQty <= 0) {
      removeFromCart(variantId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          if (newQty > item.availableStock) {
            setCheckoutError(`Only ${item.availableStock} units available in stock.`);
            return { ...item, quantity: item.availableStock };
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Remove Item from Cart
  const removeFromCart = (variantId) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  // Clear Entire Cart
  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountValue(0);
    setCashTendered('');
    setOfflineRef('');
    setNotes('');
    setCheckoutError('');
  };

  // Click on product card
  const handleProductClick = (product) => {
    if (!product.variants || product.variants.length === 0) {
      setCheckoutError(`Product "${product.title}" has no variants configured.`);
      return;
    }

    if (product.variants.length === 1) {
      addItemToCart(product, product.variants[0]);
    } else {
      setActiveVariantProduct(product);
    }
  };

  // Customer Selection
  const selectRegisteredCustomer = (cust) => {
    setSelectedCustomer(cust);
    setCustomerName(`${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Patron');
    setCustomerPhone(cust.phone || '');
    setCustomerEmail(cust.email || '');
    setCustomerResults([]);
    setCustomerQuery('');
  };

  const resetToWalkin = () => {
    setCustomerMode('walkin');
    setSelectedCustomer(null);
    setCustomerName('Walk-in Patron');
    setCustomerPhone('');
    setCustomerEmail('');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (discountType === 'PERCENTAGE') {
      const pct = Math.min(Math.max(val, 0), 100);
      return Math.round(((subtotal * pct) / 100) * 100) / 100;
    }
    return Math.min(Math.max(val, 0), subtotal);
  }, [subtotal, discountValue, discountType]);

  const netAfterDiscount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) return 0;
    return Math.round(((netAfterDiscount * rate) / 100) * 100) / 100;
  }, [netAfterDiscount, taxRate]);

  const grandTotal = Math.round((netAfterDiscount + taxAmount) * 100) / 100;

  // Cash Tendered & Change Calculations
  const numericTendered = Number(cashTendered) || 0;
  const changeDue = numericTendered > 0 ? Math.max(0, numericTendered - grandTotal) : 0;
  const tenderShortfall = numericTendered > 0 && numericTendered < grandTotal ? grandTotal - numericTendered : 0;

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError('Cannot complete checkout with an empty cart.');
      return;
    }

    if (paymentMethod === 'CASH') {
      if (numericTendered < grandTotal && numericTendered > 0) {
        setCheckoutError(`Cash tendered is insufficient (Short by ₹${tenderShortfall.toFixed(2)}).`);
        return;
      }
    }

    setSubmittingSale(true);
    setCheckoutError('');
    setCheckoutSuccess('');

    try {
      const salePayload = {
        items: cart.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        customer: {
          id: selectedCustomer ? selectedCustomer.id : undefined,
          name: customerName.trim() || 'Walk-in Patron',
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
        },
        paymentMethod,
        discountType,
        discountValue: Number(discountValue) || 0,
        taxRate: Number(taxRate) || 0,
        cashTendered: paymentMethod === 'CASH' ? (numericTendered || grandTotal) : undefined,
        notes: [notes.trim(), offlineRef.trim() ? `[Offline Ref: ${offlineRef.trim()}]` : '']
          .filter(Boolean)
          .join(' | '),
        idempotencyKey: generateUUID(),
      };

      const res = await posService.createPosSale(salePayload);
      const createdBill = res?.order || res?.data?.order || res?.data;

      if (res?.success && createdBill) {
        setCheckoutSuccess(`Sale completed! Invoice #${createdBill.orderNumber}`);
        setReceiptBill(createdBill);
        setIsReceiptOpen(true);

        // Reset Cart and Form
        setCart([]);
        setDiscountValue(0);
        setCashTendered('');
        setOfflineRef('');
        setNotes('');
        resetToWalkin();

        // Refresh products stock in background
        fetchProducts(searchTerm, selectedCategory);
      } else {
        setCheckoutError(res?.message || 'Failed to complete POS sale.');
      }
    } catch (err) {
      console.error('POS Checkout error:', err);
      setCheckoutError(err?.message || 'An unexpected error occurred during checkout.');
    } finally {
      setSubmittingSale(false);
    }
  };

  return (
    <AdminLayout noPadding={true}>
      <div className="flex flex-col h-[calc(100dvh-5rem)] min-h-0 bg-stone-100 text-stone-900 overflow-hidden relative">
        {/* POS Top Bar */}
        <header className="bg-white border-b border-stone-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <img
              src="/assets/aistudio/logo_454bd7ce.png"
              alt="Collections by Chandni"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0 drop-shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 tracking-tight truncate">
                  POS Counter
                </h1>
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 sm:mr-1.5 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block truncate">
                Cashier: <strong className="text-stone-700">{user?.name || user?.email || 'Admin'}</strong> • Collections by Chandni
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Keyboard shortcut legend button (desktop only) */}
            <div className="hidden xl:flex items-center space-x-2 text-xs text-stone-500 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-md">
              <span><kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-[10px] font-mono">F2</kbd> Search</span>
              <span>•</span>
              <span><kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-[10px] font-mono">F9</kbd> Pay</span>
              <span>•</span>
              <span><kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-[10px] font-mono">Esc</kbd> Close</span>
            </div>

            {/* Recent bills history button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center px-2.5 sm:px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 transition-colors shadow-xs"
              title="View and reprint past in-store sales"
            >
              <Clock className="w-3.5 h-3.5 sm:mr-1.5 text-stone-500" />
              <span className="hidden sm:inline">Recent Bills</span>
            </button>

            {/* Refresh catalog button */}
            <button
              onClick={() => fetchProducts(searchTerm, selectedCategory)}
              disabled={loadingProducts}
              className="p-1.5 text-stone-500 hover:text-stone-800 rounded-md hover:bg-stone-100 transition-colors"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-4 h-4 ${loadingProducts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Mobile Viewport Segmented Tab Switcher (< lg) */}
        <div className="lg:hidden bg-stone-100 px-3 py-2 border-b border-stone-200 shrink-0">
          <div className="grid grid-cols-2 gap-2 bg-stone-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                mobileTab === 'catalog'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Catalog ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                mobileTab === 'cart'
                  ? 'bg-amber-950 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Cart & Pay</span>
              {cart.length > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    mobileTab === 'cart'
                      ? 'bg-amber-100 text-amber-950'
                      : 'bg-amber-900 text-white'
                  }`}
                >
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Alerts */}
        {checkoutError && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-800 animate-fadeIn shrink-0">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{checkoutError}</span>
            </div>
            <button
              onClick={() => setCheckoutError('')}
              className="text-rose-500 hover:text-rose-800 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {checkoutSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 animate-fadeIn shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{checkoutSuccess}</span>
            </div>
            <button
              onClick={() => setCheckoutSuccess('')}
              className="text-emerald-500 hover:text-emerald-800 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Work Area: 2 Columns */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
          {/* Left Column: Catalog Browser & Search */}
          <div
            className={`flex-1 flex-col min-w-0 border-r border-stone-200 bg-stone-50 overflow-hidden min-h-0 relative ${
              mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Search & Filter Header */}
            <div className="p-3 bg-white border-b border-stone-200 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode, enter SKU, or search bridal attire... (Press F2 or /)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === ''
                      ? 'bg-amber-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-amber-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-3 pb-24 lg:pb-3">
              {loadingProducts ? (
                <div className="h-64 flex flex-col items-center justify-center text-stone-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-900" />
                  <p className="text-xs">Searching inventory...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-center p-4">
                  <ShoppingBag className="w-10 h-10 stroke-[1.2] text-stone-300 mb-2" />
                  <p className="text-sm font-medium text-stone-600">No items match your query</p>
                  <p className="text-xs text-stone-400 max-w-xs mt-1">
                    Try searching by another term, clearing the category filter, or scanning a barcode.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                  {products.map((product) => {
                    const totalStock = Number(
                      product.totalStock !== undefined
                        ? product.totalStock
                        : product.variants?.reduce(
                            (sum, v) =>
                              sum +
                              Number(
                                v.stockQuantity !== undefined ? v.stockQuantity : (v.stock ?? 0)
                              ),
                            0
                          ) ?? 0
                    );
                    const isOutOfStock = totalStock <= 0;
                    const variantCount = product.variants?.length || 0;
                    const minPrice = product.variants?.reduce(
                      (min, v) => Math.min(min, Number(v.sellingPrice || v.price || 0)),
                      Infinity
                    );
                    const displayPrice = isFinite(minPrice) ? minPrice : (product.price || 0);

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className={`group relative bg-white border rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col cursor-pointer text-left ${
                          isOutOfStock
                            ? 'border-stone-200 opacity-60 bg-stone-50'
                            : 'border-stone-200 hover:border-amber-900/50'
                        }`}
                      >
                        {/* Image Thumbnail */}
                        <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                          <img
                            src={product.primaryImage || product.imageUrl || '/placeholder-product.png'}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/400x500/f5f5f4/78716c?text=Chandni';
                            }}
                          />
                          {/* Stock badge */}
                          <div className="absolute top-2 right-2">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-600 text-white shadow-xs">
                                Sold Out
                              </span>
                            ) : totalStock <= 3 ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500 text-white shadow-xs">
                                {totalStock} left
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-black/50 text-white backdrop-blur-xs">
                                {totalStock} in stock
                              </span>
                            )}
                          </div>

                          {variantCount > 1 && (
                            <div className="absolute bottom-2 left-2">
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-white/90 text-stone-800 shadow-xs backdrop-blur-xs">
                                {variantCount} variants
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title & Price */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-[11px] font-medium text-amber-900 line-clamp-1">
                              {product.category?.name || product.categoryName || 'Couture'}
                            </p>
                            <h3 className="text-xs font-semibold text-stone-900 line-clamp-2 mt-0.5">
                              {product.title}
                            </h3>
                          </div>

                          <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-900">
                              ₹{Number(displayPrice).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-stone-400 group-hover:text-amber-900 font-medium flex items-center">
                              Add <ChevronRight className="w-3 h-3 ml-0.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mobile Floating Cart Summary Button */}
            {cart.length > 0 && (
              <div className="lg:hidden absolute bottom-3 left-3 right-3 z-30 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setMobileTab('cart')}
                  className="w-full bg-amber-950 hover:bg-amber-900 text-white py-3 px-4 rounded-xl shadow-2xl flex items-center justify-between border border-amber-800/80 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-800 text-amber-100 flex items-center justify-center font-bold text-xs">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold leading-tight">View Current Order</p>
                      <p className="text-[10px] text-amber-200/90 leading-tight">
                        {cart.length} item line{cart.length > 1 ? 's' : ''} in cart
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 font-serif text-sm font-bold">
                    <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Active Cart & Checkout Station */}
          <div
            className={`w-full lg:w-[460px] xl:w-[500px] flex-col bg-white shrink-0 shadow-lg z-10 overflow-hidden min-h-0 ${
              mobileTab === 'cart' ? 'flex flex-1' : 'hidden lg:flex'
            }`}
          >
            {/* Cart Header */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50/80 shrink-0">
              <div className="flex items-center space-x-2">
                {/* On mobile: Quick back button to return to catalog */}
                <button
                  type="button"
                  onClick={() => setMobileTab('catalog')}
                  className="lg:hidden p-1.5 -ml-1 text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-200/60 transition-colors"
                  title="Back to Catalog"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <ShoppingBag className="w-4 h-4 text-amber-900" />
                <h2 className="text-sm font-semibold text-stone-900">Current Order</h2>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('catalog')}
                  className="lg:hidden text-xs text-amber-900 font-semibold hover:underline"
                >
                  + Add Items
                </button>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Center Viewport for Patron, Items, Modifiers & Payment */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3.5">
              {/* Patron / Customer Selector Section */}
              <div className="p-3 border border-stone-200 rounded-xl bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-700 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-stone-500" />
                    Customer / Patron
                  </span>
                  <div className="flex rounded-md shadow-2xs text-[11px] font-medium overflow-hidden border border-stone-300">
                    <button
                      type="button"
                      onClick={resetToWalkin}
                      className={`px-2.5 py-0.5 transition-colors ${
                        customerMode === 'walkin'
                          ? 'bg-amber-900 text-white'
                          : 'bg-white text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Walk-in
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMode('registered')}
                      className={`px-2.5 py-0.5 transition-colors ${
                        customerMode === 'registered'
                          ? 'bg-amber-900 text-white'
                          : 'bg-white text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Search
                    </button>
                  </div>
                </div>

                {customerMode === 'walkin' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Patron Name (Optional)"
                      value={customerName === 'Walk-in Patron' ? '' : customerName}
                      onChange={(e) => setCustomerName(e.target.value || 'Walk-in Patron')}
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-900"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (for receipt/SMS)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-900"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    {selectedCustomer ? (
                      <div className="p-2 bg-amber-50/60 border border-amber-200 rounded-md flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-stone-900">{customerName}</p>
                          <p className="text-[11px] text-stone-600">
                            {customerPhone} {customerEmail && `• ${customerEmail}`}
                          </p>
                        </div>
                        <button
                          onClick={resetToWalkin}
                          className="text-stone-400 hover:text-stone-600 p-1"
                          title="Remove customer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search patrons by phone, name, email..."
                            value={customerQuery}
                            onChange={(e) => setCustomerQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-900"
                          />
                          {searchingCustomers && (
                            <RefreshCw className="w-3.5 h-3.5 text-stone-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                          )}
                        </div>

                        {customerResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
                            {customerResults.map((cust) => (
                              <button
                                key={cust.id}
                                onClick={() => selectRegisteredCustomer(cust)}
                                className="w-full px-3 py-2 text-left hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-stone-800">
                                    {cust.firstName} {cust.lastName}
                                  </p>
                                  <p className="text-[11px] text-stone-500">
                                    {cust.phone || 'No phone'} • {cust.email}
                                  </p>
                                </div>
                                <span className="text-[10px] text-amber-900 font-semibold uppercase">
                                  Select
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Selected Items ({cart.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileTab('catalog')}
                    className="lg:hidden text-[11px] text-amber-900 font-semibold hover:underline"
                  >
                    + Browse Catalog
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 px-4 bg-stone-50 rounded-xl border border-stone-200 text-stone-400 text-center space-y-2">
                    <ShoppingBag className="w-8 h-8 stroke-[1.2] text-stone-300 mx-auto" />
                    <p className="text-xs font-medium text-stone-700">No items in cart</p>
                    <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                      Choose boutique apparel, kurtis, or jewellery from the catalog to begin billing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMobileTab('catalog')}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-amber-950 text-white rounded-lg shadow-xs hover:bg-amber-900 transition-colors mt-2"
                    >
                      Browse Catalog
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.variantId}
                      className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-11 h-11 object-cover rounded-lg border border-stone-200 shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/100x100/f5f5f4/78716c?text=Item';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-stone-900 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-0.5">
                            {(item.size || item.color) && (
                              <span className="font-medium text-stone-700">
                                {[item.size, item.color].filter(Boolean).join(' / ')}
                              </span>
                            )}
                            <span className="text-[10px] text-stone-400">SKU: {item.sku}</span>
                          </div>
                          <div className="text-xs font-bold text-stone-900 mt-0.5">
                            ₹{item.price.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <div className="flex items-center border border-stone-300 rounded-md bg-white shadow-2xs overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.availableStock}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.variantId, parseInt(e.target.value) || 1)
                            }
                            className="w-8 h-7 text-center text-xs font-semibold border-x border-stone-300 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            disabled={item.quantity >= item.availableStock}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="w-16 text-right">
                          <p className="text-xs font-bold text-stone-900">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </p>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Calculations, Discount & Tax Section */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Discount Input */}
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-stone-700 flex items-center">
                        <Percent className="w-3 h-3 mr-1 text-amber-800" />
                        Discount
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDiscountType((prev) => (prev === 'FIXED' ? 'PERCENTAGE' : 'FIXED'))
                        }
                        className="text-[10px] text-amber-900 font-bold uppercase hover:underline"
                      >
                        {discountType === 'FIXED' ? 'Flat (₹)' : 'Percent (%)'}
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountValue || ''}
                      onChange={(e) =>
                        setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="w-full px-2.5 py-1 text-xs border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-900"
                    />
                  </div>

                  {/* Tax Rate (GST) Selection */}
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-stone-700 flex items-center">
                        <Tag className="w-3 h-3 mr-1 text-amber-800" />
                        Applicable GST
                      </span>
                      <span className="text-[10px] text-stone-500 font-semibold">{taxRate}%</span>
                    </div>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-stone-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-900"
                    >
                      <option value={0}>0% (Tax Exempt / Nil)</option>
                      <option value={5}>5% (Apparel ≤ ₹1,000)</option>
                      <option value={12}>12% (Luxury Coutures)</option>
                      <option value={18}>18% (Standard GST)</option>
                    </select>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="space-y-1 text-xs text-stone-600 pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-stone-900">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount {discountType === 'PERCENTAGE' ? `(${discountValue}%)` : ''}</span>
                      <span>-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({taxRate}%)</span>
                      <span>+₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-stone-900 border-t border-stone-200 pt-1.5">
                    <span>Grand Total</span>
                    <span className="text-amber-950 font-serif">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <p className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider">
                  Payment Method
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-1 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-amber-900 bg-amber-950 text-white shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-1" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2 px-1 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      paymentMethod === 'UPI'
                        ? 'border-amber-900 bg-amber-950 text-white shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 mb-1" />
                    UPI QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-2 px-1 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-amber-900 bg-amber-950 text-white shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1" />
                    Card POS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('OTHER')}
                    className={`py-2 px-1 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      paymentMethod === 'OTHER'
                        ? 'border-amber-900 bg-amber-950 text-white shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Coins className="w-4 h-4 mb-1" />
                    Other
                  </button>
                </div>

                {/* Dynamic Payment Details */}
                {paymentMethod === 'CASH' && (
                  <div className="mt-2 p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/80 space-y-1.5 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                      <span className="font-semibold text-stone-800">Cash Received:</span>
                      {changeDue > 0 && (
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                          Change Due: ₹{changeDue.toFixed(2)}
                        </span>
                      )}
                      {tenderShortfall > 0 && (
                        <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                          Short by: ₹{tenderShortfall.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-stone-500">₹</span>
                      <input
                        type="number"
                        placeholder={`Exact (₹${grandTotal})`}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 font-semibold"
                      />
                    </div>
                    {/* Quick Tender Currency Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setCashTendered(grandTotal.toString())}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded shadow-2xs"
                      >
                        Exact
                      </button>
                      {[500, 1000, 2000, 5000].map((denom) => (
                        <button
                          key={denom}
                          type="button"
                          onClick={() => setCashTendered(denom.toString())}
                          className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded shadow-2xs"
                        >
                          ₹{denom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(paymentMethod === 'UPI' ||
                  paymentMethod === 'CARD' ||
                  paymentMethod === 'OTHER') && (
                  <div className="mt-2 p-2.5 bg-stone-100 rounded-lg border border-stone-200 space-y-1 animate-fadeIn">
                    <label className="text-[11px] font-medium text-stone-700 block">
                      {paymentMethod === 'UPI' &&
                        'UPI Reference / UTR / Transaction ID (Optional):'}
                      {paymentMethod === 'CARD' &&
                        'Card Terminal Auth Code / Last 4 Digits (Optional):'}
                      {paymentMethod === 'OTHER' && 'Payment Verification Note:'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        paymentMethod === 'UPI'
                          ? 'e.g. UPI-984712039481'
                          : paymentMethod === 'CARD'
                          ? 'e.g. VISA 4821 / Auth 89412'
                          : 'e.g. Bank transfer reference'
                      }
                      value={offlineRef}
                      onChange={(e) => setOfflineRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-900"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Bottom Checkout CTA Section */}
            <div className="p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0 shadow-lg">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={submittingSale || cart.length === 0}
                className="w-full py-3 sm:py-3.5 bg-amber-950 hover:bg-amber-900 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 text-sm"
              >
                {submittingSale ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Sale & Deducting Stock...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>
                      Complete Sale & Print Bill (₹
                      {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                    </span>
                  </>
                )}
              </button>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full mt-2 py-1.5 text-xs text-stone-500 hover:text-rose-600 font-medium flex items-center justify-center space-x-1.5 hover:bg-rose-50/60 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Cart & Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Variant Selector Quick Modal */}
      {activeVariantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 animate-scaleUp">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base truncate">
                  Select Size & Color Variant
                </h3>
                <p className="text-xs text-stone-500 mt-0.5 truncate">{activeVariantProduct.title}</p>
              </div>
              <button
                onClick={() => setActiveVariantProduct(null)}
                className="text-stone-400 hover:text-stone-600 p-1 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-5 overflow-y-auto space-y-2 flex-1">
              {activeVariantProduct.variants?.map((v) => {
                const stock = Number(
                  v.stockQuantity !== undefined ? v.stockQuantity : (v.stock ?? 0)
                );
                const isOut = stock <= 0;
                const price = Number(
                  v.sellingPrice || v.price || activeVariantProduct.price || 0
                );

                return (
                  <div
                    key={v.id}
                    onClick={() => !isOut && addItemToCart(activeVariantProduct, v)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isOut
                        ? 'bg-stone-50 border-stone-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-stone-200 hover:border-amber-900 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 font-bold text-xs">
                        {v.size || 'STD'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-stone-900">
                            Size: {v.size || 'Free Size'}
                          </span>
                          {v.color && (
                            <span className="text-xs text-stone-600">• Color: {v.color}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400">SKU: {v.sku || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-stone-900">
                        ₹{price.toLocaleString('en-IN')}
                      </p>
                      <p
                        className={`text-[10px] font-semibold ${
                          isOut
                            ? 'text-rose-600'
                            : stock <= 3
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {isOut ? 'Out of stock' : `${stock} available`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 sm:px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveVariantProduct(null)}
                className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Receipt Modal (For Printing) */}
      <PosReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        bill={receiptBill}
        storeConfig={storeConfig}
        onNewSale={() => {
          setIsReceiptOpen(false);
          searchInputRef.current?.focus();
        }}
      />

      {/* POS Recent Bills Drawer (History & Reprint) */}
      <PosRecentBillsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectBillForReprint={(selectedBill) => {
          setReceiptBill(selectedBill);
          setIsHistoryOpen(false);
          setIsReceiptOpen(true);
        }}
      />
    </AdminLayout>
  );
}
