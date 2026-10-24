import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { generateSlug } from '../../utils/formatters';

/**
 * Reusable Product Form Modal for Adding and Editing Products
 */
export default function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  productToEdit = null,
  categories = [],
  isSubmitting = false,
  onManageImages = null,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('Collections by Chandni');
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setTitle(productToEdit.title || '');
      setDescription(productToEdit.description || '');
      setCategoryId(productToEdit.categoryId || '');
      setBrand(productToEdit.brand || 'Collections by Chandni');
      setFeatured(productToEdit.featured ?? false);
      setIsActive(productToEdit.isActive ?? true);
    } else {
      setTitle('');
      setDescription('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setBrand('Collections by Chandni');
      setFeatured(false);
      setIsActive(true);
    }
    setError('');
  }, [productToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const isEditMode = Boolean(productToEdit);
  const slugPreview = generateSlug(title);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Product title is required');
      return;
    }

    if (title.trim().length > 150) {
      setError('Product title must not exceed 150 characters');
      return;
    }

    if (!categoryId) {
      setError('Category selection is required');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        brand: brand.trim() || 'Collections by Chandni',
        featured,
        isActive,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
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
              {isEditMode ? 'Catalog Maintenance' : 'New Creation'}
            </span>
            <h2 id="product-modal-title" className="font-serif text-xl sm:text-2xl font-semibold text-stone-900">
              {isEditMode ? `Edit ${productToEdit.title}` : 'Add New Product'}
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
          {/* Product Title */}
          <div className="space-y-1.5">
            <label htmlFor="prod-title" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Product Title <span className="text-rose-600">*</span>
            </label>
            <input
              id="prod-title"
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Handcrafted Resham Kurti"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            />
            {/* Slug Preview */}
            <div className="flex items-center space-x-1.5 text-[11px] text-stone-500 font-mono pt-0.5">
              <span className="text-stone-400">Slug:</span>
              <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">
                {slugPreview || '—'}
              </span>
            </div>
          </div>

          {/* Category Select */}
          <div className="space-y-1.5">
            <label htmlFor="prod-cat" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Category <span className="text-rose-600">*</span>
            </label>
            <select
              id="prod-cat"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            >
              <option value="" disabled>Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `↳ ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="space-y-1.5">
            <label htmlFor="prod-brand" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Brand
            </label>
            <input
              id="prod-brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Collections by Chandni"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="prod-desc" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Description <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of silhouettes, embroidery, and artisanal craftsmanship..."
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors resize-none"
            />
          </div>

          {/* Checkboxes: Featured & Active */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <input
                id="prod-featured"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-rose-800 focus:ring-rose-600 cursor-pointer"
              />
              <label htmlFor="prod-featured" className="text-xs font-medium text-stone-800 cursor-pointer">
                Featured Product (showcased in homepage boutique highlights)
              </label>
            </div>

            <div className="flex items-center space-x-2.5">
              <input
                id="prod-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-rose-800 focus:ring-rose-600 cursor-pointer"
              />
              <label htmlFor="prod-active" className="text-xs font-medium text-stone-800 cursor-pointer">
                Active Product (visible to customers across public storefront)
              </label>
            </div>
          </div>

          {/* Product Media & Gallery Section */}
          <div className="pt-2">
            {isEditMode ? (
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900">Product Images & Gallery</h4>
                      <p className="text-[11px] text-stone-500">
                        {productToEdit.images?.length || 0} of 10 photos uploaded
                      </p>
                    </div>
                  </div>
                  {onManageImages && (
                    <button
                      type="button"
                      onClick={() => onManageImages(productToEdit)}
                      className="inline-flex items-center space-x-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-50 transition-colors shadow-xs cursor-pointer"
                    >
                      <ImageIcon size={13} />
                      <span>Manage Gallery</span>
                    </button>
                  )}
                </div>

                {/* Thumbnail strip preview */}
                {productToEdit.images && productToEdit.images.length > 0 && (
                  <div className="flex items-center space-x-2 overflow-x-auto pt-1 pb-0.5">
                    {productToEdit.images.slice(0, 5).map((img, idx) => (
                      <div key={img.id || idx} className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                        <img
                          src={img.imageUrl}
                          alt={img.altText || 'Thumbnail'}
                          className="h-full w-full object-cover"
                        />
                        {img.isPrimary && (
                          <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-[8px] font-bold text-white text-center leading-tight">
                            PRIMARY
                          </span>
                        )}
                      </div>
                    ))}
                    {productToEdit.images.length > 5 && (
                      <span className="text-[11px] text-stone-400 font-medium pl-1">
                        +{productToEdit.images.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 flex items-start space-x-3">
                <ImageIcon size={18} className="text-stone-400 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-600 space-y-0.5">
                  <span className="font-semibold text-stone-800">Product Photos:</span>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Save this product details first. Once created, you can upload high-resolution images, set primary pictures, and arrange the gallery.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-5 border-t border-stone-100">
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
                <span>{isEditMode ? 'Update Product' : 'Create Product'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
