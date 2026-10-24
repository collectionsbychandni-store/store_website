import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import ProductFormModal from '../../components/admin/ProductFormModal';
import ProductDeleteModal from '../../components/admin/ProductDeleteModal';
import ProductVariantsModal from '../../components/admin/ProductVariantsModal';
import ProductImageGalleryModal from '../../components/admin/ProductImageGalleryModal';
import * as productService from '../../services/productService';
import * as categoryService from '../../services/categoryService';
import {
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Shirt,
  Sparkles,
  Star,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

/**
 * Product Management Page (/admin/products)
 */
export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Variants modal state
  const [isVariantsOpen, setIsVariantsOpen] = useState(false);
  const [variantProduct, setVariantProduct] = useState(null);

  // Image Gallery modal state
  const [isImagesOpen, setIsImagesOpen] = useState(false);
  const [galleryProduct, setGalleryProduct] = useState(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load categories for dropdown filter and creation
  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryService.getCategories({ limit: 100 });
      if (res?.data) {
        setCategories(res.data);
      }
    } catch (e) {
      console.warn('Failed to load categories for product form:', e);
    }
  }, []);

  // Fetch paginated products
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await productService.getProducts({
        search: debouncedSearch,
        categoryId: categoryFilter,
        isActive: statusFilter,
        featured: featuredFilter,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res?.data) {
        setProducts(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, categoryFilter, statusFilter, featuredFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Clear feedback banner after 4 seconds
  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Handle Form Submission (Create or Update)
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, formData);
        setFeedback({ type: 'success', message: `Product "${formData.title}" updated successfully.` });
      } else {
        await productService.createProduct(formData);
        setFeedback({ type: 'success', message: `Product "${formData.title}" created successfully.` });
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (err) {
      throw err; // handled by form modal
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active/Inactive status
  const handleToggleStatus = async (prod) => {
    const nextStatus = !prod.isActive;
    try {
      await productService.updateProductStatus(prod.id, nextStatus);
      setFeedback({
        type: 'success',
        message: `Product "${prod.title}" is now ${nextStatus ? 'Active' : 'Inactive'}.`,
      });
      await loadProducts();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update product status' });
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (prod) => {
    setDeletingProduct(prod);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  // Confirm Product Deletion
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await productService.deleteProduct(deletingProduct.id);
      setIsDeleteOpen(false);
      setDeletingProduct(null);
      setFeedback({ type: 'success', message: 'Product deleted successfully.' });
      await loadProducts();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setFeaturedFilter('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <AdminLayout pageTitle="Product Management">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rose-200/60 bg-white p-6 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                Atelier Catalog
              </span>
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 mt-1">
              Product Management
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Manage your fashion products for Collections by Chandni.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <Plus size={15} className="mr-1.5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback.message && (
          <div
            className={`rounded-lg p-3.5 text-xs font-medium flex items-center justify-between border ${
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
              <X size={14} />
            </button>
          </div>
        )}

        {/* Controls Toolbar: Search & Filters */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, brand, description..."
              className="w-full rounded-lg border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `↳ ${c.name}` : c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            {/* Featured Filter */}
            <select
              value={featuredFilter}
              onChange={(e) => {
                setFeaturedFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
            >
              <option value="">All Items</option>
              <option value="true">Featured Only</option>
              <option value="false">Standard Only</option>
            </select>

            {(search || categoryFilter || statusFilter || featuredFilter) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}

            <button
              type="button"
              onClick={loadProducts}
              title="Refresh products"
              className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Product Table View */}
        <div className="rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
          {isLoading && products.length === 0 ? (
            /* Skeleton Loading State */
            <div className="p-8 space-y-4">
              <div className="h-4 w-48 bg-stone-100 rounded animate-pulse" />
              <div className="space-y-3 pt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 w-full bg-stone-50 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertCircle size={22} />
              </div>
              <h3 className="font-serif text-lg font-medium text-stone-900">Failed to Load Products</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={loadProducts}
                className="inline-flex items-center text-xs font-semibold text-rose-800 hover:text-rose-950 underline pt-1"
              >
                Try reloading
              </button>
            </div>
          ) : products.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-400">
                <Shirt size={26} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">No Products Found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {search || categoryFilter || statusFilter || featuredFilter
                  ? 'No products match the selected criteria. Try adjusting your query or resetting filters.'
                  : 'Start expanding your boutique catalog by adding your first product.'}
              </p>
              {search || categoryFilter || statusFilter || featuredFilter ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                >
                  Add Product
                </button>
              )}
            </div>
          ) : (
            /* Product Data Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                    <th scope="col" className="py-3.5 pl-6 pr-3 font-semibold">Image</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Product Title</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Category</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Brand</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold text-center">Variations</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Price Range</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold text-center">Featured</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Created Date</th>
                    <th scope="col" className="py-3.5 pl-4 pr-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {products.map((prod) => {
                    const primaryImage =
                      prod.thumbnailUrl ||
                      prod.primaryImage?.imageUrl ||
                      prod.images?.find((i) => i.isPrimary)?.imageUrl ||
                      prod.images?.[0]?.imageUrl;
                    const imageCount = prod._count?.images ?? prod.images?.length ?? 0;
                    const formattedDate = new Date(prod.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={prod.id} className="hover:bg-stone-50/60 transition-colors">
                        {/* Image Thumbnail or Placeholder with click to open Gallery */}
                        <td className="py-3 pl-6 pr-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setGalleryProduct(prod);
                              setIsImagesOpen(true);
                            }}
                            title="Click to manage photo gallery"
                            className="group/img relative h-11 w-11 rounded-lg overflow-hidden bg-stone-100 border border-stone-200/80 shrink-0 cursor-pointer block focus:outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={prod.title}
                                className="h-full w-full object-cover transition-transform group-hover/img:scale-105"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-stone-400 bg-rose-50/50">
                                <Shirt size={16} className="text-rose-900/60" />
                              </div>
                            )}

                            {/* Hover overlay with icon */}
                            <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ImageIcon size={14} />
                            </div>

                            {/* Image count badge */}
                            {imageCount > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.2 text-[9px] font-mono font-medium text-white">
                                {imageCount}
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Product Title & Slug */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-stone-900 text-xs">{prod.title}</p>
                            <span className="font-mono text-[10px] text-stone-400">
                              {prod.slug}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {prod.category ? (
                            <span className="inline-flex items-center text-xs font-medium text-stone-700 bg-stone-100/90 px-2 py-0.5 rounded">
                              {prod.category.name}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Brand */}
                        <td className="py-3 px-4 whitespace-nowrap text-stone-600">
                          {prod.brand || 'Collections by Chandni'}
                        </td>

                        {/* Variations Button */}
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setVariantProduct(prod);
                              setIsVariantsOpen(true);
                            }}
                            title="Manage variations & stock"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Layers size={13} className="text-stone-500" />
                            <span>{prod._count?.variants ?? prod.variants?.length ?? 0}</span>
                            <span className="text-[10px] text-stone-400 font-normal">variants</span>
                          </button>
                        </td>

                        {/* Price Range (Derived from variants) */}
                        <td className="py-3 px-4 whitespace-nowrap font-serif font-semibold text-stone-900 tabular-nums">
                          {prod.priceRange ? (
                            prod.priceRange.minPrice === prod.priceRange.maxPrice ? (
                              `₹${prod.priceRange.minPrice.toLocaleString('en-IN')}`
                            ) : (
                              `₹${prod.priceRange.minPrice.toLocaleString('en-IN')} – ₹${prod.priceRange.maxPrice.toLocaleString('en-IN')}`
                            )
                          ) : (
                            <span className="text-stone-400 font-sans text-xs font-normal">Pending variants</span>
                          )}
                        </td>

                        {/* Featured Badge */}
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          {prod.featured ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Star size={11} className="mr-1 fill-amber-500 text-amber-500" />
                              Featured
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">Standard</span>
                          )}
                        </td>

                        {/* Status Toggle Button */}
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(prod)}
                            title={prod.isActive ? 'Click to deactivate' : 'Click to activate'}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                              prod.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                prod.isActive ? 'bg-emerald-500' : 'bg-stone-400'
                              }`}
                            />
                            {prod.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Created Date */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-stone-500">
                          {formattedDate}
                        </td>

                        {/* Actions */}
                        <td className="py-3 pl-4 pr-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Manage Images Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setGalleryProduct(prod);
                                setIsImagesOpen(true);
                              }}
                              aria-label={`Manage photos for ${prod.title}`}
                              title="Manage photo gallery"
                              className="rounded-lg p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-800 transition-colors cursor-pointer"
                            >
                              <ImageIcon size={14} />
                            </button>

                            {/* Manage Variants Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setVariantProduct(prod);
                                setIsVariantsOpen(true);
                              }}
                              aria-label={`Manage variants for ${prod.title}`}
                              title="Manage variants & stock"
                              className="rounded-lg p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-800 transition-colors cursor-pointer"
                            >
                              <Layers size={14} />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(prod);
                                setIsFormOpen(true);
                              }}
                              aria-label={`Edit ${prod.title}`}
                              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(prod)}
                              aria-label={`Delete ${prod.title}`}
                              className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
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

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/40 text-xs text-stone-500">
              <div>
                Showing{' '}
                <span className="font-semibold text-stone-800">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-stone-800">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-semibold text-stone-800">{pagination.total}</span>{' '}
                products
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  <span>Prev</span>
                </button>

                <div className="text-xs font-mono font-medium text-stone-700 px-2">
                  {pagination.page} / {pagination.totalPages}
                </div>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight size={14} className="ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleFormSubmit}
        productToEdit={editingProduct}
        categories={categories}
        isSubmitting={isSubmitting}
        onManageImages={(prod) => {
          setGalleryProduct(prod);
          setIsImagesOpen(true);
        }}
      />

      {/* Product Safe Deletion Modal */}
      <ProductDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingProduct(null);
          setDeleteError('');
        }}
        onConfirm={handleConfirmDelete}
        product={deletingProduct}
        isDeleting={isDeleting}
        errorMessage={deleteError}
      />

      {/* Product Variations Management Modal */}
      <ProductVariantsModal
        isOpen={isVariantsOpen}
        onClose={() => {
          setIsVariantsOpen(false);
          setVariantProduct(null);
        }}
        product={variantProduct}
        onVariantsUpdated={loadProducts}
      />

      {/* Product Image Gallery Modal */}
      <ProductImageGalleryModal
        isOpen={isImagesOpen}
        onClose={() => {
          setIsImagesOpen(false);
          setGalleryProduct(null);
        }}
        product={galleryProduct}
        onImagesUpdated={loadProducts}
      />
    </AdminLayout>
  );
}
