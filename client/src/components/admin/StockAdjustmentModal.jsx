import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, TrendingUp, TrendingDown, RefreshCw, Check } from 'lucide-react';

/**
 * Stock Adjustment Modal
 * Allows administrators to Set, Increase, or Decrease stock quantity
 * with an audit reason for inventory tracking.
 */
export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSubmit,
  variant = null,
  isSubmitting = false,
}) {
  const [mode, setMode] = useState('SET'); // 'SET' | 'INCREASE' | 'DECREASE'
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('Manual stock update');
  const [error, setError] = useState('');

  const currentStock = Number(variant?.stock ?? variant?.stockQuantity ?? 0);

  useEffect(() => {
    if (variant) {
      setMode('SET');
      setValue(String(currentStock));
      setReason('Physical inventory audit');
    }
    setError('');
  }, [variant, isOpen, currentStock]);

  if (!isOpen || !variant) return null;

  // Calculate resulting stock for preview
  const numVal = parseInt(value, 10);
  let calculatedStock = currentStock;

  if (!isNaN(numVal)) {
    if (mode === 'SET') {
      calculatedStock = numVal;
    } else if (mode === 'INCREASE') {
      calculatedStock = currentStock + numVal;
    } else if (mode === 'DECREASE') {
      calculatedStock = currentStock - numVal;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isNaN(numVal)) {
      setError('Please enter a valid quantity');
      return;
    }

    if (mode === 'SET' && numVal < 0) {
      setError('Stock quantity cannot be negative');
      return;
    }

    if ((mode === 'INCREASE' || mode === 'DECREASE') && numVal <= 0) {
      setError('Adjustment amount must be greater than 0');
      return;
    }

    if (calculatedStock < 0) {
      setError(`Cannot deduct ${numVal} units. Current stock is ${currentStock}. Resulting stock would be negative.`);
      return;
    }

    try {
      await onSubmit({
        variantId: variant.id,
        mode,
        quantity: numVal,
        reason: reason.trim() || 'Admin stock adjustment',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-xl border border-stone-200/90 z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
              Inventory Control
            </span>
            <h2 id="stock-modal-title" className="font-serif text-xl font-semibold text-stone-900">
              Adjust Stock
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Variant Info Pill */}
        <div className="mt-4 rounded-xl bg-stone-50 border border-stone-200/80 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-xs text-stone-900 line-clamp-1">
              {variant.productTitle || variant.product?.title || 'Product'}
            </span>
            <span className="font-mono text-[11px] font-semibold text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded">
              {variant.sku}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-stone-500">
            <span>Size: <strong className="text-stone-700">{variant.size}</strong></span>
            <span>•</span>
            <span>Color: <strong className="text-stone-700">{variant.color}</strong></span>
            <span>•</span>
            <span>Current Stock: <strong className="font-mono text-stone-900">{currentStock}</strong></span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-start space-x-2.5 rounded-lg bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Mode Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('SET');
                  setValue(String(currentStock));
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  mode === 'SET'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <RefreshCw size={12} />
                <span>Set Exact</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('INCREASE');
                  setValue('10');
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  mode === 'INCREASE'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <TrendingUp size={12} />
                <span>Add Stock</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('DECREASE');
                  setValue('5');
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  mode === 'DECREASE'
                    ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <TrendingDown size={12} />
                <span>Deduct</span>
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-1.5">
            <label htmlFor="adjust-qty" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              {mode === 'SET' ? 'New Exact Stock Quantity' : mode === 'INCREASE' ? 'Units to Add' : 'Units to Deduct'}
            </label>
            <input
              id="adjust-qty"
              type="number"
              min={mode === 'SET' ? '0' : '1'}
              step="1"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-sm text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            />
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label htmlFor="adjust-reason" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Reason / Audit Note
            </label>
            <input
              id="adjust-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Received new shipment from workshop, physical count audit"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            />
          </div>

          {/* Calculation Preview */}
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">New Stock Preview:</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-stone-400">{currentStock}</span>
              <span className="text-stone-400">→</span>
              <span
                className={`font-mono font-bold text-sm ${
                  calculatedStock <= 0
                    ? 'text-rose-600'
                    : calculatedStock <= (variant.lowStockThreshold || 5)
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {calculatedStock} units
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || calculatedStock < 0}
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors focus:outline-none focus:ring-1 focus:ring-stone-950 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} className="mr-1.5" />
                  <span>Confirm Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
