import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import ProductCard from '../components/storefront/ProductCard';
import ShopFilterSidebar from '../components/storefront/ShopFilterSidebar';
import { getProducts, getProductFilterOptions } from '../services/productService';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowRight,
  Filter,
} from 'lucide-react';

/**
 * Customer Shop Page for Collections by Chandni
 *
 * Implements:
 * - Real backend search with 350ms debounce
 * - Multi-criteria filters: Category, Size, Color, Price Range, Availability
 * - Variant-level combined matching on backend
 * - Deterministic sorting: Featured, Newest, Price (Low/High), Name (A-Z)
 * - True backend pagination with URL synchronization
 * - Mobile filter drawer & desktop sidebar
 * - Active filter removable chips
 * - Zero-broken-image & anti-slop luxury Indian boutique design
 */
export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Backward compatibility: redirect ?product=... to /product/:slug
  const directProductParam = searchParams.get('product');
  useEffect(() => {
    if (directProductParam) {
      navigate(`/product/${directProductParam}`, { replace: true });
    }
  }, [directProductParam, navigate]);

  // URL state synchronization
  const searchQuery = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedSize = searchParams.get('size') || '';
  const selectedColor = searchParams.get('color') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const availability = searchParams.get('availability') || 'all';
  const sortBy = searchParams.get('sortBy') || 'featured';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(searchQuery);
  const isInitialMount = useRef(true);

  // Data state
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [filterOptions, setFilterOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mobile drawer toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const catalogTopRef = useRef(null);

  // 1. Fetch available filter options (categories, sizes, colors, price range bounds)
  useEffect(() => {
    getProductFilterOptions()
      .then((res) => {
        if (res?.data) {
          setFilterOptions(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not load filter metadata options:', err);
      });
  }, []);

  // 2. Synchronize searchInput when URL searchQuery changes via back/forward
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // 3. Debounce search input changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        updateQueryParam({ search: searchInput.trim() || null, page: 1 });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Helper to update URL query params while preserving others
  const updateQueryParam = (updates) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next);
  };

  // Helper for filter updates (resets page to 1)
  const handleFilterChange = (key, value) => {
    const mappedKey = key === 'categoryId' ? 'category' : key;
    updateQueryParam({
      [mappedKey]: value || null,
      page: 1,
    });
  };

  // Clear all filters action
  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  // 4. Fetch products when URL parameters change
  const fetchProducts = () => {
    setLoading(true);
    setError(null);

    getProducts({
      search: searchQuery || undefined,
      categoryId: selectedCategory || undefined,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      availability: availability !== 'all' ? availability : undefined,
      sortBy,
      page: currentPage,
      limit: 12,
      isActive: true,
    })
      .then((res) => {
        if (res?.data) {
          setProducts(res.data.filter((p) => p.isActive !== false));
        }
        if (res?.pagination) {
          setPagination(res.pagination);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load shop products:', err);
        setError('Unable to load products. Please try again.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [
    searchQuery,
    selectedCategory,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    availability,
    sortBy,
    currentPage,
  ]);

  // Handle page navigation
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== currentPage) {
      updateQueryParam({ page: newPage });
      if (catalogTopRef.current) {
        catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Count active filters
  const activeFilters = [];
  if (selectedCategory && filterOptions?.categories) {
    const cat = filterOptions.categories.find((c) => c.id === selectedCategory);
    activeFilters.push({
      key: 'category',
      label: `Category: ${cat?.name || selectedCategory}`,
      clear: () => handleFilterChange('category', ''),
    });
  }
  if (selectedSize) {
    activeFilters.push({
      key: 'size',
      label: `Size: ${selectedSize}`,
      clear: () => handleFilterChange('size', ''),
    });
  }
  if (selectedColor) {
    activeFilters.push({
      key: 'color',
      label: `Color: ${selectedColor}`,
      clear: () => handleFilterChange('color', ''),
    });
  }
  if (minPrice && maxPrice) {
    activeFilters.push({
      key: 'price',
      label: `₹${Number(minPrice).toLocaleString('en-IN')} - ₹${Number(maxPrice).toLocaleString('en-IN')}`,
      clear: () => {
        updateQueryParam({ minPrice: null, maxPrice: null, page: 1 });
      },
    });
  } else if (minPrice) {
    activeFilters.push({
      key: 'minPrice',
      label: `Min: ₹${Number(minPrice).toLocaleString('en-IN')}`,
      clear: () => handleFilterChange('minPrice', ''),
    });
  } else if (maxPrice) {
    activeFilters.push({
      key: 'maxPrice',
      label: `Max: ₹${Number(maxPrice).toLocaleString('en-IN')}`,
      clear: () => handleFilterChange('maxPrice', ''),
    });
  }
  if (availability && availability !== 'all') {
    activeFilters.push({
      key: 'availability',
      label: availability === 'in-stock' ? 'In Stock Ready' : 'Out of Stock',
      clear: () => handleFilterChange('availability', 'all'),
    });
  }

  const currentCategoryName = filterOptions?.categories?.find((c) => c.id === selectedCategory)?.name;

  return (
    <div className="py-8 sm:py-12 pb-24 text-stone-900">
      <Container>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center space-x-2 text-xs uppercase tracking-wider text-stone-500">
            <li>
              <Link to="/" className="hover:text-stone-950 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/shop" className={`${!selectedCategory ? 'text-[#781D42] font-semibold' : 'hover:text-stone-950'}`}>
                Shop Collection
              </Link>
            </li>
            {currentCategoryName && (
              <>
                <li aria-hidden="true">/</li>
                <li className="text-[#781D42] font-semibold">{currentCategoryName}</li>
              </>
            )}
          </ol>
        </nav>

        {/* Page Header */}
        <div className="border-b border-stone-200/80 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-stone-950 tracking-tight">
              {currentCategoryName || 'All Boutique Pieces'}
            </h1>
            <p className="text-stone-600 text-sm mt-1.5 font-light max-w-2xl leading-relaxed">
              Curated Indian ethnic wear, handcrafted kurtis, celebratory gowns, and bespoke imitation jewellery.
            </p>
          </div>

          <div className="text-xs text-stone-500 uppercase tracking-widest font-medium shrink-0">
            {loading ? (
              <span>Updating catalog...</span>
            ) : (
              <span>
                {pagination.total} {pagination.total === 1 ? 'Piece' : 'Pieces'} Found
              </span>
            )}
          </div>
        </div>

        {/* Search & Utility Bar */}
        <div ref={catalogTopRef} className="scroll-mt-24 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3 sm:p-4 border border-stone-200/80 rounded-xs">
            {/* Search Input with Debounce & Clear */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, weave, or brand..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-stone-300 rounded-xs text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#781D42]"
              />
              <Search size={16} className="absolute left-2.5 top-2.5 text-stone-400 pointer-events-none" />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
                  aria-label="Clear Search Input"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Controls: Mobile Filter Toggle & Sort Dropdown */}
            <div className="flex items-center space-x-3 justify-between sm:justify-end">
              {/* Mobile Filter Drawer Button */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden inline-flex items-center space-x-1.5 px-3 py-2 border border-stone-300 bg-white hover:bg-stone-50 text-xs font-medium text-stone-800 rounded-xs"
              >
                <SlidersHorizontal size={14} />
                <span>Filters {activeFilters.length > 0 && `(${activeFilters.length})`}</span>
              </button>

              {/* Sorting Selector */}
              <div className="flex items-center space-x-2 text-xs">
                <label htmlFor="shop-sort" className="text-stone-500 hidden sm:inline uppercase tracking-wider text-[11px]">
                  Sort:
                </label>
                <select
                  id="shop-sort"
                  value={sortBy}
                  onChange={(e) => updateQueryParam({ sortBy: e.target.value, page: 1 })}
                  className="py-2 px-3 bg-white border border-stone-300 rounded-xs text-xs text-stone-800 font-medium focus:outline-none focus:border-[#781D42] cursor-pointer"
                >
                  <option value="featured">Featured First</option>
                  <option value="newest">Newest Arrivals</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
                Active Filters:
              </span>
              {activeFilters.map((af) => (
                <span
                  key={af.key}
                  className="inline-flex items-center space-x-1.5 bg-[#FAF9F5] border border-stone-300 px-2.5 py-1 rounded-xs text-stone-800 text-[11px]"
                >
                  <span>{af.label}</span>
                  <button
                    type="button"
                    onClick={af.clear}
                    className="text-stone-400 hover:text-stone-800 focus:outline-none"
                    aria-label={`Remove filter ${af.label}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] text-[#781D42] hover:text-[#5B1123] font-semibold underline underline-offset-2 ml-1"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Main Body: Desktop Sidebar + Product Grid Layout                 */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-28 bg-[#FAF9F5] border border-stone-200/80 p-5 rounded-xs shadow-xs">
              <ShopFilterSidebar
                filters={{
                  categoryId: selectedCategory,
                  size: selectedSize,
                  color: selectedColor,
                  minPrice,
                  maxPrice,
                  availability,
                }}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearAllFilters}
                filterOptions={filterOptions}
                isMobile={false}
              />
            </div>
          </div>

          {/* Product Grid & Pagination Column */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={fetchProducts}
                  className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-200 text-amber-950 rounded-xs font-medium inline-flex items-center space-x-1"
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Loading Skeleton Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse bg-stone-200/60 aspect-[3/4] rounded-xs" />
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="py-20 px-6 text-center bg-white/70 border border-stone-200/80 rounded-xs space-y-4">
                <div className="w-12 h-12 rounded-full border border-stone-300 flex items-center justify-center mx-auto text-[#781D42] bg-[#FAF9F5]">
                  <Filter size={20} strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl font-medium text-stone-900">
                  No matching ensembles found
                </h3>
                <p className="text-stone-600 text-xs max-w-md mx-auto leading-relaxed font-light">
                  We could not find any active pieces matching your current filters.
                  Try loosening your size or color criteria, or clear the search term.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="px-6 py-2.5 bg-[#781D42] hover:bg-[#5B1123] text-white text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              /* Real Product Grid */
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* Pagination Controls                                          */}
            {/* ------------------------------------------------------------ */}
            {!loading && pagination.totalPages > 1 && (
              <div className="pt-8 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                {/* Page Indicator */}
                <span className="text-stone-500 font-light">
                  Page <strong className="font-semibold text-stone-900">{pagination.page}</strong> of{' '}
                  <strong className="font-semibold text-stone-900">{pagination.totalPages}</strong> ({pagination.total} items)
                </span>

                {/* Page Buttons */}
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="px-3 py-1.5 border border-stone-300 rounded-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center space-x-1"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  {/* Render page numbers */}
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                    // Show first, last, current, and neighbours
                    if (
                      p === 1 ||
                      p === pagination.totalPages ||
                      (p >= currentPage - 1 && p <= currentPage + 1)
                    ) {
                      const isActive = p === currentPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePageChange(p)}
                          className={`w-8 h-8 rounded-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#781D42] text-white font-semibold'
                              : 'border border-stone-300 hover:bg-stone-100 text-stone-800'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (p === currentPage - 2 || p === currentPage + 2) {
                      return (
                        <span key={p} className="px-1 text-stone-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    type="button"
                    disabled={currentPage >= pagination.totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="px-3 py-1.5 border border-stone-300 rounded-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center space-x-1"
                    aria-label="Next Page"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile Filter Slide-Over Drawer                                    */}
      {/* ------------------------------------------------------------------ */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-[#FAF9F5] h-full shadow-2xl p-5 overflow-y-auto z-10 flex flex-col">
            <ShopFilterSidebar
              filters={{
                categoryId: selectedCategory,
                size: selectedSize,
                color: selectedColor,
                minPrice,
                maxPrice,
                availability,
              }}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearAllFilters}
              filterOptions={filterOptions}
              isMobile={true}
              onCloseMobile={() => setMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
