import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Upload,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Plus,
} from 'lucide-react';
import * as productImageService from '../../services/productImageService';

/**
 * ProductImageGalleryModal
 * Complete image gallery management modal supporting upload, reordering,
 * primary image designation, alt text editing, and safe deletion.
 */
export default function ProductImageGalleryModal({
  isOpen,
  onClose,
  product = null,
  onImagesUpdated = () => {},
}) {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Storage provider status
  const [storageStatus, setStorageStatus] = useState({ configured: false, cloudName: null });
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Staged files for upload
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Reorder and mutation loading states
  const [mutatingId, setMutatingId] = useState(null);
  const [editingAltId, setEditingAltId] = useState(null);
  const [editingAltText, setEditingAltText] = useState('');

  // Delete confirmation
  const [deletingImage, setDeletingImage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const fileInputRef = useRef(null);

  // Load storage provider status
  const checkStorageStatus = useCallback(async () => {
    try {
      const res = await productImageService.getStorageStatus();
      if (res?.data) {
        setStorageStatus(res.data);
      }
    } catch (e) {
      console.warn('Could not fetch storage status:', e);
    }
  }, []);

  // Fetch images for product
  const loadImages = useCallback(async () => {
    if (!product?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await productImageService.getProductImages(product.id);
      if (res?.data) {
        setImages(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load product images');
    } finally {
      setIsLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadImages();
      checkStorageStatus();
      setStagedFiles([]);
      setFeedback({ type: '', message: '' });
      setError('');
    }
  }, [isOpen, product?.id, loadImages, checkStorageStatus]);

  // Clear feedback banner after 4 seconds
  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  if (!isOpen || !product) return null;

  const currentCount = images.length;
  const maxAllowed = 10;
  const remainingSlots = Math.max(0, maxAllowed - currentCount);

  // File staging & validation
  const handleFilesSelected = (selectedFileList) => {
    setError('');
    if (!selectedFileList || selectedFileList.length === 0) return;

    const files = Array.from(selectedFileList);
    const validFiles = [];

    for (const file of files) {
      // Check MIME type
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowed.includes(file.type.toLowerCase())) {
        setError(`"${file.name}" has an unsupported format. Only JPEG, PNG, and WebP are permitted.`);
        return;
      }

      // Check size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB limit.`);
        return;
      }

      validFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
        altText: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        sizeKB: Math.round(file.size / 1024),
      });
    }

    if (currentCount + stagedFiles.length + validFiles.length > maxAllowed) {
      setError(`Cannot add more images. Maximum ${maxAllowed} images per product.`);
      return;
    }

    setStagedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveStaged = (index) => {
    setStagedFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpdateStagedAlt = (index, text) => {
    setStagedFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, altText: text } : item))
    );
  };

  // Upload staged files
  const handleUploadStaged = async () => {
    if (stagedFiles.length === 0) return;
    setIsUploading(true);
    setError('');

    try {
      const files = stagedFiles.map((s) => s.file);
      const altTexts = stagedFiles.map((s) => s.altText);

      await productImageService.uploadProductImages(product.id, files, altTexts);

      // Clean preview URLs
      stagedFiles.forEach((s) => {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      });
      setStagedFiles([]);

      setFeedback({
        type: 'success',
        message: `${files.length} ${files.length === 1 ? 'image' : 'images'} uploaded successfully.`,
      });

      await loadImages();
      onImagesUpdated();
    } catch (err) {
      setError(err.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  // Set primary image
  const handleSetPrimary = async (imageId) => {
    setMutatingId(imageId);
    try {
      const res = await productImageService.setPrimaryImage(product.id, imageId);
      if (res?.data) {
        setImages(res.data);
      }
      setFeedback({ type: 'success', message: 'Primary product image updated.' });
      onImagesUpdated();
    } catch (err) {
      setError(err.message || 'Failed to update primary image');
    } finally {
      setMutatingId(null);
    }
  };

  // Reorder images
  const handleMoveImage = async (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newOrder = [...images];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Optimistically update UI
    setImages(newOrder);

    try {
      const imageIds = newOrder.map((img) => img.id);
      const res = await productImageService.reorderProductImages(product.id, imageIds);
      if (res?.data) {
        setImages(res.data);
      }
      setFeedback({ type: 'success', message: 'Image order saved.' });
      onImagesUpdated();
    } catch (err) {
      setError(err.message || 'Failed to reorder images');
      await loadImages(); // rollback
    }
  };

  // Save edited alt text
  const handleSaveAltText = async (imageId) => {
    setMutatingId(imageId);
    try {
      await productImageService.updateImageAltText(product.id, imageId, editingAltText);
      setImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, altText: editingAltText } : img))
      );
      setEditingAltId(null);
      setFeedback({ type: 'success', message: 'Alt text updated.' });
    } catch (err) {
      setError(err.message || 'Failed to update alt text');
    } finally {
      setMutatingId(null);
    }
  };

  // Delete image
  const handleConfirmDelete = async () => {
    if (!deletingImage) return;
    setIsDeleting(true);
    try {
      await productImageService.deleteProductImage(product.id, deletingImage.id);
      setFeedback({ type: 'success', message: 'Image removed from gallery.' });
      setDeletingImage(null);
      await loadImages();
      onImagesUpdated();
    } catch (err) {
      setError(err.message || 'Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-4xl rounded-2xl bg-white p-5 sm:p-7 shadow-2xl border border-stone-200 z-10 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                  Media Atelier
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-[11px] font-mono text-stone-500 font-medium">
                  {currentCount} of {maxAllowed} images
                </span>
              </div>
              <h2 id="gallery-modal-title" className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 mt-0.5">
                {product.title}
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

          {/* Feedback & Error Alerts */}
          {feedback.message && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 animate-fadeIn">
              <span className="font-medium">{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback({ type: '', message: '' })}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start space-x-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <span className="font-medium">{error}</span>
                {error.includes('CLOUDINARY') && (
                  <button
                    type="button"
                    onClick={() => setShowConfigHelp(true)}
                    className="ml-2 font-semibold underline text-rose-900 hover:text-rose-700"
                  >
                    View Setup Instructions
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Storage Provider Status Notice */}
          {!storageStatus.configured ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start justify-between">
              <div className="flex items-start space-x-2.5">
                <HelpCircle size={16} className="shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <strong className="font-semibold text-amber-950">Cloudinary Not Yet Configured in .env</strong>
                  <p className="mt-0.5 text-amber-800">
                    Image uploads require <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">CLOUDINARY_CLOUD_NAME</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">CLOUDINARY_API_KEY</code>, and <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">CLOUDINARY_API_SECRET</code>. Existing gallery photos can still be viewed, reordered, or set as primary.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigHelp((v) => !v)}
                className="shrink-0 text-xs font-semibold text-amber-900 underline hover:text-amber-800 ml-3"
              >
                {showConfigHelp ? 'Hide Guide' : 'Setup Guide'}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-stone-50 border border-stone-200 px-3 py-1.5 text-xs text-stone-600">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-stone-800">Cloud Storage Active:</span>
                <span className="font-mono text-stone-600">{storageStatus.cloudName}</span>
              </div>
              <span className="text-[11px] text-stone-500">5 MB max • JPEG / PNG / WebP</span>
            </div>
          )}

          {/* Expandable Cloudinary Configuration Guide */}
          {showConfigHelp && (
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-900 p-4 text-xs text-stone-300 space-y-2">
              <div className="flex items-center justify-between text-white font-semibold">
                <span>How to configure Cloudinary for Collections by Chandni:</span>
                <button
                  type="button"
                  onClick={() => setShowConfigHelp(false)}
                  className="text-stone-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed text-stone-300">
                <li>Create a free account at <strong className="text-white">cloudinary.com</strong>.</li>
                <li>From your Cloudinary Dashboard, copy the <strong>Cloud Name</strong>, <strong>API Key</strong>, and <strong>API Secret</strong>.</li>
                <li>Add them to your project's <code className="text-amber-300">.env</code> file:</li>
              </ol>
              <pre className="bg-black/60 p-2.5 rounded font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret`}
              </pre>
              <p className="text-[11px] text-stone-400">
                Restart the development server after updating your .env file to activate live uploads.
              </p>
            </div>
          )}

          {/* Scrollable Gallery & Upload Area */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Upload & Drag-and-Drop Dropzone */}
            {remainingSlots > 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) {
                    handleFilesSelected(e.dataTransfer.files);
                  }
                }}
                className={`relative rounded-2xl border-2 border-dashed p-6 transition-all text-center ${
                  isDragOver
                    ? 'border-rose-500 bg-rose-50/50 scale-[1.01]'
                    : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = ''; // reset so same file can be re-selected
                  }}
                  className="hidden"
                  id="product-images-file-input"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-800 shadow-xs">
                    <Upload size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900">
                      Drag & drop product images here, or{' '}
                      <label
                        htmlFor="product-images-file-input"
                        className="text-rose-800 underline cursor-pointer hover:text-rose-900"
                      >
                        browse files
                      </label>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Accepts JPEG, PNG, or WebP up to 5 MB each ({remainingSlots} {remainingSlots === 1 ? 'slot' : 'slots'} available)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-center text-xs text-stone-600">
                <span className="font-semibold text-stone-800">Gallery Full:</span> Maximum 10 images limit reached. Delete an image to upload new media.
              </div>
            )}

            {/* Staged Upload Previews (Ready to upload) */}
            {stagedFiles.length > 0 && (
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-stone-900">
                      Staged for Upload ({stagedFiles.length})
                    </span>
                    <span className="text-[11px] text-stone-500">
                      — Add optional alt text descriptions
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStagedFiles([])}
                    className="text-xs text-stone-500 hover:text-stone-800"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stagedFiles.map((staged, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-3 rounded-xl bg-white border border-stone-200 p-2.5 shadow-xs"
                    >
                      <img
                        src={staged.previewUrl}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover bg-stone-100 border border-stone-200"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-medium text-stone-900">
                            {staged.file.name}
                          </p>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {staged.sizeKB} KB
                          </span>
                        </div>
                        <input
                          type="text"
                          value={staged.altText}
                          onChange={(e) => handleUpdateStagedAlt(idx, e.target.value)}
                          placeholder="Alt description..."
                          className="w-full rounded border border-stone-300 px-2 py-1 text-[11px] text-stone-800 placeholder-stone-400 focus:border-rose-600 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaged(idx)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        aria-label="Remove staged image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleUploadStaged}
                    disabled={isUploading}
                    className="inline-flex items-center justify-center space-x-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-60 transition-colors shadow-xs cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-1.5" />
                        <span>Uploading to Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} className="mr-1.5" />
                        <span>Confirm & Upload {stagedFiles.length} {stagedFiles.length === 1 ? 'Image' : 'Images'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Current Product Image Gallery */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Current Gallery Images ({images.length})
                </span>
                <span className="text-[11px] text-stone-400">
                  Use arrows to reorder • First or starred image is Primary
                </span>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-stone-400 space-y-2">
                  <Loader2 size={24} className="animate-spin text-rose-700" />
                  <span className="text-xs">Loading images...</span>
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-2">
                    <ImageIcon size={22} />
                  </div>
                  <p className="text-xs font-medium text-stone-700">No images yet for this product</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Upload up to 10 photos showcasing front drape, motifs, and craftsmanship.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, index) => {
                    const isPrimary = Boolean(img.isPrimary || index === 0);
                    const isFirst = index === 0;
                    const isLast = index === images.length - 1;
                    const isEditingAlt = editingAltId === img.id;
                    const isItemMutating = mutatingId === img.id;

                    return (
                      <div
                        key={img.id}
                        className={`group relative rounded-xl border bg-white p-2 flex flex-col transition-all shadow-xs ${
                          isPrimary
                            ? 'border-amber-400/90 ring-2 ring-amber-300/40'
                            : 'border-stone-200/90 hover:border-stone-300'
                        }`}
                      >
                        {/* Thumbnail with Click to Zoom */}
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-stone-100 border border-stone-200/60">
                          <img
                            src={img.imageUrl}
                            alt={img.altText || 'Product image'}
                            loading="lazy"
                            onClick={() => setPreviewImageUrl(img.imageUrl)}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                          />

                          {/* Primary Badge */}
                          {isPrimary && (
                            <span className="absolute top-2 left-2 inline-flex items-center space-x-1 rounded-md bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                              <Star size={11} className="fill-white" />
                              <span>PRIMARY</span>
                            </span>
                          )}

                          {/* Order Pill */}
                          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white backdrop-blur-xs">
                            #{index + 1}
                          </span>

                          {/* Delete Trigger */}
                          <button
                            type="button"
                            onClick={() => setDeletingImage(img)}
                            aria-label="Delete image"
                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-stone-500 hover:text-rose-600 hover:bg-white shadow-xs transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Card Controls */}
                        <div className="mt-2.5 space-y-2 flex-1 flex flex-col justify-between">
                          {/* Alt Text Row */}
                          {isEditingAlt ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editingAltText}
                                onChange={(e) => setEditingAltText(e.target.value)}
                                placeholder="Image alt text..."
                                className="w-full rounded border border-rose-500 px-2 py-1 text-[11px] text-stone-900 focus:outline-none"
                              />
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingAltId(null)}
                                  className="text-[10px] text-stone-500 hover:text-stone-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveAltText(img.id)}
                                  disabled={isItemMutating}
                                  className="inline-flex items-center space-x-1 text-[10px] font-semibold text-rose-800 hover:text-rose-900"
                                >
                                  <Check size={12} />
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[11px] text-stone-600">
                              <span className="truncate pr-1 italic text-stone-500" title={img.altText || 'No alt text'}>
                                {img.altText ? `"${img.altText}"` : 'No alt text'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAltId(img.id);
                                  setEditingAltText(img.altText || '');
                                }}
                                title="Edit alt text"
                                className="text-stone-400 hover:text-stone-700 shrink-0"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}

                          {/* Reorder and Primary Actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                            {/* Reorder Buttons */}
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveImage(index, -1)}
                                title="Move earlier"
                                className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <ChevronLeft size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveImage(index, 1)}
                                title="Move later"
                                className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <ChevronRight size={13} />
                              </button>
                            </div>

                            {/* Set Primary Button */}
                            {!isPrimary && (
                              <button
                                type="button"
                                disabled={isItemMutating}
                                onClick={() => handleSetPrimary(img.id)}
                                className="text-[10px] font-semibold text-stone-600 hover:text-amber-700 flex items-center space-x-1"
                              >
                                <Star size={11} />
                                <span>Set Primary</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-stone-100">
            <span className="text-[11px] text-stone-500">
              Product ID: <code className="font-mono text-stone-700">{product.id}</code>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs"
            onClick={() => setDeletingImage(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 z-10 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Delete Product Image?
              </h3>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                This image will be permanently removed from storage and the gallery. If this was the primary image, another photo will be promoted to primary.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingImage(null)}
                disabled={isDeleting}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-lg bg-rose-800 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Image</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImageUrl}
              alt="Enlarged preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-stone-300 p-1"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
