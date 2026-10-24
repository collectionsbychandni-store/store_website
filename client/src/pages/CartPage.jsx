import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import { useCart } from '../context/CartContext';
import {
  ShoppingBag,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Info,
  X,
  ArrowRight,
} from 'lucide-react';

/**
 * Customer Shopping Cart Page for Collections by Chandni
 *
 * Implements Step 12:
 * - Real backend cart data for authenticated & guest users
 * - Authoritative pricing & live subtotal recalculation
 * - Per-variant row representation (Product + Size + Color + SKU)
 * - Interactive quantity adjustments bounded by authoritative stock
 * - Inline warnings for price changes, out-of-stock items, and inactive products
 * - Clear cart with confirmation
 * - Luxury Indian boutique aesthetic matching Collections by Chandni
 */
export default function CartPage() {
  const { cart, loading, mutating, error, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  // State for clear cart confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // State for checkout preview modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  // Row-level mutation loading tracking
  const [updatingItemId, setUpdatingItemId] = useState(null);
  // Feedback notification
  const [feedback, setFeedback] = useState(null);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const totalQuantity = cart?.totalQuantity || 0;
  const hasUnavailableItems = cart?.hasUnavailableItems || false;
  const hasStockIssues = cart?.hasStockIssues || false;
  const canCheckout = items.length > 0 && !hasUnavailableItems && !hasStockIssues;

  // Handle quantity modification
  const handleQuantityChange = async (item, newQty) => {
    if (newQty < 1 || newQty > item.stock || mutating) return;
    setUpdatingItemId(item.id);
    setFeedback(null);
    try {
      await updateQuantity(item.id, newQty);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to update item quantity',
      });
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Handle item removal
  const handleRemove = async (item) => {
    if (mutating) return;
    setUpdatingItemId(item.id);
    setFeedback(null);
    try {
      await removeFromCart(item.id);
      setFeedback({
        type: 'success',
        message: `Removed "${item.productTitle}" from your bag.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to remove item',
      });
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    setShowClearConfirm(false);
    setFeedback(null);
    try {
      await clearCart();
      setFeedback({
        type: 'success',
        message: 'Your shopping bag has been cleared.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to clear bag',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 1. LOADING STATE
  // ---------------------------------------------------------------------------
  if (loading && items.length === 0) {
    return (
      <div className="min-h-[60vh] bg-[#FAF9F5] py-20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#781D42]/20 border-t-[#781D42] rounded-full animate-spin" />
          <p className="font-serif text-stone-700 text-sm tracking-wide">
            Retrieving your bespoke shopping bag...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. EMPTY CART STATE
  // ---------------------------------------------------------------------------
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#FAF9F5] py-16 sm:py-24 flex items-center">
        <Container size="narrow">
          <div className="max-w-lg mx-auto text-center bg-white p-8 sm:p-14 border border-stone-200/90 rounded-sm shadow-xs space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full border border-stone-300 flex items-center justify-center bg-[#FAF9F5] text-[#781D42]">
              <ShoppingBag size={28} strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block">
                Collections by Chandni
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900">
                Your Shopping Bag is Empty
              </h1>
              <p className="text-stone-600 text-sm font-light leading-relaxed max-w-sm mx-auto">
                Discover our artisanal collection of handcrafted Indian ethnic wear, festive kurtis, and royal jewellery.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/shop"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#781D42] hover:bg-[#5B1123] text-white text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors inline-flex items-center justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
              >
                <span>Explore The Collection</span>
                <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="pt-4 border-t border-stone-200/80 flex items-center justify-center gap-6 text-[11px] text-stone-500 uppercase tracking-wider font-light">
              <span>Authentic Couture</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span>Express Delivery</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span>7-Day Exchange</span>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. MAIN CART VIEW WITH ACTIVE ITEMS
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-[#FAF9F5] min-h-screen pb-20">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="border-b border-stone-200/60 bg-[#FDFCF7]/80 py-3.5">
        <Container>
          <ol className="flex items-center flex-wrap gap-2 text-xs text-stone-500 font-sans tracking-wide">
            <li>
              <Link to="/" className="hover:text-[#781D42] transition-colors font-medium">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-300">
              <ChevronRight size={13} />
            </li>
            <li>
              <Link to="/shop" className="hover:text-[#781D42] transition-colors font-medium">
                Shop
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-300">
              <ChevronRight size={13} />
            </li>
            <li className="text-stone-800 font-medium">Shopping Bag</li>
          </ol>
        </Container>
      </nav>

      {/* Main Content Area */}
      <section className="pt-8 sm:pt-12">
        <Container>
          {/* Header Title & Item Count */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-stone-200/90 gap-4 mb-8">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                Curated Selection
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-stone-950">
                Shopping Bag
              </h1>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-stone-600 font-medium font-sans">
                {totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'} in your bag
              </span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-stone-500 hover:text-rose-700 transition-colors uppercase tracking-wider text-[11px] font-semibold underline underline-offset-4"
              >
                Clear Bag
              </button>
            </div>
          </div>

          {/* Feedback & Error Alerts */}
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-xs border text-xs flex items-center justify-between ${
                feedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="p-1 hover:opacity-75"
                aria-label="Dismiss alert"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Global Warnings Banner for unavailable or low stock items */}
          {(hasUnavailableItems || hasStockIssues) && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-700" />
              <div>
                <span className="font-semibold block uppercase tracking-wider text-[11px]">
                  Bag Requires Attention
                </span>
                <p className="font-light mt-0.5">
                  Some items in your bag have become unavailable or exceed our current atelier stock. Please adjust quantities or remove unavailable pieces to proceed to checkout.
                </p>
              </div>
            </div>
          )}

          {/* Layout Grid: Items Table (8 cols) + Order Summary (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* ============================================================ */}
            {/* LEFT: CART ITEMS LIST                                        */}
            {/* ============================================================ */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white border border-stone-200/90 rounded-sm divide-y divide-stone-200/80 shadow-xs">
                {items.map((item) => {
                  const isRowUpdating = updatingItemId === item.id;
                  const itemLink = item.productSlug
                    ? `/product/${item.productSlug}`
                    : item.productId
                    ? `/product/${item.productId}`
                    : '/shop';

                  return (
                    <article
                      key={item.id}
                      className={`p-4 sm:p-6 transition-colors ${
                        item.isUnavailable || item.isOutOfStock
                          ? 'bg-stone-50/80'
                          : 'hover:bg-[#FAF9F5]/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        {/* Product Thumbnail Frame */}
                        <div className="relative w-20 h-28 sm:w-24 sm:h-32 bg-[#F3EFE6] rounded-xs overflow-hidden shrink-0 border border-stone-200/90">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productTitle}
                              className="w-full h-full object-cover object-top"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <ShoppingBag size={20} strokeWidth={1.5} />
                            </div>
                          )}

                          {item.isOutOfStock && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-1 text-center">
                              <span className="text-[10px] text-white font-semibold uppercase tracking-wider">
                                Sold Out
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 flex flex-col justify-between space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[11px] uppercase tracking-widest text-[#781D42] font-semibold block">
                                  {item.categoryName || item.brand}
                                </span>
                                <h3 className="font-serif text-base sm:text-lg font-semibold text-stone-900 leading-snug">
                                  <Link to={itemLink} className="hover:text-[#781D42] transition-colors">
                                    {item.productTitle}
                                  </Link>
                                </h3>
                              </div>

                              {/* Desktop Line Subtotal */}
                              <div className="text-right hidden sm:block shrink-0">
                                <span className="text-base font-semibold text-stone-950 font-sans tabular-nums block">
                                  ₹{item.lineSubtotal.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] text-stone-500 font-sans tabular-nums">
                                  ₹{item.unitPrice.toLocaleString('en-IN')} each
                                </span>
                              </div>
                            </div>

                            {/* Variant Attributes: Size, Color, SKU */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 font-sans pt-1">
                              <span className="bg-[#FAF4EB] border border-[#E6D7C3] px-2 py-0.5 rounded-xs font-medium text-stone-800">
                                Size: <strong className="text-stone-900">{item.size}</strong>
                              </span>
                              <span className="bg-[#FAF4EB] border border-[#E6D7C3] px-2 py-0.5 rounded-xs font-medium text-stone-800">
                                Color: <strong className="text-stone-900">{item.color}</strong>
                              </span>
                              {item.sku && (
                                <span className="text-[11px] text-stone-400 font-mono">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </div>

                            {/* Warnings per Item */}
                            {item.isUnavailable && (
                              <div className="pt-1.5 flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                                <AlertCircle size={14} />
                                <span>This ensemble is currently unavailable or has been archived.</span>
                              </div>
                            )}

                            {item.isOutOfStock && !item.isUnavailable && (
                              <div className="pt-1.5 flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                                <AlertCircle size={14} />
                                <span>This variant is currently out of stock.</span>
                              </div>
                            )}

                            {item.insufficientStock && !item.isOutOfStock && (
                              <div className="pt-1.5 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                                <AlertTriangle size={14} />
                                <span>Only {item.stock} pieces currently available in stock.</span>
                              </div>
                            )}

                            {item.priceChanged && (
                              <div className="pt-1.5 flex items-center gap-1.5 text-xs text-[#781D42] font-medium bg-[#FAF4EB] px-2 py-1 rounded-xs border border-[#E6D7C3]">
                                <Info size={14} />
                                <span>
                                  Price updated from ₹{item.originalPrice?.toLocaleString('en-IN')} to ₹{item.unitPrice.toLocaleString('en-IN')} based on current atelier pricing.
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Mobile Price & Quantity Controls */}
                          <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-4">
                            {/* Quantity Adjuster */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-stone-500 uppercase tracking-wider font-medium">
                                Qty:
                              </span>
                              <div className="flex items-center border border-stone-300 rounded-xs bg-white">
                                <button
                                  type="button"
                                  disabled={item.quantity <= 1 || isRowUpdating || item.isOutOfStock}
                                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                  className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                                  aria-label="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-sans text-xs font-semibold tabular-nums text-stone-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={
                                    item.quantity >= item.stock ||
                                    isRowUpdating ||
                                    item.isOutOfStock ||
                                    item.stock <= 0
                                  }
                                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                  className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                              {isRowUpdating && (
                                <span className="text-[11px] text-stone-400 italic">Updating...</span>
                              )}
                            </div>

                            {/* Mobile Price Subtotal */}
                            <div className="sm:hidden text-right">
                              <span className="text-sm font-semibold text-stone-950 tabular-nums">
                                ₹{item.lineSubtotal.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Remove Action Button */}
                            <button
                              type="button"
                              onClick={() => handleRemove(item)}
                              disabled={isRowUpdating}
                              className="text-xs text-stone-400 hover:text-rose-700 transition-colors inline-flex items-center gap-1 p-1"
                              aria-label={`Remove ${item.productTitle}`}
                            >
                              <Trash2 size={14} />
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Continue Shopping Link */}
              <div className="pt-2">
                <Link
                  to="/shop"
                  className="text-xs uppercase tracking-widest text-stone-700 hover:text-[#781D42] font-semibold inline-flex items-center group transition-colors"
                >
                  <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                  <span>Continue Shopping Collection</span>
                </Link>
              </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT: ORDER SUMMARY CARD (4 cols)                          */}
            {/* ============================================================ */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-white border border-stone-200/90 rounded-sm p-6 space-y-6 shadow-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#781D42] font-semibold block mb-1">
                    Order Details
                  </span>
                  <h2 className="font-serif text-xl font-semibold text-stone-900">
                    Order Summary
                  </h2>
                </div>

                {/* Subtotal Calculations */}
                <div className="space-y-3 text-xs pt-2 border-t border-stone-200/80">
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Bag Subtotal ({totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'})</span>
                    <span className="font-semibold text-stone-900 font-sans tabular-nums text-sm">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-stone-500">
                    <span>Estimated Shipping</span>
                    <span className="text-emerald-800 font-medium">Complimentary</span>
                  </div>

                  <div className="flex justify-between items-center text-stone-500">
                    <span>Taxes</span>
                    <span>Included</span>
                  </div>
                </div>

                {/* Total Line */}
                <div className="pt-4 border-t border-stone-200/80 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-semibold text-stone-900 block">Total Amount</span>
                    <span className="text-[10px] text-stone-500 font-light">Calculated in Indian Rupees (INR)</span>
                  </div>
                  <span className="font-serif text-2xl font-semibold text-stone-950 tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Checkout Progression Action */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={!canCheckout}
                    onClick={() => navigate('/checkout')}
                    className="w-full py-4 px-6 bg-[#781D42] text-white hover:bg-[#5B1123] disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  {!canCheckout && (
                    <p className="text-[11px] text-rose-700 text-center font-light leading-snug">
                      Please adjust or remove out-of-stock items before checkout can proceed.
                    </p>
                  )}
                </div>

                {/* Trust Highlights */}
                <div className="pt-4 border-t border-stone-200/80 space-y-2.5 text-[11px] text-stone-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#781D42] shrink-0" />
                    <span>100% Authentic Indian Artisan Couture</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-[#781D42] shrink-0" />
                    <span>Insured Transit & Tamper-Proof Packaging</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw size={14} className="text-[#781D42] shrink-0" />
                    <span>7-Day Easy Size & Alteration Assistance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CLEAR BAG CONFIRMATION MODAL                                       */}
      {/* ------------------------------------------------------------------ */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-white max-w-sm w-full p-6 sm:p-8 rounded-sm shadow-xl border border-stone-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Clear Shopping Bag?
              </h3>
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                Are you sure you want to remove all {totalQuantity} items from your shopping bag? This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 px-4 border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearCart}
                className="py-2.5 px-4 bg-rose-700 text-white hover:bg-rose-800 text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CHECKOUT COMING SOON MODAL (Step 12 Specification)                */}
      {/* ------------------------------------------------------------------ */}
      {showCheckoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div
            className="bg-white max-w-md w-full p-6 sm:p-8 rounded-sm shadow-xl border border-stone-200 space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center mx-auto">
              <Sparkles size={24} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#781D42] font-semibold block">
                Collections by Chandni
              </span>
              <h3 className="font-serif text-2xl font-semibold text-stone-900">
                Checkout Coming Soon
              </h3>
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                Your bespoke shopping bag with {totalQuantity} pieces totaling ₹{subtotal.toLocaleString('en-IN')} has been safely saved in your session. Secure payment gateway and order placement will arrive in Step 13.
              </p>
            </div>

            <div className="p-3 bg-[#FAF9F5] border border-stone-200 rounded-xs text-xs text-stone-700 font-mono">
              Cart Session: {cart.guestId ? `Guest · ${cart.guestId.slice(0, 18)}...` : 'Customer Account'}
            </div>

            <button
              type="button"
              onClick={() => setShowCheckoutModal(false)}
              className="w-full py-3 bg-[#781D42] text-white hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
