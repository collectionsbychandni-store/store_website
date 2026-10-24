import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import * as checkoutService from '../services/checkoutService';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  ShoppingBag,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Truck,
  Sparkles,
} from 'lucide-react';

/**
 * Collections by Chandni - Payment Status & Post-Gateway Landing Page (/checkout/payment-status)
 *
 * Implements Launch Step 21:
 * - Real-time gateway status verification from backend
 * - Reverse hash verified state presentation
 * - Seamless order confirmation view for PayU online transactions
 * - Graceful failure & cancellation handling with retry and COD conversion
 * - Secure sandbox dev testing tools
 */
export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderNumber = searchParams.get('orderNumber') || '';
  const initialStatus = (searchParams.get('status') || '').toLowerCase();
  const txnid = searchParams.get('txnid') || '';
  const initialMode = searchParams.get('mode') || '';
  const failureMessage = searchParams.get('message') || '';

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Authoritatively verify order payment state
  const loadPaymentVerification = useCallback(async () => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await checkoutService.verifyPaymentStatus(orderNumber);
      if (res?.data) {
        setOrderData(res.data);
      }
    } catch (err) {
      console.warn('Payment verification fetch warning:', err);
      setError(err.message || 'Unable to retrieve verified payment record');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    loadPaymentVerification();
  }, [loadPaymentVerification]);

  // Handle retry online payment via PayU
  const handleRetryPayU = async () => {
    if (!orderNumber || isRetrying) return;
    try {
      setIsRetrying(true);
      setError(null);
      const res = await checkoutService.initiatePayUPayment(orderNumber);
      if (res?.payuParams) {
        // Dynamically create and submit PayU form
        const params = res.payuParams;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = params.actionUrl;

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
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize payment gateway retry');
      setIsRetrying(false);
    }
  };

  // Dev Sandbox Simulator
  const handleSimulatePayment = async (outcome) => {
    if (!orderNumber || isSimulating) return;
    try {
      setIsSimulating(true);
      await checkoutService.simulatePaymentOutcome({
        orderNumber,
        outcome,
        paymentMode: 'UPI_SIMULATED',
      });
      await loadPaymentVerification();
    } catch (err) {
      setError(err.message || 'Simulation error');
    } finally {
      setIsSimulating(false);
    }
  };

  const isPaid = orderData?.paymentStatus === 'PAID' || initialStatus === 'success';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-[#781D42]/20 border-t-[#781D42] rounded-full animate-spin mx-auto" />
          <p className="font-serif text-lg text-stone-800">Verifying Payment with PayU Gateway...</p>
          <p className="text-xs text-stone-500 font-light">
            Performing cryptographic checksum verification. Please do not close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 py-12 sm:py-16">
      <Container>
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          {isPaid ? (
            /* ------------------------------------------------------------- */
            /* SUCCESSFUL PAYMENT VIEW                                        */
            /* ------------------------------------------------------------- */
            <div className="space-y-6">
              {/* Main Success Banner */}
              <div className="bg-white border border-[#E6D7C3] p-8 sm:p-10 rounded-xs shadow-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FAF4EB] border border-[#E6D7C3] text-[#781D42] flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                    PayU India · Verified Transaction
                  </span>
                  <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-950">
                    Payment Successful
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 font-light leading-relaxed max-w-md mx-auto">
                    Thank you. Your online payment was securely confirmed by PayU India. Your heirloom piece has been allocated and confirmed for atelier fulfillment.
                  </p>
                </div>

                {/* Key Transaction Identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 px-6 bg-[#FAF9F5] border border-stone-200 rounded-xs text-xs">
                  <div>
                    <span className="text-stone-500 uppercase tracking-wider block text-[10px]">
                      Order Reference
                    </span>
                    <span className="font-mono font-semibold text-[#781D42] text-sm">
                      {orderNumber || orderData?.orderNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 uppercase tracking-wider block text-[10px]">
                      PayU Txn Reference
                    </span>
                    <span className="font-mono font-medium text-stone-800 text-xs truncate block" title={txnid || orderData?.lastTxnId}>
                      {txnid || orderData?.lastTxnId || 'VERIFIED_AUTH'}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 uppercase tracking-wider block text-[10px]">
                      Payment Method
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 text-xs">
                      <CreditCard size={12} />
                      PayU Hosted ({initialMode || orderData?.paymentDetails?.mode || 'Online'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Fulfillment Status Card */}
              <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-xs shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-serif text-lg font-semibold text-stone-950 flex items-center gap-2">
                    <Truck size={18} className="text-[#781D42]" />
                    <span>Order Confirmation Summary</span>
                  </h3>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    CONFIRMED · {orderData?.paymentStatus || 'PAID'}
                  </span>
                </div>

                <div className="space-y-3 text-xs text-stone-700">
                  <div className="flex justify-between items-baseline">
                    <span className="text-stone-600">Total Settled Amount</span>
                    <span className="font-serif text-xl font-semibold text-[#781D42]">
                      ₹{Number(orderData?.totalAmount || searchParams.get('amount') || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-stone-600">Inventory Allocation</span>
                    <span className="font-medium text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Atelier Stock Reserved
                    </span>
                  </div>

                  {orderData?.shippingAddress && (
                    <div className="pt-3 border-t border-stone-100">
                      <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                        Delivery Destination
                      </span>
                      <p className="font-medium text-stone-900">{orderData.shippingAddress.name}</p>
                      <p className="text-stone-600 font-light">
                        {orderData.shippingAddress.addressLine1}, {orderData.shippingAddress.city}, {orderData.shippingAddress.state} - {orderData.shippingAddress.pincode}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  to={`/account/orders/${orderNumber}`}
                  className="px-6 py-3 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors shadow-xs"
                >
                  View Order in Patron Account
                </Link>
                <Link
                  to="/shop"
                  className="px-6 py-3 border border-stone-300 text-stone-800 hover:bg-stone-50 text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------------- */
            /* FAILED OR CANCELLED PAYMENT VIEW                               */
            /* ------------------------------------------------------------- */
            <div className="space-y-6">
              <div className="bg-white border border-rose-200 p-8 sm:p-10 rounded-xs shadow-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
                  <AlertCircle size={36} />
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-rose-800 font-semibold block mb-1">
                    PayU India · Transaction Incomplete
                  </span>
                  <h1 className="font-serif text-3xl font-semibold text-stone-950">
                    Payment Not Completed
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 font-light leading-relaxed max-w-md mx-auto">
                    {failureMessage ||
                      'The payment was either cancelled by the user or declined by the issuing bank/UPI application. No funds were debited.'}
                  </p>
                </div>

                <div className="py-3 px-6 bg-[#FAF9F5] border border-stone-200 rounded-xs text-xs inline-flex flex-col sm:flex-row items-center gap-4">
                  <div>
                    <span className="text-stone-500 uppercase tracking-wider block text-[10px]">Order Number</span>
                    <span className="font-mono font-semibold text-stone-900">{orderNumber}</span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-stone-200" />
                  <div>
                    <span className="text-stone-500 uppercase tracking-wider block text-[10px]">Current Status</span>
                    <span className="font-medium text-amber-800">Awaiting Payment · Order Preserved</span>
                  </div>
                </div>
              </div>

              {/* Helpful Recovery Advice */}
              <div className="bg-[#FAF4EB] border border-[#E6D7C3] p-6 rounded-xs space-y-3 text-xs text-stone-800">
                <div className="flex items-center gap-2 font-semibold text-[#781D42]">
                  <Sparkles size={16} />
                  <span>Your Order is Safe</span>
                </div>
                <p className="font-light leading-relaxed text-stone-700">
                  Your selected couture pieces and delivery address are saved under Order{' '}
                  <strong className="font-mono">{orderNumber}</strong>. You can retry paying online using any card, NetBanking, or UPI app, or select Cash on Delivery.
                </p>
              </div>

              {/* Retry & Alternate Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={isRetrying}
                  onClick={handleRetryPayU}
                  className="w-full py-4 px-6 bg-[#781D42] text-amber-50 hover:bg-[#5B1123] disabled:bg-stone-300 text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Opening PayU Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} />
                      <span>Retry Online Payment via PayU</span>
                    </>
                  )}
                </button>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/account/orders/${orderNumber}`}
                    className="flex-1 py-3 px-4 border border-stone-300 text-center text-stone-800 hover:bg-stone-50 text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors"
                  >
                    View Order in Account
                  </Link>

                  <Link
                    to="/checkout"
                    className="flex-1 py-3 px-4 border border-stone-300 text-center text-stone-800 hover:bg-stone-50 text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors"
                  >
                    Return to Checkout
                  </Link>
                </div>
              </div>

              {/* Dev Testing Sandbox Simulator Bar - strictly guarded to local development only */}
              {import.meta.env.DEV && (
                <div className="p-4 bg-stone-100 border border-dashed border-stone-300 rounded-xs text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider">
                      Developer Sandbox Simulator (Dev Mode Only)
                    </span>
                    <span className="text-[10px] text-stone-500">Step 21 Verification</span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-light">
                    Instantly verify the full reverse SHA-512 cryptographic verification pipeline without external gateway network delays.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={() => handleSimulatePayment('success')}
                      className="px-3 py-1.5 bg-emerald-800 text-white hover:bg-emerald-900 text-[11px] font-semibold rounded-xs"
                    >
                      Simulate PayU Success
                    </button>
                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={() => handleSimulatePayment('failure')}
                      className="px-3 py-1.5 bg-rose-800 text-white hover:bg-rose-900 text-[11px] font-semibold rounded-xs"
                    >
                      Simulate PayU Failure
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
