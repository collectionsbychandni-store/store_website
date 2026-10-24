import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Filter Sidebar & Drawer Component for Collections by Chandni Shop Page
 *
 * Supports:
 * - Dynamic category selection
 * - Size selector (tiles)
 * - Color selector (swatches & labels)
 * - Price range (min and max inputs with validation)
 * - Availability toggle (In stock / All)
 * - Reset all filters
 */
export default function ShopFilterSidebar({
  filters,
  onFilterChange,
  onClearFilters,
  filterOptions,
  isMobile = false,
  onCloseMobile,
}) {
  const [minPriceInput, setMinPriceInput] = useState(filters.minPrice || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPrice || '');
  const [priceError, setPriceError] = useState('');

  // Sections collapse state for accordion styling
  const [sectionsOpen, setSectionsOpen] = useState({
    categories: true,
    sizes: true,
    colors: true,
    price: true,
    availability: true,
  });

  const toggleSection = (section) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    setMinPriceInput(filters.minPrice || '');
    setMaxPriceInput(filters.maxPrice || '');
  }, [filters.minPrice, filters.maxPrice]);

  const handlePriceApply = (e) => {
    e.preventDefault();
    setPriceError('');

    const minNum = minPriceInput !== '' ? Number(minPriceInput) : null;
    const maxNum = maxPriceInput !== '' ? Number(maxPriceInput) : null;

    if (minNum !== null && isNaN(minNum)) {
      setPriceError('Enter a valid minimum price');
      return;
    }
    if (maxNum !== null && isNaN(maxNum)) {
      setPriceError('Enter a valid maximum price');
      return;
    }
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setPriceError('Min price cannot exceed Max price');
      return;
    }

    onFilterChange('minPrice', minPriceInput);
    onFilterChange('maxPrice', maxPriceInput);
  };

  const handlePriceClear = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setPriceError('');
    onFilterChange('minPrice', '');
    onFilterChange('maxPrice', '');
  };

  const categories = filterOptions?.categories || [];
  const sizes = filterOptions?.sizes || [];
  const colors = filterOptions?.colors || [];

  const activeFiltersCount = [
    filters.categoryId,
    filters.size,
    filters.color,
    filters.minPrice,
    filters.maxPrice,
    filters.availability && filters.availability !== 'all' ? filters.availability : null,
  ].filter(Boolean).length;

  return (
    <aside className="w-full space-y-6 text-stone-900 text-xs">
      {/* Mobile Drawer Header */}
      {isMobile && (
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-lg font-semibold text-stone-950">
              Filter Ensembles
            </h2>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-semibold text-white bg-[#781D42] rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-stone-500 hover:text-stone-950 rounded-xs focus:outline-none"
            aria-label="Close Filter Drawer"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Desktop Filter Header & Clear Action */}
      {!isMobile && (
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <span className="font-serif text-base font-semibold text-stone-950 tracking-wide">
            Refine Catalog
          </span>
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-[11px] text-[#781D42] hover:text-[#5B1123] font-medium inline-flex items-center space-x-1"
            >
              <RotateCcw size={11} />
              <span>Reset All ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. Category Filter                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-stone-200/80 pb-5">
        <button
          type="button"
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between uppercase tracking-widest text-[11px] font-semibold text-stone-800 mb-3"
        >
          <span>Category</span>
          {sectionsOpen.categories ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {sectionsOpen.categories && (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            <label className="flex items-center space-x-2.5 py-1 px-1.5 rounded-xs hover:bg-[#F3EFE6] cursor-pointer">
              <input
                type="radio"
                name="categoryFilter"
                checked={!filters.categoryId}
                onChange={() => onFilterChange('categoryId', '')}
                className="text-[#781D42] focus:ring-[#781D42] accent-[#781D42]"
              />
              <span className={`text-xs ${!filters.categoryId ? 'font-semibold text-stone-950' : 'text-stone-600'}`}>
                All Silhouettes
              </span>
            </label>

            {categories.map((cat) => {
              const isSelected = filters.categoryId === cat.id;
              return (
                <label
                  key={cat.id}
                  className={`flex items-center justify-between py-1 px-1.5 rounded-xs hover:bg-[#F3EFE6] cursor-pointer ${
                    isSelected ? 'bg-[#F3EFE6]/70' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="categoryFilter"
                      checked={isSelected}
                      onChange={() => onFilterChange('categoryId', cat.id)}
                      className="text-[#781D42] focus:ring-[#781D42] accent-[#781D42]"
                    />
                    <span className={`text-xs ${isSelected ? 'font-semibold text-[#781D42]' : 'text-stone-700'}`}>
                      {cat.name}
                    </span>
                  </div>
                  {cat._count?.products !== undefined && (
                    <span className="text-[10px] text-stone-400 tabular-nums">
                      {cat._count.products}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Size Filter                                                      */}
      {/* ------------------------------------------------------------------ */}
      {sizes.length > 0 && (
        <div className="border-b border-stone-200/80 pb-5">
          <button
            type="button"
            onClick={() => toggleSection('sizes')}
            className="w-full flex items-center justify-between uppercase tracking-widest text-[11px] font-semibold text-stone-800 mb-3"
          >
            <span>Size</span>
            {sectionsOpen.sizes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {sectionsOpen.sizes && (
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((sz) => {
                const isSelected = filters.size === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onFilterChange('size', isSelected ? '' : sz)}
                    className={`min-w-9 h-9 px-2 text-xs font-medium rounded-xs border transition-colors flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#781D42] text-white border-[#781D42] shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. Color Filter                                                     */}
      {/* ------------------------------------------------------------------ */}
      {colors.length > 0 && (
        <div className="border-b border-stone-200/80 pb-5">
          <button
            type="button"
            onClick={() => toggleSection('colors')}
            className="w-full flex items-center justify-between uppercase tracking-widest text-[11px] font-semibold text-stone-800 mb-3"
          >
            <span>Color</span>
            {sectionsOpen.colors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {sectionsOpen.colors && (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {colors.map((clr) => {
                const isSelected = filters.color === clr;
                return (
                  <button
                    key={clr}
                    type="button"
                    onClick={() => onFilterChange('color', isSelected ? '' : clr)}
                    className={`w-full flex items-center justify-between py-1.5 px-2 rounded-xs text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-[#781D42]/10 text-[#781D42] font-semibold'
                        : 'text-stone-700 hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <span>{clr}</span>
                    {isSelected && <Check size={14} className="text-[#781D42]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Price Range Filter                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-stone-200/80 pb-5">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between uppercase tracking-widest text-[11px] font-semibold text-stone-800 mb-3"
        >
          <span>Price Range (₹)</span>
          {sectionsOpen.price ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {sectionsOpen.price && (
          <form onSubmit={handlePriceApply} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-stone-500 uppercase tracking-wider mb-1">
                  Min (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Min"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-stone-300 rounded-xs text-xs text-stone-900 focus:outline-none focus:border-[#781D42]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500 uppercase tracking-wider mb-1">
                  Max (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Max"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-stone-300 rounded-xs text-xs text-stone-900 focus:outline-none focus:border-[#781D42]"
                />
              </div>
            </div>

            {priceError && (
              <p className="text-[11px] text-rose-700 font-medium">{priceError}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-stone-900 hover:bg-[#781D42] text-white text-[11px] font-semibold uppercase tracking-wider rounded-xs transition-colors"
              >
                Apply Price
              </button>
              {(filters.minPrice || filters.maxPrice || minPriceInput || maxPriceInput) && (
                <button
                  type="button"
                  onClick={handlePriceClear}
                  className="py-1.5 px-2.5 border border-stone-300 hover:bg-stone-100 text-stone-600 text-[11px] rounded-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Availability Filter                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="pb-2">
        <button
          type="button"
          onClick={() => toggleSection('availability')}
          className="w-full flex items-center justify-between uppercase tracking-widest text-[11px] font-semibold text-stone-800 mb-3"
        >
          <span>Availability</span>
          {sectionsOpen.availability ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {sectionsOpen.availability && (
          <div className="space-y-1.5">
            <label className="flex items-center space-x-2 py-1 px-1 rounded-xs hover:bg-[#F3EFE6] cursor-pointer">
              <input
                type="radio"
                name="availabilityFilter"
                checked={!filters.availability || filters.availability === 'all'}
                onChange={() => onFilterChange('availability', 'all')}
                className="text-[#781D42] focus:ring-[#781D42] accent-[#781D42]"
              />
              <span className="text-xs text-stone-700">All Items</span>
            </label>

            <label className="flex items-center space-x-2 py-1 px-1 rounded-xs hover:bg-[#F3EFE6] cursor-pointer">
              <input
                type="radio"
                name="availabilityFilter"
                checked={filters.availability === 'in-stock'}
                onChange={() => onFilterChange('availability', 'in-stock')}
                className="text-[#781D42] focus:ring-[#781D42] accent-[#781D42]"
              />
              <span className="text-xs text-stone-700">In Stock Ready to Ship</span>
            </label>

            <label className="flex items-center space-x-2 py-1 px-1 rounded-xs hover:bg-[#F3EFE6] cursor-pointer">
              <input
                type="radio"
                name="availabilityFilter"
                checked={filters.availability === 'out-of-stock'}
                onChange={() => onFilterChange('availability', 'out-of-stock')}
                className="text-[#781D42] focus:ring-[#781D42] accent-[#781D42]"
              />
              <span className="text-xs text-stone-700">Out of Stock Only</span>
            </label>
          </div>
        )}
      </div>

      {/* Mobile Drawer Bottom Apply */}
      {isMobile && (
        <div className="pt-4 border-t border-stone-200 flex gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex-1 py-2.5 border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-medium rounded-xs"
            >
              Reset All
            </button>
          )}
          <button
            onClick={onCloseMobile}
            className="flex-1 py-2.5 bg-[#781D42] text-white text-xs uppercase tracking-wider font-semibold rounded-xs"
          >
            Show Results
          </button>
        </div>
      )}
    </aside>
  );
}
