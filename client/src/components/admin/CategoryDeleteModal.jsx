import React from 'react';
import { AlertTriangle, AlertCircle, Loader2, X } from 'lucide-react';

/**
 * Category Delete Confirmation Modal
 * Handles referential integrity feedback (409 Conflict) gracefully.
 */
export default function CategoryDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  category = null,
  isDeleting = false,
  errorMessage = '',
}) {
  if (!isOpen || !category) return null;

  const hasChildren = category._count?.children > 0;
  const hasProducts = category._count?.products > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200/90 z-10 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2 text-rose-800">
            <AlertTriangle size={20} className="shrink-0" />
            <h2 id="delete-dialog-title" className="font-serif text-lg font-semibold text-stone-900">
              Delete Category
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

        {/* Dynamic Error Message from Server (e.g. 409 Conflict) */}
        {errorMessage && (
          <div className="mt-4 flex items-start space-x-2.5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Cannot Delete Category</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Warning Body */}
        <div className="mt-4 space-y-3 text-xs text-stone-600">
          <p>
            Are you sure you want to delete{' '}
            <strong className="text-stone-900 font-semibold">"{category.name}"</strong>?
          </p>

          <div className="rounded-lg bg-stone-50 border border-stone-200/70 p-3 space-y-1.5 text-[11px] text-stone-500">
            <p className="font-semibold text-stone-700 uppercase tracking-wider text-[10px]">
              Referential Integrity Rule:
            </p>
            <p>
              Categories containing products or child categories cannot be deleted until their
              relationships are resolved or emptied.
            </p>
            {(hasChildren || hasProducts) && (
              <div className="pt-1.5 font-medium text-amber-800 flex items-center space-x-2">
                <span>Current associations:</span>
                {hasChildren && <span className="bg-amber-100 px-1.5 py-0.5 rounded">{category._count.children} subcategories</span>}
                {hasProducts && <span className="bg-amber-100 px-1.5 py-0.5 rounded">{category._count.products} products</span>}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors focus:outline-none"
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
