import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Calendar,
  Link as LinkIcon,
  Check,
  Smartphone,
  Monitor,
} from 'lucide-react';
import * as bannerService from '../../services/bannerService';

/**
 * BannerFormModal
 * Modal for creating and editing storefront banners.
 * Supports image file uploads (JPEG/PNG/WebP <= 5MB) and direct URLs,
 * destination validation, display ordering, and date scheduling.
 */
export default function BannerFormModal({
  isOpen,
  onClose,
  onSubmit,
  bannerToEdit = null,
  isSubmitting = false,
}) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [desktopImageUrl, setDesktopImageUrl] = useState('');
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [imagePublicId, setImagePublicId] = useState('');
  const [buttonText, setButtonText] = useState('Shop Collection');
  const [destinationUrl, setDestinationUrl] = useState('/shop');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Upload states
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (bannerToEdit) {
      setTitle(bannerToEdit.title || '');
      setSubtitle(bannerToEdit.subtitle || '');
      setDesktopImageUrl(bannerToEdit.desktopImageUrl || bannerToEdit.imageUrl || '');
      setMobileImageUrl(bannerToEdit.mobileImageUrl || '');
      setImagePublicId(bannerToEdit.imagePublicId || '');
      setButtonText(bannerToEdit.buttonText || 'Shop Collection');
      setDestinationUrl(bannerToEdit.destinationUrl || bannerToEdit.buttonLink || '/shop');
      setDisplayOrder(String(bannerToEdit.displayOrder ?? bannerToEdit.sortOrder ?? 1));
      setIsActive(bannerToEdit.isActive ?? true);
      // Format ISO dates for datetime-local: YYYY-MM-DDTHH:mm
      setStartDate(bannerToEdit.startDate ? bannerToEdit.startDate.slice(0, 16) : '');
      setEndDate(bannerToEdit.endDate ? bannerToEdit.endDate.slice(0, 16) : '');
    } else {
      setTitle('');
      setSubtitle('');
      setDesktopImageUrl('');
      setMobileImageUrl('');
      setImagePublicId('');
      setButtonText('Shop Collection');
      setDestinationUrl('/shop');
      setDisplayOrder('1');
      setIsActive(true);
      setStartDate('');
      setEndDate('');
    }
    setUploadError('');
    setValidationError('');
  }, [bannerToEdit, isOpen]);

  if (!isOpen) return null;

  // File upload handler for desktop or mobile
  const handleFileUpload = async (e, type = 'desktop') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be chosen again if needed
    e.target.value = '';

    setUploadError('');
    setValidationError('');

    // Pre-validate file type & size in browser
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setUploadError(`Invalid format "${file.type}". Allowed formats: JPEG, PNG, and WebP.`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds the maximum allowed size of 5 MB.');
      return;
    }

    if (type === 'desktop') setIsUploadingDesktop(true);
    else setIsUploadingMobile(true);

    try {
      const res = await bannerService.uploadBannerImage(file);
      if (res?.data?.imageUrl) {
        if (type === 'desktop') {
          setDesktopImageUrl(res.data.imageUrl);
          if (res.data.publicId) setImagePublicId(res.data.publicId);
        } else {
          setMobileImageUrl(res.data.imageUrl);
        }
      }
    } catch (err) {
      setUploadError(err.message || 'Image upload failed. If Cloudinary credentials are not configured, you can enter a direct image URL.');
    } finally {
      if (type === 'desktop') setIsUploadingDesktop(false);
      else setIsUploadingMobile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    setUploadError('');

    // Validate title
    if (!title.trim()) {
      setValidationError('Banner title is required.');
      return;
    }

    // Validate desktop image
    if (!desktopImageUrl.trim()) {
      setValidationError('Desktop banner image is required. Please upload an image or provide a valid URL.');
      return;
    }

    // Validate destination URL
    const dest = destinationUrl.trim().toLowerCase();
    if (
      dest.startsWith('javascript:') ||
      dest.startsWith('data:') ||
      dest.startsWith('vbscript:') ||
      dest.includes('<script')
    ) {
      setValidationError('Invalid destination URL. Unsafe schemes (such as javascript:) are prohibited.');
      return;
    }

    // Validate dates
    if (startDate && endDate) {
      const s = new Date(startDate);
      const end = new Date(endDate);
      if (s >= end) {
        setValidationError('Start date/time must precede end date/time.');
        return;
      }
    }

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      imageUrl: desktopImageUrl.trim(),
      desktopImageUrl: desktopImageUrl.trim(),
      mobileImageUrl: mobileImageUrl.trim() || null,
      imagePublicId: imagePublicId.trim() || null,
      buttonText: buttonText.trim() || 'Shop Collection',
      destinationUrl: destinationUrl.trim() || '/shop',
      buttonLink: destinationUrl.trim() || '/shop',
      displayOrder: parseInt(displayOrder, 10) || 0,
      sortOrder: parseInt(displayOrder, 10) || 0,
      isActive: Boolean(isActive),
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#FAF9F5]">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              {bannerToEdit ? 'Edit Homepage Banner' : 'Create New Homepage Banner'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Configure editorial hero photography, headline typography, and scheduling.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Validation & Upload Errors */}
          {(validationError || uploadError) && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{validationError || uploadError}</div>
            </div>
          )}

          {/* Section: Typography */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Headline / Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grace in Every Thread, Royalty in Every Detail"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-800 focus:border-rose-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Subheadline / Narrative
              </label>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={2}
                placeholder="e.g., Handcrafted Indian ethnic kurtis, festive couture, and artisanal jewellery."
                className="w-full px-3.5 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-800 focus:border-rose-800 resize-none"
              />
            </div>
          </div>

          {/* Section: Desktop Image Upload */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Monitor size={14} className="text-stone-500" />
                <span>Desktop Image (16:9 or 16:10 aspect ratio)</span>
                <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-stone-400">JPEG, PNG, WebP · max 5MB</span>
            </div>

            {/* Upload or URL input */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shadow-2xs shrink-0">
                {isUploadingDesktop ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-rose-800" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} className="text-stone-500" />
                    <span>Upload Image</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e, 'desktop')}
                  className="hidden"
                  disabled={isUploadingDesktop || isSubmitting}
                />
              </label>

              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={desktopImageUrl}
                  onChange={(e) => setDesktopImageUrl(e.target.value)}
                  placeholder="Or paste direct image URL (/images/..., https://...)"
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-800"
                />
              </div>
            </div>

            {/* Desktop Preview */}
            {desktopImageUrl && (
              <div className="relative mt-2 aspect-[16/8] w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                <img
                  src={desktopImageUrl}
                  alt="Desktop Banner Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/images/chandni_hero_banner_1792063871455.jpg';
                  }}
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono">
                  Desktop Preview
                </span>
              </div>
            )}
          </div>

          {/* Section: Optional Mobile Image */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Smartphone size={14} className="text-stone-500" />
                <span>Mobile Image (Optional)</span>
              </label>
              <span className="text-[11px] text-stone-400">Defaults to desktop image if blank</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shadow-2xs shrink-0">
                {isUploadingMobile ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-rose-800" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} className="text-stone-500" />
                    <span>Upload Mobile</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e, 'mobile')}
                  className="hidden"
                  disabled={isUploadingMobile || isSubmitting}
                />
              </label>

              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={mobileImageUrl}
                  onChange={(e) => setMobileImageUrl(e.target.value)}
                  placeholder="Mobile image URL (optional)"
                  className="w-full px-3.5 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-800"
                />
              </div>
            </div>
          </div>

          {/* Section: Button Text & Destination URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Shop Collection"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Destination Link
              </label>
              <input
                type="text"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="/shop, /shop?category=..., or https://..."
                className="w-full px-3.5 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-800"
              />
            </div>
          </div>

          {/* Section: Display Order & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100 items-center">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Display Order (Sequence)
              </label>
              <input
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full px-3.5 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-800"
              />
              <span className="text-[11px] text-stone-400 mt-0.5 block">
                Lower numbers appear first in the homepage carousel.
              </span>
            </div>

            <div className="flex items-center space-x-3 pt-4 sm:pt-0">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-xs font-semibold text-stone-800">
                  {isActive ? 'Published / Active' : 'Draft / Inactive'}
                </span>
              </label>
            </div>
          </div>

          {/* Section: Optional Scheduling */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-700 uppercase tracking-wider">
              <Calendar size={14} className="text-stone-500" />
              <span>Campaign Scheduling (Optional)</span>
            </div>
            <p className="text-[11px] text-stone-400">
              Leave dates blank to keep the banner active indefinitely. If set, the banner automatically activates on the start date and unpublishes on the end date.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Start Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  End Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-800"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isUploadingDesktop || isUploadingMobile}
              className="px-5 py-2 bg-rose-900 text-white rounded-lg text-xs font-semibold hover:bg-rose-950 transition-colors shadow-xs inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Banner...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{bannerToEdit ? 'Save Changes' : 'Create Banner'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
