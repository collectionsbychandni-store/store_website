import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Upload,
  Link2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { uploadCategoryImage } from '../../services/categoryService';

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
 * Category Form Modal with File Upload & Live Preview
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
  const [uploadError, setUploadError] = useState('');
  const [imgLoadError, setImgLoadError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const fileInputRef = useRef(null);

  // Sync state when modal opens or categoryToEdit changes
  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || '');
      setDescription(categoryToEdit.description || '');
      setImageUrl(categoryToEdit.imageUrl || '');
      setParentId(categoryToEdit.parentId || '');
      setIsActive(categoryToEdit.isActive ?? true);
      setImageMode(categoryToEdit.imageUrl?.startsWith('http') && !categoryToEdit.imageUrl?.includes('/uploads/') ? 'url' : 'upload');
    } else {
      setName('');
      setDescription('');
      setImageUrl('');
      setParentId('');
      setIsActive(true);
      setImageMode('upload');
    }
    setError('');
    setUploadError('');
    setImgLoadError(false);
    setIsUploading(false);
    setIsDragOver(false);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const isEditMode = Boolean(categoryToEdit);
  const slugPreview = clientGenerateSlug(name);

  // Filter out category itself to prevent cycles
  const validParents = availableParents.filter(
    (p) => !categoryToEdit || p.id !== categoryToEdit.id
  );

  // File upload processor
  const processFileUpload = async (file) => {
    if (!file) return;

    setUploadError('');
    setError('');

    // Pre-validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setUploadError(`Invalid image format "${file.type}". Allowed formats: JPEG, PNG, and WebP.`);
      return;
    }

    // Pre-validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image exceeds the maximum allowed size of 5 MB.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadCategoryImage(file);
      if (res?.data?.imageUrl) {
        setImageUrl(res.data.imageUrl);
        setImgLoadError(false);
      } else {
        throw new Error('Server did not return a valid image URL');
      }
    } catch (err) {
      setUploadError(
        err.message || 'Image upload failed. You can also paste a direct image URL.'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImgLoadError(false);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#781D42]">
              {isEditMode ? 'Edit Classification' : 'New Classification'}
            </span>
            <h2 id="modal-title" className="font-serif text-xl sm:text-2xl font-semibold text-stone-900">
              {isEditMode ? `Edit ${categoryToEdit.name}` : 'Add New Category'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Error Alert */}
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
              Category Name <span className="text-[#781D42]">*</span>
            </label>
            <input
              id="cat-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kurtis, Sarees, Bangles, Lehengas"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#781D42] focus:outline-none focus:ring-1 focus:ring-[#781D42] transition-colors"
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
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-[#781D42] focus:outline-none focus:ring-1 focus:ring-[#781D42] transition-colors"
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
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#781D42] focus:outline-none focus:ring-1 focus:ring-[#781D42] transition-colors resize-none"
            />
          </div>

          {/* CATEGORY IMAGE SECTION: UPLOAD & URL MODES */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Category Image <span className="text-stone-400 font-normal">(Recommended)</span>
              </label>

              {/* Toggle Mode: Upload vs URL */}
              <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`inline-flex items-center space-x-1 rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                    imageMode === 'upload'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Upload size={12} />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`inline-flex items-center space-x-1 rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                    imageMode === 'url'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Link2 size={12} />
                  <span>Image URL</span>
                </button>
              </div>
            </div>

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="flex items-start space-x-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Current Image Preview Card if imageUrl is present */}
            {imageUrl ? (
              <div className="relative rounded-xl border border-stone-200 bg-[#FAF9F5] p-3 transition-all">
                <div className="flex items-start space-x-3.5">
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-200 border border-stone-300">
                    {!imgLoadError ? (
                      <img
                        src={imageUrl}
                        alt="Category preview"
                        onError={() => setImgLoadError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-stone-400 text-[10px]">
                        <ImageIcon size={18} className="mb-0.5" />
                        <span>Preview failed</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-medium">
                      <CheckCircle2 size={14} />
                      <span>Image Ready</span>
                    </div>
                    <p className="truncate text-[11px] text-stone-500 font-mono" title={imageUrl}>
                      {imageUrl}
                    </p>
                    <div className="pt-1 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-stone-700 hover:text-stone-950 underline cursor-pointer"
                      >
                        <Upload size={11} />
                        <span>Replace</span>
                      </button>
                      <span className="text-stone-300">·</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={isUploading}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                      >
                        <Trash2 size={11} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : imageMode === 'upload' ? (
              /* Drag & Drop Upload Dropzone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-[#781D42] bg-[#781D42]/5'
                    : 'border-stone-300 bg-stone-50/60 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center space-y-2 py-2">
                    <Loader2 size={24} className="animate-spin text-[#781D42]" />
                    <p className="text-xs font-semibold text-stone-800">Uploading Category Image...</p>
                    <p className="text-[11px] text-stone-500">Optimizing format and resolution</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-2xs border border-stone-200 text-stone-600">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-800">
                        Click to upload <span className="font-normal text-stone-500">or drag & drop</span>
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        High-resolution JPEG, PNG, or WebP (max 5 MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Image URL Input */
              <div className="space-y-1.5">
                <input
                  id="cat-image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImgLoadError(false);
                  }}
                  placeholder="Paste direct image URL (https://... or /images/...)"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#781D42] focus:outline-none focus:ring-1 focus:ring-[#781D42] transition-colors"
                />
                <p className="text-[11px] text-stone-400">
                  Provide an external CDN image link, Unsplash photo, or existing asset path.
                </p>
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
              className="h-4 w-4 rounded border-stone-300 text-[#781D42] focus:ring-[#781D42] cursor-pointer"
            />
            <label htmlFor="cat-active" className="text-xs font-medium text-stone-800 cursor-pointer">
              Active Category (visible across storefront, navigation, and shop filters)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors focus:outline-none focus:ring-1 focus:ring-stone-950 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  <span>Saving Category...</span>
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

