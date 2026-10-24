import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { generateSlug } from '../../utils/formatters';

// Simple fallback slug generator for client-side preview
function clientGenerateSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Category Form Modal for Creating & Editing Categories
 */
export default function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  categoryToEdit = null,
  availableParents = [],
  isSubmitting = false,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [imgLoadError, setImgLoadError] = useState(false);

  // Sync state when modal opens or categoryToEdit changes
  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || '');
      setDescription(categoryToEdit.description || '');
      setImageUrl(categoryToEdit.imageUrl || '');
      setParentId(categoryToEdit.parentId || '');
      setIsActive(categoryToEdit.isActive ?? true);
    } else {
      setName('');
      setDescription('');
      setImageUrl('');
      setParentId('');
      setIsActive(true);
    }
    setError('');
    setImgLoadError(false);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const isEditMode = Boolean(categoryToEdit);
  const slugPreview = clientGenerateSlug(name);

  // Filter out the category itself from available parents to prevent immediate self-parenting
  const validParents = availableParents.filter(
    (p) => !categoryToEdit || p.id !== categoryToEdit.id
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    if (name.trim().length > 100) {
      setError('Category name must not exceed 100 characters');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        parentId: parentId || null,
        isActive,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200/90 z-10 transition-all max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
              {isEditMode ? 'Edit Record' : 'New Classification'}
            </span>
            <h2 id="modal-title" className="font-serif text-xl sm:text-2xl font-semibold text-stone-900">
              {isEditMode ? `Edit ${categoryToEdit.name}` : 'Add New Category'}
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
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Category Name */}
          <div className="space-y-1.5">
            <label htmlFor="cat-name" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Category Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="cat-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kurtis, Sarees, Bangles"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            />
            {/* Live Slug Preview */}
            <div className="flex items-center space-x-1.5 text-[11px] text-stone-500 font-mono pt-0.5">
              <span className="text-stone-400">Slug:</span>
              <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">
                {slugPreview || '—'}
              </span>
            </div>
          </div>

          {/* Parent Category */}
          <div className="space-y-1.5">
            <label htmlFor="cat-parent" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Parent Category
            </label>
            <select
              id="cat-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            >
              <option value="">None (Top-Level Category)</option>
              {validParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parentId ? `↳ ${p.name}` : p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-stone-400">
              Assign to create hierarchical subcategories (e.g. Kurtis under Women).
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="cat-desc" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Description <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="cat-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief editorial summary of the pieces in this boutique line..."
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors resize-none"
            />
          </div>

          {/* Image URL & Live Preview */}
          <div className="space-y-2">
            <label htmlFor="cat-image" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Image URL <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <input
              id="cat-image"
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImgLoadError(false);
              }}
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            />

            {/* Image Preview Box */}
            {imageUrl && (
              <div className="flex items-center space-x-3 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-stone-200 border border-stone-300">
                  {!imgLoadError ? (
                    <img
                      src={imageUrl}
                      alt="Category preview"
                      onError={() => setImgLoadError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-400 text-[10px]">
                      Failed
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs text-stone-500">
                  <p className="font-medium text-stone-700">Image Preview</p>
                  <p className="truncate text-[11px] text-stone-400 font-mono">{imageUrl}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Checkbox */}
          <div className="flex items-center space-x-2.5 pt-1">
            <input
              id="cat-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-rose-800 focus:ring-rose-600 cursor-pointer"
            />
            <label htmlFor="cat-active" className="text-xs font-medium text-stone-800 cursor-pointer">
              Active Category (visible across storefront and navigation)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors focus:outline-none"
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
                <span>{isEditMode ? 'Update Category' : 'Create Category'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
