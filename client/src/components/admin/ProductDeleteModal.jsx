import React from 'react';
import { AlertTriangle, AlertCircle, Loader2, X } from 'lucide-react';

/**
 * Product Delete Confirmation Modal
 * Handles referential integrity feedback (409 Conflict) gracefully.
 */
export default function ProductDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  product = null,
  isDeleting = false,
  errorMessage = '',
}) {
  if (!isOpen || !product) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prod-delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200/90 z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2 text-rose-800">
            <AlertTriangle size={20} className="shrink-0" />
            <h2 id="prod-delete-title" className="font-serif text-lg font-semibold text-stone-900">
              Delete Product
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Server Error Callout (e.g. 409 Conflict) */}
        {errorMessage && (
          <div className="mt-4 flex items-start space-x-2.5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Cannot Delete Product</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Warning Body */}
        <div className="mt-4 space-y-3 text-xs text-stone-600">
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-stone-900 font-semibold">"{product.title}"</strong>?
          </p>

          <div className="rounded-lg bg-stone-50 border border-stone-200/70 p-3 space-y-1.5 text-[11px] text-stone-500">
            <p className="font-semibold text-stone-700 uppercase tracking-wider text-[10px]">
              Order History Preservation Rule:
            </p>
            <p>
              Products that have associated customer order records cannot be deleted to maintain
              historical transaction integrity. In such cases, you can deactivate the product instead.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors focus:outline-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-800 disabled:opacity-60 shadow-xs cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
