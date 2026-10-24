import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ImageOff, ArrowUpRight } from 'lucide-react';

/**
 * Reusable Product Card Component for Collections by Chandni
 *
 * Requirements:
 * - Product image with primary image display & graceful fallback
 * - Product title & clean category text
 * - Accurate selling price & MRP/discount display from active variants
 * - "Price unavailable" state when active variants/prices are absent
 * - Featured indicator
 * - Keyboard accessible link to product detail route
 * - Zero static pill clutter
 */
export default function ProductCard({ product, className = '' }) {
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  // Resolve primary image URL
  const primaryImg =
    product.primaryImage?.imageUrl ||
    product.images?.find((img) => img.isPrimary)?.imageUrl ||
    product.images?.[0]?.imageUrl ||
    product.thumbnailUrl ||
    null;

  // Resolve pricing details from active variants / priceRange
  const priceRange = product.priceRange || null;
  const sellingPrice =
    product.sellingPrice !== undefined && product.sellingPrice !== null
      ? Number(product.sellingPrice)
      : priceRange?.sellingPrice !== undefined && priceRange?.sellingPrice !== null
      ? Number(priceRange.sellingPrice)
      : priceRange?.minPrice !== undefined && priceRange?.minPrice !== null
      ? Number(priceRange.minPrice)
      : null;

  const mrp =
    product.mrp !== undefined && product.mrp !== null
      ? Number(product.mrp)
      : priceRange?.mrp !== undefined && priceRange?.mrp !== null
      ? Number(priceRange.mrp)
      : null;

  const hasValidPrice = sellingPrice !== null && !isNaN(sellingPrice) && sellingPrice > 0;
  const hasValidDiscount =
    hasValidPrice &&
    mrp !== null &&
    !isNaN(mrp) &&
    mrp > sellingPrice;

  const discountPercent = hasValidDiscount
    ? Math.round(((mrp - sellingPrice) / mrp) * 100)
    : 0;

  const isMultiplePrices = priceRange?.hasMultiplePrices || false;
  const targetUrl = product.slug
    ? `/product/${product.slug}`
    : product.id
    ? `/product/${product.id}`
    : '/shop';

  return (
    <article
      className={`group relative flex flex-col bg-[#FAF9F5] border border-stone-200/80 rounded-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-stone-300 ${className}`}
    >
      {/* Product Image Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F3EFE6] flex items-center justify-center">
        {primaryImg && !imageError ? (
          <img
            src={primaryImg}
            alt={product.primaryImage?.altText || product.title || 'Ethnic wear product'}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-stone-400 space-y-2">
            <div className="w-12 h-12 rounded-full border border-stone-300/80 flex items-center justify-center bg-[#FAF9F5] text-[#781D42]">
              <ImageOff size={20} strokeWidth={1.5} />
            </div>
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
              Image Coming Soon
            </span>
            <span className="text-[10px] text-stone-400 font-serif italic">
              Collections by Chandni
            </span>
          </div>
        )}

        {/* Featured Tag (clean quiet label, non-pill) */}
        {product.featured && (
          <div className="absolute top-2.5 left-2.5 z-10 bg-[#781D42]/90 backdrop-blur-xs text-white text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-xs shadow-xs">
            Featured
          </div>
        )}

        {/* Quick View Link Overlay */}
        <Link
          to={targetUrl}
          className="absolute inset-0 z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42] focus-visible:ring-offset-2"
          aria-label={`View details for ${product.title}`}
        >
          <span className="sr-only">View {product.title}</span>
        </Link>
      </div>

      {/* Product Details */}
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {/* Category metadata */}
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-stone-500">
          <span>{product.category?.name || product.brand || 'Ethnic Couture'}</span>
          {hasValidDiscount && discountPercent > 0 && (
            <span className="text-[#781D42] font-semibold text-[11px]">
              {discountPercent}% Off
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 className="font-serif text-base font-semibold text-stone-900 line-clamp-1 group-hover:text-[#781D42] transition-colors">
          <Link to={targetUrl} tabIndex={-1}>
            {product.title}
          </Link>
        </h3>

        {/* Pricing Information */}
        <div className="pt-1 mt-auto flex items-baseline gap-2 font-sans">
          {hasValidPrice ? (
            <>
              <span className="text-sm font-semibold text-stone-950 tabular-nums">
                {isMultiplePrices ? 'From ' : ''}₹{sellingPrice.toLocaleString('en-IN')}
              </span>
              {hasValidDiscount && (
                <span className="text-xs text-stone-600 line-through tabular-nums">
                  ₹{mrp.toLocaleString('en-IN')}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-stone-600 italic">
              Price unavailable
            </span>
          )}
        </div>

        {/* Keyboard-accessible secondary link button */}
        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-600 group-hover:text-[#781D42] transition-colors">
          <span className="font-medium tracking-wide">View Piece</span>
          <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </article>
  );
}
