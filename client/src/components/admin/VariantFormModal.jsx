import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

/**
 * Variant Form Modal for Creating & Editing Product Variants
 */
export default function VariantFormModal({
  isOpen,
  onClose,
  onSubmit,
  variantToEdit = null,
  product = null,
  isSubmitting = false,
}) {
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('');
  const [sku, setSku] = useState('');
  const [mrp, setMrp] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (variantToEdit) {
      setSize(variantToEdit.size || 'One Size');
      setColor(variantToEdit.color || 'Standard');
      setSku(variantToEdit.sku || '');
      setMrp(variantToEdit.mrp !== undefined ? String(variantToEdit.mrp) : '');
      setSellingPrice(variantToEdit.sellingPrice !== undefined ? String(variantToEdit.sellingPrice) : '');
      setStock(variantToEdit.stock !== undefined ? String(variantToEdit.stock) : '0');
      setLowStockThreshold(variantToEdit.lowStockThreshold !== undefined ? String(variantToEdit.lowStockThreshold) : '5');
      setIsActive(variantToEdit.isActive ?? true);
    } else {
      setSize('M');
      setColor('');
      setSku('');
      setMrp('');
      setSellingPrice('');
      setStock('10');
      setLowStockThreshold('5');
      setIsActive(true);
    }
    setError('');
  }, [variantToEdit, isOpen]);

  // Auto-suggest SKU if empty and user types size & color
  const handleAutoSku = () => {
    if (!sku && product?.title) {
      const pPrefix = product.title
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
      const cPrefix = (color || 'STD').slice(0, 3).toUpperCase();
      const sPrefix = (size || 'OS').toUpperCase();
      setSku(`CBC-${pPrefix}-${cPrefix}-${sPrefix}`);
    }
  };

  if (!isOpen) return null;

  const isEditMode = Boolean(variantToEdit);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!sku.trim()) {
      setError('SKU is required');
      return;
    }

    const numMrp = Number(mrp);
    const numSellingPrice = Number(sellingPrice);

    if (isNaN(numMrp) || numMrp < 0) {
      setError('MRP must be a valid non-negative number');
      return;
    }

    if (isNaN(numSellingPrice) || numSellingPrice < 0) {
      setError('Selling price must be a valid non-negative number');
      return;
    }

    if (numSellingPrice > numMrp) {
      setError('Selling price cannot exceed MRP');
      return;
    }

    const numStock = parseInt(stock, 10);
    if (isNaN(numStock) || numStock < 0) {
      setError('Stock quantity must be a non-negative integer');
      return;
    }

    const numThreshold = parseInt(lowStockThreshold, 10);
    if (isNaN(numThreshold) || numThreshold < 0) {
      setError('Low stock threshold must be a non-negative integer');
      return;
    }

    try {
      await onSubmit({
        size: size.trim() || 'One Size',
        color: color.trim() || 'Standard',
        sku: sku.trim().toUpperCase(),
        mrp: numMrp,
        sellingPrice: numSellingPrice,
        stock: numStock,
        stockQuantity: numStock,
        lowStockThreshold: numThreshold,
        isActive,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save variant');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="variant-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200/90 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
              {product?.title || 'Product Variant'}
            </span>
            <h2 id="variant-modal-title" className="font-serif text-xl sm:text-2xl font-semibold text-stone-900">
              {isEditMode ? `Edit Variant (${variantToEdit.sku})` : 'Add New Variant'}
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

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-start space-x-2.5 rounded-lg bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Row 1: Size & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="var-size" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Size
              </label>
              <input
                id="var-size"
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                onBlur={handleAutoSku}
                placeholder="e.g. XS, S, M, L, XL, Free Size"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="var-color" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Color
              </label>
              <input
                id="var-color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={handleAutoSku}
                placeholder="e.g. Blush Pink, Wine Burgundy"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>
          </div>

          {/* Row 2: SKU */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="var-sku" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                SKU (Stock Keeping Unit) <span className="text-rose-600">*</span>
              </label>
              {!sku && (
                <button
                  type="button"
                  onClick={handleAutoSku}
                  className="text-[11px] text-rose-800 hover:text-rose-950 underline font-medium"
                >
                  Generate SKU
                </button>
              )}
            </div>
            <input
              id="var-sku"
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. CBC-WDK-PNK-M"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 font-mono text-xs text-stone-900 uppercase focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
            />
          </div>

          {/* Row 3: Pricing (MRP & Selling Price) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="var-mrp" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                MRP (₹) <span className="text-rose-600">*</span>
              </label>
              <input
                id="var-mrp"
                type="number"
                min="0"
                step="0.01"
                required
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="3499.00"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 font-mono text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="var-selling" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Selling Price (₹) <span className="text-rose-600">*</span>
              </label>
              <input
                id="var-selling"
                type="number"
                min="0"
                step="0.01"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="2499.00"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 font-mono text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>
          </div>

          {/* Row 4: Stock & Low Stock Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="var-stock" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Stock Quantity <span className="text-rose-600">*</span>
              </label>
              <input
                id="var-stock"
                type="number"
                min="0"
                step="1"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="15"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 font-mono text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="var-thresh" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Low Stock Threshold
              </label>
              <input
                id="var-thresh"
                type="number"
                min="0"
                step="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 font-mono text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>
          </div>

          {/* Status Checkbox */}
          <div className="flex items-center space-x-2.5 pt-2">
            <input
              id="var-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-rose-800 focus:ring-rose-600 cursor-pointer"
            />
            <label htmlFor="var-active" className="text-xs font-medium text-stone-800 cursor-pointer">
              Active Variant (available for storefront selection & purchasing)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
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
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors focus:outline-none focus:ring-1 focus:ring-stone-950 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Update Variant' : 'Create Variant'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
