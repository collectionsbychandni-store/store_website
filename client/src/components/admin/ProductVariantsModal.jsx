import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Package,
  Loader2,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import * as variantService from '../../services/variantService';
import * as inventoryService from '../../services/inventoryService';
import VariantFormModal from './VariantFormModal';
import StockAdjustmentModal from './StockAdjustmentModal';

/**
 * ProductVariantsModal
 * Dedicated modal for viewing, creating, updating, adjusting stock,
 * and deleting variants for a specific product.
 */
export default function ProductVariantsModal({
  isOpen,
  onClose,
  product = null,
  onVariantsUpdated = () => {},
}) {
  const [variants, setVariants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal child states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isStockOpen, setIsStockOpen] = useState(false);
  const [adjustingVariant, setAdjustingVariant] = useState(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Deletion state
  const [deletingId, setDeletingId] = useState(null);

  const loadVariants = useCallback(async () => {
    if (!product?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await variantService.getVariantsByProductId(product.id);
      if (res?.data) {
        setVariants(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load product variants');
    } finally {
      setIsLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadVariants();
      setFeedback({ type: '', message: '' });
    }
  }, [isOpen, product?.id, loadVariants]);

  // Clear feedback after 4s
  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  if (!isOpen || !product) return null;

  // Handle Create or Update variant
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingVariant) {
        await variantService.updateVariant(editingVariant.id, formData);
        setFeedback({ type: 'success', message: `Variant ${formData.sku} updated successfully.` });
      } else {
        await variantService.createVariant(product.id, formData);
        setFeedback({ type: 'success', message: `Variant ${formData.sku} added successfully.` });
      }
      setIsFormOpen(false);
      setEditingVariant(null);
      await loadVariants();
      onVariantsUpdated();
    } catch (err) {
      throw err; // handled by VariantFormModal
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle stock adjustment
  const handleStockSubmit = async ({ variantId, mode, quantity, reason }) => {
    setIsAdjusting(true);
    try {
      await inventoryService.adjustStock(variantId, { mode, quantity, reason });
      setFeedback({ type: 'success', message: 'Stock updated successfully.' });
      setIsStockOpen(false);
      setAdjustingVariant(null);
      await loadVariants();
      onVariantsUpdated();
    } catch (err) {
      throw err;
    } finally {
      setIsAdjusting(false);
    }
  };

  // Toggle variant active status
  const handleToggleStatus = async (variant) => {
    const nextStatus = !variant.isActive;
    try {
      await variantService.updateVariantStatus(variant.id, nextStatus);
      setFeedback({
        type: 'success',
        message: `Variant ${variant.sku} is now ${nextStatus ? 'Active' : 'Inactive'}.`,
      });
      await loadVariants();
      onVariantsUpdated();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update status' });
    }
  };

  // Safe delete variant
  const handleDeleteVariant = async (variant) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete variant ${variant.sku} (${variant.size} / ${variant.color})?`
    );
    if (!confirmDelete) return;

    setDeletingId(variant.id);
    try {
      await variantService.deleteVariant(variant.id);
      setFeedback({ type: 'success', message: `Variant ${variant.sku} deleted.` });
      await loadVariants();
      onVariantsUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete variant.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-variants-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-5 sm:p-7 shadow-2xl border border-stone-200/90 z-10 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-100 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                Product Variations
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">
                {product.brand || 'Collections by Chandni'}
              </span>
            </div>
            <h2 id="product-variants-title" className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 mt-0.5">
              {product.title}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage sizes, colors, SKUs, inventory stock, and pricing for this design.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingVariant(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={14} className="mr-1.5" />
              <span>Add Variant</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedback.message && (
          <div
            className={`mt-4 rounded-lg p-3 text-xs font-medium flex items-center justify-between border shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback({ type: '', message: '' })}
              className="text-stone-400 hover:text-stone-700"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Variants List / Table View */}
        <div className="mt-4 flex-1 overflow-y-auto border border-stone-200/90 rounded-xl">
          {isLoading && variants.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Loader2 size={24} className="animate-spin text-stone-400 mx-auto" />
              <p className="text-xs text-stone-500">Loading variations...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle size={24} className="text-rose-600 mx-auto" />
              <p className="text-xs text-stone-600">{error}</p>
              <button
                type="button"
                onClick={loadVariants}
                className="text-xs font-semibold text-rose-800 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : variants.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50 text-stone-400">
                <Package size={22} />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                No Variations Created Yet
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Define the size and color combinations (e.g. M / Blush Pink) with SKU and pricing to enable inventory tracking.
              </p>
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs"
              >
                <Plus size={14} className="mr-1.5" />
                Add First Variant
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                    <th scope="col" className="py-3 px-3.5 font-semibold">SKU</th>
                    <th scope="col" className="py-3 px-3 font-semibold">Size</th>
                    <th scope="col" className="py-3 px-3 font-semibold">Color</th>
                    <th scope="col" className="py-3 px-3 font-semibold">MRP</th>
                    <th scope="col" className="py-3 px-3 font-semibold">Selling Price</th>
                    <th scope="col" className="py-3 px-3 font-semibold text-center">Stock</th>
                    <th scope="col" className="py-3 px-3 font-semibold text-center">Status</th>
                    <th scope="col" className="py-3 pl-3 pr-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {variants.map((v) => {
                    const stock = Number(v.stock ?? v.stockQuantity ?? 0);
                    const threshold = Number(v.lowStockThreshold || 5);
                    const isOutOfStock = stock <= 0;
                    const isLowStock = !isOutOfStock && stock <= threshold;

                    return (
                      <tr key={v.id} className="hover:bg-stone-50/60 transition-colors">
                        {/* SKU */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-stone-900">
                            {v.sku}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-800">
                            {v.size}
                          </span>
                        </td>

                        {/* Color */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-stone-800">
                            {v.color}
                          </span>
                        </td>

                        {/* MRP */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-stone-400 line-through text-[11px]">
                          ₹{Number(v.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-3 whitespace-nowrap font-serif font-semibold text-stone-900">
                          ₹{Number(v.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Stock Quantity with Badge */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingVariant({
                                ...v,
                                productTitle: product.title,
                              });
                              setIsStockOpen(true);
                            }}
                            title="Click to adjust stock"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium hover:opacity-85 transition-opacity cursor-pointer"
                            style={{
                              backgroundColor: isOutOfStock
                                ? '#FEF2F2'
                                : isLowStock
                                ? '#FFFBEB'
                                : '#ECFDF5',
                              borderColor: isOutOfStock
                                ? '#FECACA'
                                : isLowStock
                                ? '#FDE68A'
                                : '#A7F3D0',
                              color: isOutOfStock
                                ? '#991B1B'
                                : isLowStock
                                ? '#92400E'
                                : '#065F46',
                            }}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isOutOfStock
                                  ? 'bg-rose-500'
                                  : isLowStock
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            <span>{stock} units</span>
                            <SlidersHorizontal size={11} className="ml-1 opacity-70" />
                          </button>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(v)}
                            title={v.isActive ? 'Deactivate variant' : 'Activate variant'}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                              v.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                v.isActive ? 'bg-emerald-500' : 'bg-stone-400'
                              }`}
                            />
                            {v.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 pl-3 pr-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Quick Adjust */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingVariant({
                                  ...v,
                                  productTitle: product.title,
                                });
                                setIsStockOpen(true);
                              }}
                              title="Adjust stock"
                              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                            >
                              <TrendingUp size={13} />
                            </button>

                            {/* Edit Variant */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVariant(v);
                                setIsFormOpen(true);
                              }}
                              title="Edit variant"
                              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Variant */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(v)}
                              disabled={deletingId === v.id}
                              title="Delete variant"
                              className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-40"
                            >
                              {deletingId === v.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-3 flex items-center justify-between border-t border-stone-100 shrink-0 text-xs text-stone-500">
          <div>
            Total Variations: <strong className="font-semibold text-stone-800">{variants.length}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Variant Add / Edit Form Modal */}
      <VariantFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingVariant(null);
        }}
        onSubmit={handleFormSubmit}
        variantToEdit={editingVariant}
        product={product}
        isSubmitting={isSubmitting}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isStockOpen}
        onClose={() => {
          setIsStockOpen(false);
          setAdjustingVariant(null);
        }}
        onSubmit={handleStockSubmit}
        variant={adjustingVariant}
        isSubmitting={isAdjusting}
      />
    </div>
  );
}
