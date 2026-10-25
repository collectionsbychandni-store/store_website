import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import CategoryFormModal from '../../components/admin/CategoryFormModal';
import CategoryDeleteModal from '../../components/admin/CategoryDeleteModal';
import * as categoryService from '../../services/categoryService';
import {
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FolderTree,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

/**
 * Category Management Page (/admin/categories)
 */
export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [allCategoriesList, setAllCategoriesList] = useState([]); // for parent selection dropdown
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load parent categories list for dropdown selection
  const loadParentOptions = useCallback(async () => {
    try {
      const res = await categoryService.getCategories({ limit: 100 });
      if (res?.data) {
        setAllCategoriesList(res.data);
      }
    } catch (e) {
      console.warn('Failed to load parent category options:', e);
    }
  }, []);

  // Fetch paginated categories
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await categoryService.getCategories({
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit,
        isActive: statusFilter,
        parentId: parentFilter,
      });

      if (res?.data) {
        setCategories(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pagination.page, pagination.limit, statusFilter, parentFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadParentOptions();
  }, [loadParentOptions]);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback.message) {
      const t = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Handle Create or Update submission
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, formData);
        setFeedback({ type: 'success', message: `Category "${formData.name}" updated successfully.` });
      } else {
        await categoryService.createCategory(formData);
        setFeedback({ type: 'success', message: `Category "${formData.name}" created successfully.` });
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      await loadCategories();
      await loadParentOptions();
    } catch (err) {
      throw err; // handled by form modal
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active/Inactive status
  const handleToggleStatus = async (cat) => {
    const nextStatus = !cat.isActive;
    try {
      await categoryService.updateCategoryStatus(cat.id, nextStatus);
      setFeedback({
        type: 'success',
        message: `Category "${cat.name}" is now ${nextStatus ? 'Active' : 'Inactive'}.`,
      });
      await loadCategories();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update category status' });
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (cat) => {
    setDeletingCategory(cat);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await categoryService.deleteCategory(deletingCategory.id);
      setIsDeleteOpen(false);
      setDeletingCategory(null);
      setFeedback({ type: 'success', message: 'Category deleted successfully.' });
      await loadCategories();
      await loadParentOptions();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setParentFilter('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <AdminLayout pageTitle="Category Management">
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rose-200/60 bg-white p-6 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-rose-800">
                Catalog Architecture
              </span>
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 mt-1">
              Category Management
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Manage product categories and subcategories for Collections by Chandni.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <Plus size={15} className="mr-1.5" />
              <span>Add Category</span>
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

        {/* Controls Bar: Search & Filters */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by category name, slug, description..."
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

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
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

            {/* Parent Filter */}
            <select
              value={parentFilter}
              onChange={(e) => {
                setParentFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
            >
              <option value="">All Hierarchy</option>
              <option value="null">Top-Level Parents Only</option>
              {allCategoriesList
                .filter((c) => !c.parentId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Under "{p.name}"
                  </option>
                ))}
            </select>

            {(search || statusFilter || parentFilter) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}

            <button
              type="button"
              onClick={loadCategories}
              title="Refresh categories"
              className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Categories Table View */}
        <div className="rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
          {isLoading && categories.length === 0 ? (
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
              <h3 className="font-serif text-lg font-medium text-stone-900">Failed to Load Categories</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={loadCategories}
                className="inline-flex items-center text-xs font-semibold text-rose-800 hover:text-rose-950 underline pt-1"
              >
                Try reloading
              </button>
            </div>
          ) : categories.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50 text-stone-400">
                <FolderTree size={26} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">No Categories Found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {search || statusFilter || parentFilter
                  ? 'No categories match the active filters. Try adjusting your query or resetting filters.'
                  : 'Get started by creating your first product category.'}
              </p>
              {search || statusFilter || parentFilter ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
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
                  Add Category
                </button>
              )}
            </div>
          ) : (
            /* Table Data */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                    <th scope="col" className="py-3.5 pl-6 pr-3 font-semibold">Image</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Category</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Slug</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Parent Hierarchy</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold text-center">Subcategories</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold text-center">Products</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold">Created Date</th>
                    <th scope="col" className="py-3.5 pl-4 pr-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {categories.map((cat) => {
                    const isChild = Boolean(cat.parentId);
                    const formattedDate = new Date(cat.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={cat.id} className="hover:bg-stone-50/60 transition-colors">
                        {/* Image Thumbnail */}
                        <td className="py-3 pl-6 pr-3 whitespace-nowrap">
                          <div className="relative group/thumb h-12 w-12 rounded-lg overflow-hidden bg-stone-100 border border-stone-200/80 shrink-0 shadow-2xs">
                            {cat.imageUrl ? (
                              <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                className="h-full w-full object-cover transition-transform group-hover/thumb:scale-110"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=400&auto=format&fit=crop';
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-stone-400 bg-stone-50" title="No image uploaded">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name & Hierarchy Indentation */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {isChild && (
                              <span className="text-stone-300 font-mono text-sm leading-none" aria-hidden="true">
                                ↳
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-stone-900 text-xs">{cat.name}</p>
                              {cat.description && (
                                <p className="text-[11px] text-stone-400 max-w-xs truncate mt-0.5">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-stone-500">
                          <span className="bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/60">
                            {cat.slug}
                          </span>
                        </td>

                        {/* Parent Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {cat.parent ? (
                            <span className="inline-flex items-center text-xs font-medium text-stone-700 bg-stone-100/90 px-2 py-0.5 rounded">
                              {cat.parent.name}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-rose-800 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded">
                              Top-Level
                            </span>
                          )}
                        </td>

                        {/* Child Categories Count */}
                        <td className="py-3 px-4 whitespace-nowrap text-center font-mono tabular-nums font-semibold text-stone-800">
                          {cat._count?.children ?? 0}
                        </td>

                        {/* Associated Products Count */}
                        <td className="py-3 px-4 whitespace-nowrap text-center font-mono tabular-nums font-semibold text-stone-800">
                          {cat._count?.products ?? 0}
                        </td>

                        {/* Status Toggle Badge */}
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cat)}
                            title={cat.isActive ? 'Click to deactivate' : 'Click to activate'}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                              cat.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                cat.isActive ? 'bg-emerald-500' : 'bg-stone-400'
                              }`}
                            />
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Created Date */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-stone-500">
                          {formattedDate}
                        </td>

                        {/* Actions */}
                        <td className="py-3 pl-4 pr-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(cat);
                                setIsFormOpen(true);
                              }}
                              aria-label={`Edit ${cat.name}`}
                              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(cat)}
                              aria-label={`Delete ${cat.name}`}
                              className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-700 transition-colors"
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

          {/* Table Pagination Footer */}
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
                categories
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

      {/* Category Create/Edit Modal */}
      <CategoryFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleFormSubmit}
        categoryToEdit={editingCategory}
        availableParents={allCategoriesList}
        isSubmitting={isSubmitting}
      />

      {/* Category Delete Confirmation Modal */}
      <CategoryDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingCategory(null);
          setDeleteError('');
        }}
        onConfirm={handleConfirmDelete}
        category={deletingCategory}
        isDeleting={isDeleting}
        errorMessage={deleteError}
      />
    </AdminLayout>
  );
}
