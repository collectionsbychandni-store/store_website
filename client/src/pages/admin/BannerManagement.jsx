import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import BannerFormModal from '../../components/admin/BannerFormModal';
import * as bannerService from '../../services/bannerService';
import {
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Eye,
  Calendar,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  SlidersHorizontal,
  Smartphone,
  Monitor,
} from 'lucide-react';

/**
 * Banner Management Page (/admin/banners)
 * Step 18: Homepage Banner Management
 */
export default function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deletingBanner, setDeletingBanner] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBanners = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await bannerService.getBanners(true); // admin request
      if (res?.data) {
        setBanners(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load banners');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Handle Create or Update Submit
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingBanner) {
        await bannerService.updateBanner(editingBanner.id, formData);
        setFeedback({
          type: 'success',
          message: `Banner "${formData.title}" updated successfully.`,
        });
      } else {
        await bannerService.createBanner(formData);
        setFeedback({
          type: 'success',
          message: `New banner "${formData.title}" created successfully.`,
        });
      }
      setIsModalOpen(false);
      setEditingBanner(null);
      await loadBanners();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save banner',
      });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Toggle Status
  const handleToggleStatus = async (banner) => {
    const nextStatus = !banner.isActive;
    try {
      await bannerService.updateBannerStatus(banner.id, nextStatus);
      setFeedback({
        type: 'success',
        message: `Banner "${banner.title}" is now ${nextStatus ? 'Published / Active' : 'Draft / Inactive'}.`,
      });
      await loadBanners();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update banner status',
      });
    }
  };

  // Handle Reordering (Move Up / Move Down)
  const handleMoveOrder = async (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === banners.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newBanners = [...banners];
    const [moved] = newBanners.splice(index, 1);
    newBanners.splice(targetIndex, 0, moved);

    const bannerIds = newBanners.map((b) => b.id);
    try {
      setBanners(newBanners);
      await bannerService.reorderBanners(bannerIds);
      setFeedback({
        type: 'success',
        message: 'Banner display sequence updated.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to reorder banners',
      });
      await loadBanners();
    }
  };

  // Handle Delete Banner
  const handleDeleteConfirm = async () => {
    if (!deletingBanner) return;
    setIsDeleting(true);
    try {
      await bannerService.deleteBanner(deletingBanner.id);
      setFeedback({
        type: 'success',
        message: `Banner "${deletingBanner.title}" was deleted.`,
      });
      setDeletingBanner(null);
      await loadBanners();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete banner',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout pageTitle="Homepage Banner Management">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rose-200/60 bg-white p-6 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                Atelier Storefront Curation
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-800 border border-rose-200">
                Step 18 Active
              </span>
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 mt-1">
              Homepage Banners & Campaigns
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Manage high-couture editorial hero banners, scheduled seasonal collections, and promotional links.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={loadBanners}
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingBanner(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-lg bg-rose-900 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-950 transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={15} className="mr-1.5" />
              <span>Add Banner</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback.message && (
          <div
            className={`rounded-lg p-3.5 text-xs font-medium flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={15} />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback({ type: '', message: '' })}
              className="text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Banners List / Table */}
        <div className="rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
            <h3 className="font-serif text-sm font-semibold text-stone-900">
              Active & Scheduled Banners ({banners.length})
            </h3>
            <span className="text-[11px] text-stone-500">
              Drag or use sequence arrows to adjust homepage hero order
            </span>
          </div>

          {isLoading && banners.length === 0 ? (
            <div className="p-8 space-y-4">
              <div className="h-4 w-48 bg-stone-100 rounded animate-pulse" />
              <div className="space-y-3 pt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 w-full bg-stone-50 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertCircle size={22} />
              </div>
              <h3 className="font-serif text-lg font-medium text-stone-900">Failed to Load Banners</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={loadBanners}
                className="inline-flex items-center text-xs font-semibold text-rose-800 hover:text-rose-950 underline pt-1"
              >
                Try reloading
              </button>
            </div>
          ) : banners.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-400">
                <ImageIcon size={26} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">No Banners Configured</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Create your first promotional campaign banner to welcome clients to the Collections by Chandni boutique.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingBanner(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-900 text-white rounded-lg text-xs font-semibold hover:bg-rose-950 transition-colors"
              >
                <Plus size={14} />
                <span>Create Banner</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider font-semibold text-stone-500 bg-stone-50/70">
                    <th scope="col" className="py-3.5 pl-6 pr-3 w-16 text-center">Order</th>
                    <th scope="col" className="py-3.5 px-4 w-40">Preview</th>
                    <th scope="col" className="py-3.5 px-4">Title & Subtitle</th>
                    <th scope="col" className="py-3.5 px-4">Call to Action</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Scheduling</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Status</th>
                    <th scope="col" className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {banners.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === banners.length - 1;

                    return (
                      <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                        {/* Reorder Arrows & Display Order */}
                        <td className="py-3.5 pl-6 pr-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="font-mono font-bold text-stone-800 text-xs w-4">
                              {item.displayOrder}
                            </span>
                            <div className="flex flex-col space-y-0.5">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveOrder(index, 'up')}
                                title="Move up"
                                className="p-0.5 text-stone-400 hover:text-stone-800 disabled:opacity-20 disabled:cursor-not-allowed"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveOrder(index, 'down')}
                                title="Move down"
                                className="p-0.5 text-stone-400 hover:text-stone-800 disabled:opacity-20 disabled:cursor-not-allowed"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Thumbnail Preview */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="relative h-14 w-28 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs group">
                            <img
                              src={item.desktopImageUrl || item.imageUrl}
                              alt={item.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.src = '/images/chandni_hero_banner_1792063871455.jpg';
                              }}
                            />
                            {item.mobileImageUrl && (
                              <span
                                title="Has mobile-specific banner"
                                className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white flex items-center space-x-0.5"
                              >
                                <Smartphone size={9} />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Title & Subtitle */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-stone-900 text-xs max-w-sm">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-[11px] text-stone-500 line-clamp-1 max-w-sm mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </td>

                        {/* Button Text & Link */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-stone-800 block text-xs">
                            {item.buttonText || 'Shop Collection'}
                          </span>
                          <span className="font-mono text-[10px] text-stone-400 block truncate max-w-[180px]">
                            {item.destinationUrl || item.buttonLink}
                          </span>
                        </td>

                        {/* Scheduling Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {item.scheduleStatus === 'SCHEDULED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Starts {new Date(item.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          ) : item.scheduleStatus === 'EXPIRED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500 border border-stone-200">
                              Expired
                            </span>
                          ) : item.startDate || item.endDate ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Scheduled Active
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">Always Active</span>
                          )}
                        </td>

                        {/* Active / Inactive Toggle */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            title={item.isActive ? 'Click to unpublish' : 'Click to publish'}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                              item.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                item.isActive ? 'bg-emerald-500' : 'bg-stone-400'
                              }`}
                            />
                            {item.isActive ? 'Published' : 'Draft'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pl-4 pr-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBanner(item);
                                setIsModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                              title="Edit banner"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingBanner(item)}
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-900 transition-colors cursor-pointer"
                              title="Delete banner"
                            >
                              <Trash2 size={14} />
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
      </div>

      {/* Banner Create & Edit Modal */}
      <BannerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBanner(null);
        }}
        onSubmit={handleFormSubmit}
        bannerToEdit={editingBanner}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      {deletingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
                <Trash2 size={20} />
              </div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Delete Banner?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-stone-800">"{deletingBanner.title}"</span>? This will immediately remove it from the homepage hero.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBanner(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
