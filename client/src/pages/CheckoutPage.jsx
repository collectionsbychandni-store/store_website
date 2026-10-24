import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Container from '../components/Container';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import * as addressService from '../services/addressService';
import * as checkoutService from '../services/checkoutService';
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Plus,
  MapPin,
  Home,
  Briefcase,
  Navigation,
  Sparkles,
  ShoppingBag,
  Clock,
  RotateCcw,
  Check,
  X,
  CreditCard,
  Banknote,
} from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi NCR',
  'Jammu and Kashmir',
  'Ladakh',
  'Chandigarh',
];

/**
 * Customer Checkout Page (/checkout) for Collections by Chandni
 *
 * Implements Step 14:
 * - Authoritative cart and checkout validation
 * - Saved delivery address selection and inline creation
 * - Real itemized summary: primary image, title, variant, unit price, quantity, line total
 * - Complimentary Pan-India delivery breakdown
 * - Transactional order preparation with idempotency protection
 * - Real-time stock and price change warnings
 * - Post-order confirmation review screen
 */
export default function CheckoutPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { cart, loadCart, totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to login if patron is not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', {
        state: { from: { pathname: '/checkout' } },
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Checkout Validation & Summary State
  const [checkoutSummary, setCheckoutSummary] = useState(null);
  const [validating, setValidating] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Inline Add Address Form Toggle
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    country: 'India',
    addressType: 'HOME',
    isDefault: false,
  });
  const [newAddressErrors, setNewAddressErrors] = useState({});
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Order Placement State
  const [paymentMethod, setPaymentMethod] = useState('PAYU'); // 'PAYU' | 'COD'
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isRedirectingGateway, setIsRedirectingGateway] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Idempotency Key per checkout attempt
  const idempotencyKey = useMemo(() => {
    return `cbc-chk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, [confirmedOrder]);

  // Load Saved Addresses
  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingAddresses(true);
      const res = await addressService.getAddresses();
      if (res?.data) {
        setAddresses(res.data);
        // Pre-select default address or first address
        if (res.data.length > 0) {
          const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
          setSelectedAddressId((prev) => prev || defaultAddr.id);
        }
      }
    } catch (err) {
      console.warn('Error loading addresses for checkout:', err);
    } finally {
      setLoadingAddresses(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Validate Checkout authoritatively against backend
  const runCheckoutValidation = useCallback(async (addrId) => {
    if (!isAuthenticated) return;
    try {
      setValidating(true);
      setOrderError(null);
      const res = await checkoutService.getCheckoutSummary(addrId || undefined);
      if (res?.data) {
        setCheckoutSummary(res.data);
        setValidationErrors(res.data.errors || []);
        setValidationWarnings(res.data.warnings || []);
      }
    } catch (err) {
      setValidationErrors([err.message || 'Unable to authoritatively validate your bag']);
    } finally {
      setValidating(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      runCheckoutValidation(selectedAddressId);
    }
  }, [isAuthenticated, selectedAddressId, runCheckoutValidation]);

  // Handle inline address creation during checkout
  const handleSaveInlineAddress = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newAddress.name.trim()) errors.name = 'Recipient name is required';
    if (!newAddress.phone.trim()) errors.phone = 'Phone number is required';
    if (!newAddress.addressLine1.trim()) errors.addressLine1 = 'Street address is required';
    if (!newAddress.city.trim()) errors.city = 'City is required';
    if (!newAddress.state.trim()) errors.state = 'State is required';
    if (!/^[1-9][0-9]{5}$/.test(newAddress.pincode.trim())) {
      errors.pincode = 'Please enter a valid 6-digit Indian PIN code';
    }

    setNewAddressErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingAddress(true);
    try {
      const res = await addressService.createAddress(newAddress);
      if (res?.data) {
        await fetchAddresses();
        setSelectedAddressId(res.data.id);
        setShowAddAddressForm(false);
        setNewAddress({
          name: user?.name || '',
          phone: user?.phone || '',
          addressLine1: '',
          addressLine2: '',
          landmark: '',
          city: '',
          state: 'Maharashtra',
          pincode: '',
          country: 'India',
          addressType: 'HOME',
          isDefault: false,
        });
      }
    } catch (err) {
      setOrderError(err.message || 'Unable to save delivery address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Submit Order Preparation
  const handleConfirmOrder = async () => {
    if (!selectedAddressId || isSubmittingOrder) return;
    if (!paymentMethod) {
      setOrderError('Please select a payment method: Online Payment (PayU) or Cash on Delivery (COD).');
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      const res = await checkoutService.prepareOrder({
        addressId: selectedAddressId,
        idempotencyKey,
        paymentMethod,
      });

      if (res?.data) {
        // If Online Payment via PayU Hosted Checkout
        if (paymentMethod === 'PAYU' && res.payuParams) {
          setIsRedirectingGateway(true);
          if (loadCart) {
            loadCart();
          }

          // Dynamically construct and submit PayU form
          const params = res.payuParams;
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = params.actionUrl;
          form.style.display = 'none';

          Object.entries(params).forEach(([key, val]) => {
            if (key !== 'actionUrl' && val !== undefined && val !== null) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = String(val);
              form.appendChild(input);
            }
          });

          document.body.appendChild(form);
          form.submit();
          return;
        }

        // If Cash on Delivery (COD)
        setConfirmedOrder(res.data);
        if (loadCart) {
          loadCart();
        }
      }
    } catch (err) {
      setOrderError(err.message || 'Error processing your order');
      // Re-run validation to pick up any stock or pricing shifts
      runCheckoutValidation(selectedAddressId);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Helper for address type badge
  const renderTypeIcon = (type) => {
    switch (type) {
      case 'HOME':
        return <Home size={11} className="mr-1" />;
      case 'WORK':
        return <Briefcase size={11} className="mr-1" />;
      default:
        return <Navigation size={11} className="mr-1" />;
    }
  };

  // -------------------------------------------------------------------------
  // ORDER CONFIRMED VIEW
  // -------------------------------------------------------------------------
  if (confirmedOrder) {
    const orderItems = confirmedOrder.items || [];
    const shippingAddr = confirmedOrder.shippingAddress || {};

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-stone-900 py-12 sm:py-16">
        <Container>
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            {/* Header Success Banner */}
            <div className="bg-white border border-[#E6D7C3] p-8 sm:p-10 rounded-xs shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                  Collections by Chandni · Atelier Order
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-950">
                  {confirmedOrder.paymentMethod === 'COD'
                    ? 'Order Confirmed · Cash on Delivery'
                    : 'Order Successfully Prepared'}
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 font-light leading-relaxed max-w-md mx-auto">
                  {confirmedOrder.paymentMethod === 'COD'
                    ? <>Thank you, <span className="font-medium text-stone-900">{shippingAddr.name}</span>. Your bespoke order has been confirmed with Cash on Delivery. Our master craftsmen have allocated your pieces for dispatch.</>
                    : <>Thank you, <span className="font-medium text-stone-900">{shippingAddr.name}</span>. Your bespoke order has been registered in our atelier system.</>}
                </p>
              </div>

              <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 py-3 px-6 bg-[#FAF9F5] border border-stone-200 rounded-xs text-xs">
                <div>
                  <span className="text-stone-500 uppercase tracking-wider block text-[10px]">Order Reference</span>
                  <span className="font-mono font-semibold text-[#781D42] text-sm">
                    {confirmedOrder.orderNumber}
                  </span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-stone-200" />
                <div>
                  <span className="text-stone-500 uppercase tracking-wider block text-[10px]">Payment Method</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-stone-800">
                    {confirmedOrder.paymentMethod === 'COD' ? (
                      <>
                        <Banknote size={12} className="text-[#781D42]" />
                        Cash on Delivery (COD)
                      </>
                    ) : (
                      <>
                        <CreditCard size={12} className="text-[#781D42]" />
                        PayU Hosted Checkout
                      </>
                    )}
                  </span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-stone-200" />
                <div>
                  <span className="text-stone-500 uppercase tracking-wider block text-[10px]">Workflow Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                    <Clock size={12} />
                    {confirmedOrder.status} · {confirmedOrder.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address & Order Snapshots */}
            <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-xs shadow-xs space-y-6">
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-950 mb-3 border-b border-stone-100 pb-2 flex items-center gap-2">
                  <MapPin size={18} className="text-[#781D42]" />
                  <span>Immutable Delivery Snapshot</span>
                </h3>
                <div className="text-xs text-stone-700 space-y-1 font-light leading-relaxed">
                  <p className="font-semibold text-stone-900">{shippingAddr.name}</p>
                  <p className="text-stone-500">Contact: {shippingAddr.phone}</p>
                  <p>{shippingAddr.addressLine1}</p>
                  {shippingAddr.addressLine2 && <p>{shippingAddr.addressLine2}</p>}
                  {shippingAddr.landmark && <p className="text-stone-500 italic">Near {shippingAddr.landmark}</p>}
                  <p className="font-medium text-stone-900 pt-0.5">
                    {shippingAddr.city}, {shippingAddr.state} - {shippingAddr.pincode}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-stone-500">
                    {shippingAddr.country || 'India'}
                  </p>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="pt-4 border-t border-stone-200">
                <h3 className="font-serif text-lg font-semibold text-stone-950 mb-3 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#781D42]" />
                  <span>Ordered Atelier Pieces ({orderItems.length})</span>
                </h3>
                <div className="divide-y divide-stone-100">
                  {orderItems.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs gap-4">
                      <div>
                        <p className="font-semibold text-stone-900">{item.productTitle}</p>
                        <p className="text-stone-500 text-[11px]">
                          Variant: {item.size} / {item.color} · SKU: {item.sku}
                        </p>
                        <p className="text-stone-500 text-[11px]">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-serif font-semibold text-stone-950 tabular-nums">
                          ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-stone-500">
                          @ ₹{Number(item.unitPrice).toLocaleString('en-IN')} each
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="pt-4 border-t border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">
                    ₹{Number(confirmedOrder.subtotal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Artisan Insured Delivery</span>
                  <span className="text-emerald-700 font-medium uppercase tracking-wider text-[11px]">
                    Complimentary
                  </span>
                </div>
                <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-semibold text-stone-950">Payable Total</span>
                    <span className="block text-[10px] text-stone-500">Awaiting Payment Settlement</span>
                  </div>
                  <span className="font-serif text-2xl font-semibold text-[#781D42] tabular-nums">
                    ₹{Number(confirmedOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="bg-[#FAF4EB] border border-[#E6D7C3] p-5 rounded-xs text-xs text-stone-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#781D42]">
                <Sparkles size={16} />
                <span>What Happens Next?</span>
              </div>
              <p className="font-light leading-relaxed text-stone-700">
                {confirmedOrder.paymentMethod === 'COD' ? (
                  <>
                    Your order is confirmed for express dispatch. Please keep{' '}
                    <strong>₹{Number(confirmedOrder.totalAmount).toLocaleString('en-IN')}</strong> ready to pay via cash or UPI to our courier delivery executive upon arrival. You can track fulfillment status under your Patron Portal.
                  </>
                ) : (
                  <>
                    Your order is safely registered. You can monitor fulfillment progress under your Patron Order History at any time.
                  </>
                )}
              </p>
            </div>

            {/* Back Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to={`/account/orders/${confirmedOrder.orderNumber}`}
                className="px-6 py-3 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors shadow-xs"
              >
                View Order Details
              </Link>
              <Link
                to="/account/orders"
                className="px-6 py-3 border border-stone-300 text-stone-800 hover:bg-stone-50 text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors"
              >
                All Orders
              </Link>
              <Link
                to="/shop"
                className="px-6 py-3 border border-stone-300 text-stone-800 hover:bg-stone-50 text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN CHECKOUT VIEW
  // -------------------------------------------------------------------------
  const cartItems = checkoutSummary?.cart?.items || [];
  const subtotal = checkoutSummary?.cart?.subtotal || 0;
  const shippingAmount = checkoutSummary?.cart?.shippingAmount || 0;
  const totalAmount = checkoutSummary?.cart?.totalAmount || 0;
  const canProceed = Boolean(
    checkoutSummary?.canProceed &&
      selectedAddressId &&
      cartItems.length > 0 &&
      validationErrors.length === 0
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 pb-20">
      {/* Editorial Header */}
      <section className="bg-stone-100/60 border-b border-stone-200/80 py-8 sm:py-10">
        <Container>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
              <Link to="/cart" className="hover:text-[#781D42] transition-colors flex items-center gap-1">
                <ArrowLeft size={14} />
                <span>Return to Shopping Bag</span>
              </Link>
              <span>/</span>
              <span className="text-stone-800 font-medium">Bespoke Checkout</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-0.5">
                  Secure Checkout
                </span>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-950">
                  Review & Confirm Order
                </h1>
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-600">
                <ShieldCheck size={16} className="text-[#781D42]" />
                <span>Authoritative Server-Validated Checkout</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Checkout Grid */}
      <section className="py-8">
        <Container>
          <div className="max-w-6xl mx-auto">
            {/* Real-time Warnings Banner */}
            {validationWarnings.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xs text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <AlertTriangle size={16} />
                  <span>Price / Inventory Notification</span>
                </div>
                {validationWarnings.map((warn, idx) => (
                  <p key={idx} className="font-light pl-6">{warn}</p>
                ))}
              </div>
            )}

            {/* Validation Errors Banner */}
            {validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xs text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-rose-800">
                  <AlertCircle size={16} />
                  <span>Please Resolve Before Ordering</span>
                </div>
                {validationErrors.map((err, idx) => (
                  <p key={idx} className="font-light pl-6">{err}</p>
                ))}
              </div>
            )}

            {/* Order Placement Error */}
            {orderError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xs text-xs text-rose-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{orderError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderError(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Empty Bag Warning */}
            {!validating && cartItems.length === 0 ? (
              <div className="bg-white border border-stone-200 p-12 text-center rounded-xs space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center mx-auto">
                  <ShoppingBag size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl font-semibold text-stone-900">
                    Your Shopping Bag is Empty
                  </h3>
                  <p className="text-xs text-stone-500 font-light max-w-sm mx-auto">
                    You cannot proceed to checkout with an empty shopping bag. Discover our latest couture collection to add pieces.
                  </p>
                </div>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors"
                >
                  <span>Explore The Atelier</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* ----------------------------------------------------------- */}
                {/* LEFT COLUMN: DELIVERY ADDRESS & CART ITEMS                  */}
                {/* ----------------------------------------------------------- */}
                <div className="lg:col-span-7 space-y-6">
                  {/* SECTION 1: DELIVERY ADDRESS SELECTION */}
                  <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#781D42] text-amber-50 text-xs font-semibold flex items-center justify-center">
                          1
                        </span>
                        <h2 className="font-serif text-lg font-semibold text-stone-950">
                          Delivery Address
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                        className="text-xs text-[#781D42] hover:text-[#5B1123] font-semibold flex items-center gap-1 uppercase tracking-wider"
                      >
                        {showAddAddressForm ? (
                          <>
                            <X size={14} />
                            <span>Cancel</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Add New</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Inline Add Address Form */}
                    {showAddAddressForm && (
                      <form
                        onSubmit={handleSaveInlineAddress}
                        className="p-4 bg-[#FAF9F5] border border-stone-200 rounded-xs space-y-4 animate-fade-in"
                      >
                        <span className="text-xs font-serif font-semibold text-stone-900 block border-b border-stone-200 pb-2">
                          Add New Address for this Order
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                              Recipient Name *
                            </label>
                            <input
                              type="text"
                              value={newAddress.name}
                              onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                              placeholder="Full Name"
                              className="w-full text-xs py-2 px-2.5 bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                            />
                            {newAddressErrors.name && (
                              <p className="text-[10px] text-rose-600 mt-0.5">{newAddressErrors.name}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              value={newAddress.phone}
                              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                              placeholder="+91 98765 43210"
                              className="w-full text-xs py-2 px-2.5 bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                            />
                            {newAddressErrors.phone && (
                              <p className="text-[10px] text-rose-600 mt-0.5">{newAddressErrors.phone}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                            Flat / House No. / Street Address *
                          </label>
                          <input
                            type="text"
                            value={newAddress.addressLine1}
                            onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                            placeholder="e.g. 402 Royal Palms, Koregaon Park"
                            className="w-full text-xs py-2 px-2.5 bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                          />
                          {newAddressErrors.addressLine1 && (
                            <p className="text-[10px] text-rose-600 mt-0.5">{newAddressErrors.addressLine1}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                              Area / Landmark (Optional)
                            </label>
                            <input
                              type="text"
                              value={newAddress.landmark}
                              onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                              placeholder="e.g. Near Osho Garden"
                              className="w-full text-xs py-2 px-2.5 bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                              City *
                            </label>
                            <input
                              type="text"
                              value={newAddress.city}
                              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                              placeholder="City"
                              className="w-full text-xs py-2 px-2.5 bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                            />
                            {newAddressErrors.city && (
                              <p className="text-[10px] text-rose-600 mt-0.5">{newAddressErrors.city}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                              State *
                            </label>
                            <select
                              value={newAddress.state}
                              onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                              className="w-full text-xs py-2 px-2.5 bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42]"
                            >
                              {INDIAN_STATES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                              PIN Code *
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              value={newAddress.pincode}
                              onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                              placeholder="6 Digits"
                              className="w-full text-xs py-2 px-2.5 bg-white border border-stone-300 rounded-xs focus:outline-none focus:border-[#781D42] font-mono"
                            />
                            {newAddressErrors.pincode && (
                              <p className="text-[10px] text-rose-600 mt-0.5">{newAddressErrors.pincode}</p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddAddressForm(false)}
                            className="px-3 py-1.5 border border-stone-300 text-stone-700 text-xs rounded-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingAddress}
                            className="px-4 py-1.5 bg-[#781D42] text-white text-xs uppercase tracking-wider font-semibold rounded-xs"
                          >
                            {isSavingAddress ? 'Saving...' : 'Save & Select'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Address Selection List */}
                    {loadingAddresses ? (
                      <div className="space-y-3 animate-pulse">
                        <div className="h-20 bg-stone-100 rounded-xs" />
                        <div className="h-20 bg-stone-100 rounded-xs" />
                      </div>
                    ) : addresses.length === 0 && !showAddAddressForm ? (
                      <div className="p-6 text-center border border-dashed border-stone-300 rounded-xs space-y-3">
                        <MapPin size={24} className="text-stone-400 mx-auto" />
                        <p className="text-xs text-stone-600">
                          No delivery addresses saved. Please add an address to continue.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddAddressForm(true)}
                          className="px-4 py-2 bg-[#781D42] text-amber-50 text-xs uppercase tracking-wider font-semibold rounded-xs"
                        >
                          Add Delivery Address
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <label
                              key={addr.id}
                              className={`flex items-start gap-3.5 p-4 rounded-xs border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#781D42] bg-[#FAF4EB]/40 ring-1 ring-[#781D42]/30'
                                  : 'border-stone-200 hover:border-stone-300 bg-white'
                              }`}
                            >
                              <input
                                type="radio"
                                name="selectedAddress"
                                value={addr.id}
                                checked={isSelected}
                                onChange={() => setSelectedAddressId(addr.id)}
                                className="mt-1 text-[#781D42] focus:ring-[#781D42]"
                              />
                              <div className="flex-1 text-xs space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-900">{addr.name}</span>
                                  <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                                    {renderTypeIcon(addr.addressType)}
                                    {addr.addressType}
                                  </span>
                                  {addr.isDefault && (
                                    <span className="text-[10px] font-semibold text-[#781D42] uppercase tracking-widest bg-[#FAF4EB] px-2 py-0.5 rounded-full border border-[#E6D7C3]">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-stone-600 font-mono text-[11px]">Phone: {addr.phone}</p>
                                <p className="text-stone-600 font-light leading-snug">
                                  {addr.addressLine1}
                                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                                  {addr.landmark ? ` (Near ${addr.landmark})` : ''}
                                </p>
                                <p className="font-medium text-stone-800">
                                  {addr.city}, {addr.state} - {addr.pincode}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-2 text-right">
                      <Link
                        to="/account/addresses"
                        className="text-[11px] text-[#781D42] hover:underline uppercase tracking-wider font-semibold"
                      >
                        Manage All Saved Addresses →
                      </Link>
                    </div>
                  </div>

                  {/* SECTION 2: CART ITEMS REVIEW */}
                  <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#781D42] text-amber-50 text-xs font-semibold flex items-center justify-center">
                          2
                        </span>
                        <h2 className="font-serif text-lg font-semibold text-stone-950">
                          Shopping Bag Verification
                        </h2>
                      </div>
                      <Link
                        to="/cart"
                        className="text-xs text-[#781D42] hover:underline uppercase tracking-wider font-semibold"
                      >
                        Edit Bag
                      </Link>
                    </div>

                    <div className="divide-y divide-stone-100">
                      {cartItems.map((item) => (
                        <div key={item.id} className="py-3 flex items-center gap-4">
                          {/* Thumbnail */}
                          <div className="w-16 h-20 bg-stone-100 rounded-xs overflow-hidden shrink-0 border border-stone-200">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productTitle}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-serif">
                                Couture
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 text-xs space-y-0.5">
                            <h4 className="font-serif font-semibold text-stone-950 truncate">
                              {item.productTitle}
                            </h4>
                            <p className="text-[11px] text-stone-500">
                              Size: <span className="text-stone-800 font-medium">{item.size}</span> · Color:{' '}
                              <span className="text-stone-800 font-medium">{item.color}</span>
                            </p>
                            <p className="text-[10px] font-mono text-stone-400">SKU: {item.sku}</p>
                            <p className="text-[11px] text-stone-600 pt-0.5">
                              Qty: <span className="font-semibold text-stone-900">{item.quantity}</span>
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0">
                            <span className="font-serif font-semibold text-stone-950 tabular-nums block text-sm">
                              ₹{Number(item.lineTotal).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-stone-500 block">
                              @ ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION 3: PAYMENT METHOD SELECTION */}
                  <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#781D42] text-amber-50 text-xs font-semibold flex items-center justify-center">
                          3
                        </span>
                        <h2 className="font-serif text-lg font-semibold text-stone-950">
                          Payment Method
                        </h2>
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">
                        Select Payment Option
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Option 1: PayU Hosted Checkout */}
                      <label
                        className={`flex items-start gap-3.5 p-4 rounded-xs border cursor-pointer transition-all ${
                          paymentMethod === 'PAYU'
                            ? 'border-[#781D42] bg-[#FAF4EB]/40 ring-1 ring-[#781D42]/30'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="checkoutPaymentOption"
                          value="PAYU"
                          checked={paymentMethod === 'PAYU'}
                          onChange={() => setPaymentMethod('PAYU')}
                          className="mt-1 text-[#781D42] focus:ring-[#781D42]"
                        />
                        <div className="flex-1 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard size={16} className="text-[#781D42]" />
                              <span className="font-semibold text-stone-950 text-sm">
                                Online Payment — PayU Hosted Checkout
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Instant Confirmation
                            </span>
                          </div>
                          <p className="text-stone-600 font-light leading-relaxed">
                            Pay securely via <strong>UPI (Google Pay, PhonePe, Paytm, BHIM)</strong>, <strong>Credit & Debit Cards (Visa, MasterCard, RuPay, Maestro)</strong>, or <strong>Net Banking (50+ Indian banks)</strong> through official PayU India Hosted Checkout.
                          </p>
                          <div className="pt-1 flex flex-wrap items-center gap-3 text-[10px] text-stone-500 font-mono">
                            <span className="inline-flex items-center gap-1 text-[#781D42]">
                              <ShieldCheck size={11} /> 256-Bit SSL Encrypted
                            </span>
                            <span>·</span>
                            <span>Seamless Return to Atelier</span>
                          </div>
                        </div>
                      </label>

                      {/* Option 2: Cash on Delivery */}
                      <label
                        className={`flex items-start gap-3.5 p-4 rounded-xs border cursor-pointer transition-all ${
                          paymentMethod === 'COD'
                            ? 'border-[#781D42] bg-[#FAF4EB]/40 ring-1 ring-[#781D42]/30'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="checkoutPaymentOption"
                          value="COD"
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          className="mt-1 text-[#781D42] focus:ring-[#781D42]"
                        />
                        <div className="flex-1 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Banknote size={16} className="text-[#781D42]" />
                              <span className="font-semibold text-stone-950 text-sm">
                                Cash on Delivery (COD)
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                              Complimentary Delivery
                            </span>
                          </div>
                          <p className="text-stone-600 font-light leading-relaxed">
                            Pay with cash or UPI directly to our trusted courier delivery partner upon the arrival of your bespoke package at your doorstep.
                          </p>
                          <p className="text-[10px] text-amber-900 font-light pt-0.5">
                            * Total payable upon delivery: <strong>₹{totalAmount.toLocaleString('en-IN')}</strong>. Please ensure the recipient is available.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* RIGHT COLUMN: ORDER SUMMARY & CONFIRMATION                  */}
                {/* ----------------------------------------------------------- */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-stone-200 rounded-xs p-6 shadow-sm sticky top-28 space-y-6">
                    <h3 className="font-serif text-xl font-semibold text-stone-950 border-b border-stone-100 pb-3">
                      Order Summary
                    </h3>

                    {/* Financial Calculations */}
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>Items Subtotal ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} pieces)</span>
                        <span className="font-mono font-medium text-stone-900 tabular-nums">
                          ₹{subtotal.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-stone-600">
                        <div>
                          <span className="block">Pan-India Express Delivery</span>
                          <span className="text-[10px] text-stone-400">Insured Tamper-Proof Courier</span>
                        </div>
                        <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[11px]">
                          Complimentary
                        </span>
                      </div>

                      <div className="flex justify-between text-stone-600">
                        <span>Goods & Services Tax (GST)</span>
                        <span className="text-stone-500 italic text-[11px]">Included in Price</span>
                      </div>

                      {/* Total */}
                      <div className="pt-4 border-t border-stone-200 flex justify-between items-baseline">
                        <div>
                          <span className="text-sm font-semibold text-stone-950 block">Payable Total</span>
                          <span className="text-[10px] text-stone-500 font-light">Calculated in Indian Rupees (INR)</span>
                        </div>
                        <span className="font-serif text-2xl font-semibold text-[#781D42] tabular-nums">
                          ₹{totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Delivery Destination Reminder */}
                    {selectedAddressId && (
                      <div className="p-3 bg-[#FAF9F5] border border-stone-200 rounded-xs text-[11px] text-stone-600 space-y-0.5">
                        <span className="uppercase tracking-wider text-stone-400 block text-[9px] font-semibold">
                          Delivering To
                        </span>
                        {(() => {
                          const addr = addresses.find((a) => a.id === selectedAddressId);
                          if (!addr) return null;
                          return (
                            <p className="font-medium text-stone-800">
                              {addr.name} · {addr.city}, {addr.state} ({addr.pincode})
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    {/* Confirmation Button */}
                    <div className="space-y-3 pt-1">
                      <button
                        type="button"
                        disabled={!canProceed || isSubmittingOrder || validating || isRedirectingGateway}
                        onClick={handleConfirmOrder}
                        className="w-full py-4 px-6 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2 group"
                      >
                        {isSubmittingOrder || isRedirectingGateway ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>
                              {paymentMethod === 'PAYU'
                                ? 'Connecting to PayU Hosted Checkout...'
                                : 'Confirming COD Order...'}
                            </span>
                          </>
                        ) : paymentMethod === 'PAYU' ? (
                          <>
                            <CreditCard size={15} />
                            <span>Proceed to PayU Payment</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        ) : (
                          <>
                            <Banknote size={15} />
                            <span>Confirm Order (Cash on Delivery)</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      {!selectedAddressId && (
                        <p className="text-[11px] text-amber-800 text-center font-light">
                          Please select or add a delivery address to confirm your order.
                        </p>
                      )}

                      <p className="text-[10px] text-stone-500 text-center font-light leading-relaxed">
                        {paymentMethod === 'PAYU'
                          ? 'You will be redirected to PayU India’s official 256-bit encrypted prebuilt checkout to complete UPI, Card, or Net Banking payment.'
                          : 'Payment will be collected by courier executive in cash or UPI upon delivery at your provided address.'}
                      </p>
                    </div>

                    {/* Luxury Trust Signals */}
                    <div className="pt-4 border-t border-stone-200/80 space-y-2.5 text-[11px] text-stone-600">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[#781D42] shrink-0" />
                        <span>100% Certified Authentic Artisan Couture</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-[#781D42] shrink-0" />
                        <span>Complimentary Insured Courier Transit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RotateCcw size={14} className="text-[#781D42] shrink-0" />
                        <span>7-Day Fit Alteration & Return Assistance</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
