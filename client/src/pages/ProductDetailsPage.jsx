import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import ProductCard from '../components/storefront/ProductCard';
import { getProductBySlug, getProducts } from '../services/productService';
import { useCart } from '../context/CartContext';
import {
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Heart,
  Share2,
  Check,
  AlertCircle,
  ImageOff,
  Maximize2,
  X,
  ChevronLeft,
  ShoppingBag,
  Ruler,
  Clock,
  ArrowRight,
} from 'lucide-react';

/**
 * Customer Product Details Page for Collections by Chandni
 *
 * Implements Step 11:
 * - Dynamic route /product/:slug (supports both slug and id)
 * - Multi-image gallery with primary image, thumbnail navigation, hover zoom & lightbox modal
 * - Dynamic variant selection (Size & Color) with live price, MRP, discount & SKU updates
 * - True stock level verification (In Stock, Low Stock <= 5, Out of Stock)
 * - Quantity selector tied to available stock limits
 * - Add to Cart & Buy Now placeholder actions with elegant notification banner
 * - Brand trust signals & artisan highlights
 * - Accordion / Tabbed specifications (Description, Fabric & Care, Delivery & Returns, Sizing Chart)
 * - Related products grid from the same category
 * - User-friendly 404 / unavailable product screen
 */
export default function ProductDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, mutating: cartMutating } = useCart();

  // Product & Data State
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gallery State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageZoomPos, setImageZoomPos] = useState({ x: 50, y: 50, active: false });

  // Variant Selection State
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Interaction State
  const [actionFeedback, setActionFeedback] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // Fetch product data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setActionFeedback(null);

    getProductBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res.data) {
          const prodData = res.data;
          setProduct(prodData);

          // Find active variants only
          const activeVariants = (prodData.variants || []).filter(
            (v) => v.isActive !== false
          );

          if (activeVariants.length > 0) {
            // Select first variant with positive stock, or first variant
            const defaultVariant =
              activeVariants.find((v) => Number(v.stock) > 0) || activeVariants[0];
            setSelectedSize(defaultVariant.size || '');
            setSelectedColor(defaultVariant.color || '');
          } else {
            setSelectedSize('');
            setSelectedColor('');
          }

          setActiveImageIndex(0);

          // Fetch related products from same category
          if (prodData.categoryId) {
            getProducts({ categoryId: prodData.categoryId, limit: 8 })
              .then((relatedRes) => {
                if (!isMounted) return;
                if (relatedRes?.data) {
                  // Filter out current product and take top 4
                  const filtered = relatedRes.data
                    .filter((p) => p.id !== prodData.id && p.slug !== prodData.slug)
                    .slice(0, 4);
                  setRelatedProducts(filtered);
                }
              })
              .catch(() => {
                // Ignore related error
              });
          }
        } else {
          setError(res?.message || 'Product not found');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Error loading product details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Extract all active variants
  const activeVariants = useMemo(() => {
    if (!product?.variants) return [];
    return product.variants.filter((v) => v.isActive !== false);
  }, [product]);

  // Available unique sizes in standard Indian ethnic size order
  const standardSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
  const availableSizes = useMemo(() => {
    const set = new Set(
      activeVariants.map((v) => v.size).filter((s) => s && typeof s === 'string' && s.trim())
    );
    return Array.from(set).sort((a, b) => {
      const idxA = standardSizeOrder.indexOf(a);
      const idxB = standardSizeOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [activeVariants]);

  // Available unique colors
  const availableColors = useMemo(() => {
    const set = new Set(
      activeVariants.map((v) => v.color).filter((c) => c && typeof c === 'string' && c.trim())
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeVariants]);

  // Currently matched active variant based on size & color selection
  const currentVariant = useMemo(() => {
    if (!activeVariants.length) return null;
    return (
      activeVariants.find(
        (v) =>
          (!selectedSize || v.size === selectedSize) &&
          (!selectedColor || v.color === selectedColor)
      ) || null
    );
  }, [activeVariants, selectedSize, selectedColor]);

  // Calculate pricing for current selection
  const pricing = useMemo(() => {
    if (currentVariant) {
      const sellingPrice = Number(currentVariant.sellingPrice);
      const mrp = Number(currentVariant.mrp);
      const hasValidPrice = !isNaN(sellingPrice) && sellingPrice > 0;
      const hasDiscount = hasValidPrice && !isNaN(mrp) && mrp > sellingPrice;
      const discountPercent = hasDiscount
        ? Math.round(((mrp - sellingPrice) / mrp) * 100)
        : 0;
      const savings = hasDiscount ? mrp - sellingPrice : 0;

      return {
        sellingPrice: hasValidPrice ? sellingPrice : null,
        mrp: !isNaN(mrp) && mrp > 0 ? mrp : null,
        discountPercent,
        savings,
        hasValidPrice,
        hasDiscount,
      };
    }

    // Fallback to product-level derived priceRange if no specific variant matched
    if (product?.priceRange) {
      const sp = product.priceRange.sellingPrice ?? product.priceRange.minPrice ?? null;
      const mrp = product.priceRange.mrp ?? null;
      const hasValidPrice = sp !== null && !isNaN(sp) && sp > 0;
      const hasDiscount = hasValidPrice && mrp !== null && !isNaN(mrp) && mrp > sp;
      const discountPercent = hasDiscount
        ? Math.round(((mrp - sp) / mrp) * 100)
        : product.priceRange.discountPercent || 0;

      return {
        sellingPrice: hasValidPrice ? sp : null,
        mrp: mrp,
        discountPercent,
        savings: hasDiscount ? mrp - sp : 0,
        hasValidPrice,
        hasDiscount,
      };
    }

    return {
      sellingPrice: null,
      mrp: null,
      discountPercent: 0,
      savings: 0,
      hasValidPrice: false,
      hasDiscount: false,
    };
  }, [currentVariant, product]);

  // Stock status determination
  const stock = currentVariant ? Number(currentVariant.stock) || 0 : 0;
  const isOutOfStock = !currentVariant || stock <= 0;
  const isLowStock = !isOutOfStock && stock <= 5;
  const maxPurchaseQty = Math.max(0, Math.min(stock, 10));

  // Ensure quantity does not exceed maxPurchaseQty
  useEffect(() => {
    if (isOutOfStock) {
      setQuantity(0);
    } else if (quantity < 1) {
      setQuantity(1);
    } else if (quantity > maxPurchaseQty) {
      setQuantity(maxPurchaseQty);
    }
  }, [stock, isOutOfStock, maxPurchaseQty]);

  // Sorted product images
  const images = useMemo(() => {
    if (!product?.images || product.images.length === 0) {
      if (product?.primaryImage?.imageUrl) {
        return [product.primaryImage];
      }
      return [];
    }
    return [...product.images].sort((a, b) => {
      if (a.isPrimary) return -1;
      if (b.isPrimary) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [product]);

  const activeImage = images[activeImageIndex] || null;

  // Handle image mouse move zoom
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setImageZoomPos({ x, y, active: true });
  };

  const handleMouseLeave = () => {
    setImageZoomPos((prev) => ({ ...prev, active: false }));
  };

  // Handle Cart & Buy Now Action
  const handleAddToCart = async () => {
    if (isOutOfStock || !pricing.hasValidPrice || !currentVariant || cartMutating) return;
    const sizeLabel = selectedSize ? `Size: ${selectedSize}` : '';
    const colorLabel = selectedColor ? `Color: ${selectedColor}` : '';
    const variantDesc = [sizeLabel, colorLabel].filter(Boolean).join(', ');

    try {
      await addToCart(product.id, currentVariant.id, quantity);
      setActionFeedback({
        type: 'success',
        title: 'Added to Shopping Bag',
        message: `"${product.title}" ${variantDesc ? `(${variantDesc})` : ''} · Qty: ${quantity}.`,
        link: '/cart',
        linkText: 'View Bag',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        title: 'Could Not Add to Bag',
        message: err.message || 'Unable to add item to bag. Please try again.',
      });
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock || !pricing.hasValidPrice || !currentVariant || cartMutating) return;
    try {
      await addToCart(product.id, currentVariant.id, quantity);
      navigate('/cart');
    } catch (err) {
      setActionFeedback({
        type: 'error',
        title: 'Could Not Proceed to Checkout',
        message: err.message || 'Unable to add item to bag.',
      });
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#FAF9F5] py-16 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#781D42]/20 border-t-[#781D42] rounded-full animate-spin" />
          <p className="font-serif text-stone-700 text-sm tracking-wide">
            Retrieving bespoke ensemble details...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // NOT FOUND / INACTIVE PRODUCT STATE
  // ---------------------------------------------------------------------------
  if (error || !product) {
    return (
      <div className="min-h-[70vh] bg-[#FAF9F5] py-20 flex items-center justify-center">
        <Container>
          <div className="max-w-md mx-auto text-center bg-white p-8 sm:p-12 border border-stone-200/80 shadow-xs rounded-sm">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full border border-stone-300 flex items-center justify-center bg-[#FAF9F5] text-[#781D42]">
              <ImageOff size={24} strokeWidth={1.5} />
            </div>
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-2">
              Collections by Chandni
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900 mb-3">
              Ensemble Unavailable
            </h1>
            <p className="text-stone-600 text-sm leading-relaxed mb-6 font-light">
              This handcrafted piece may have been archived, discontinued, or is momentarily reserved. We invite you to explore our current boutique catalog.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/shop"
                className="px-6 py-3 bg-[#781D42] hover:bg-[#5B1123] text-white text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors inline-flex items-center justify-center group"
              >
                <span>Browse Collection</span>
                <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/"
                className="px-6 py-3 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs uppercase tracking-widest font-medium rounded-xs transition-colors inline-flex items-center justify-center"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN PRODUCT DETAIL VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-[#FAF9F5] min-h-screen pb-20">
      {/* ------------------------------------------------------------------ */}
      {/* BREADCRUMB NAVIGATION                                              */}
      {/* ------------------------------------------------------------------ */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-stone-200/60 bg-[#FDFCF7]/80 py-3.5"
      >
        <Container>
          <ol className="flex items-center flex-wrap gap-2 text-xs text-stone-500 font-sans tracking-wide">
            <li>
              <Link
                to="/"
                className="hover:text-[#781D42] transition-colors font-medium"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-300">
              <ChevronRight size={13} />
            </li>
            <li>
              <Link
                to="/shop"
                className="hover:text-[#781D42] transition-colors font-medium"
              >
                Shop
              </Link>
            </li>
            {product.category && (
              <>
                <li aria-hidden="true" className="text-stone-300">
                  <ChevronRight size={13} />
                </li>
                <li>
                  <Link
                    to={`/shop?category=${product.category.id}`}
                    className="hover:text-[#781D42] transition-colors font-medium"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true" className="text-stone-300">
              <ChevronRight size={13} />
            </li>
            <li className="text-stone-800 font-medium truncate max-w-xs sm:max-w-md">
              {product.title}
            </li>
          </ol>
        </Container>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* ACTION FEEDBACK BANNER (Cart / Buy Now notification)               */}
      {/* ------------------------------------------------------------------ */}
      {actionFeedback && (
        <div
          className={`border-b py-3 px-4 sticky top-16 z-30 shadow-xs transition-all animate-fadeIn ${
            actionFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-[#FAF4EB] border-[#E6D7C3] text-stone-900'
          }`}
        >
          <Container>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 ${
                    actionFeedback.type === 'error' ? 'bg-rose-700' : 'bg-[#781D42]'
                  }`}
                >
                  {actionFeedback.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
                </span>
                <div>
                  <h4
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      actionFeedback.type === 'error' ? 'text-rose-800' : 'text-[#781D42]'
                    }`}
                  >
                    {actionFeedback.title}
                  </h4>
                  <p className="text-xs text-stone-700 font-light mt-0.5">
                    {actionFeedback.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {actionFeedback.link && (
                  <Link
                    to={actionFeedback.link}
                    className="px-3.5 py-1.5 bg-[#781D42] text-white hover:bg-[#5B1123] text-xs uppercase tracking-wider font-semibold rounded-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <ShoppingBag size={13} />
                    <span>{actionFeedback.linkText || 'View Bag'}</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                  aria-label="Dismiss message"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PRODUCT CORE GRID (Gallery + Details)                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="pt-8 sm:pt-12">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
            {/* ============================================================ */}
            {/* LEFT: IMAGE GALLERY (5 or 6 cols on lg)                      */}
            {/* ============================================================ */}
            <div className="lg:col-span-6 flex flex-col-reverse md:flex-row gap-4">
              {/* Thumbnails rail (Vertical on desktop/tablet, horizontal on mobile) */}
              {images.length > 1 && (
                <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto md:max-h-[600px] shrink-0 pb-2 md:pb-0 scrollbar-none">
                  {images.map((img, idx) => {
                    const isSelected = idx === activeImageIndex;
                    return (
                      <button
                        key={img.id || idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-xs overflow-hidden border transition-all shrink-0 bg-[#F3EFE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42] ${
                          isSelected
                            ? 'border-[#781D42] ring-1 ring-[#781D42] shadow-xs'
                            : 'border-stone-200/80 hover:border-stone-400 opacity-80 hover:opacity-100'
                        }`}
                        aria-label={`View image ${idx + 1} of ${images.length}`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.altText || `${product.title} view ${idx + 1}`}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                        {img.isPrimary && (
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white py-0.5 text-center font-mono uppercase tracking-wider">
                            Primary
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Main Display Frame */}
              <div className="relative flex-1 aspect-[3/4] bg-[#F3EFE6] rounded-xs overflow-hidden border border-stone-200/90 shadow-sm group">
                {activeImage ? (
                  <div
                    className="relative w-full h-full overflow-hidden cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => setLightboxOpen(true)}
                  >
                    <img
                      src={activeImage.imageUrl}
                      alt={activeImage.altText || product.title}
                      className="w-full h-full object-cover object-top transition-transform duration-200"
                      style={
                        imageZoomPos.active
                          ? {
                              transform: 'scale(1.75)',
                              transformOrigin: `${imageZoomPos.x}% ${imageZoomPos.y}%`,
                            }
                          : undefined
                      }
                    />

                    {/* Quick Lightbox Expand Trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxOpen(true);
                      }}
                      className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-xs bg-white/90 backdrop-blur-xs text-stone-800 hover:text-[#781D42] hover:bg-white border border-stone-200 flex items-center justify-center shadow-xs transition-colors"
                      title="View Fullscreen"
                      aria-label="View Fullscreen"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-stone-400 space-y-3">
                    <div className="w-16 h-16 rounded-full border border-stone-300 flex items-center justify-center bg-[#FAF9F5] text-[#781D42]">
                      <ImageOff size={28} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs uppercase tracking-widest text-stone-600 font-medium">
                      Atelier Photography In Progress
                    </span>
                    <span className="text-xs text-stone-400 font-serif italic">
                      Collections by Chandni
                    </span>
                  </div>
                )}

                {/* Featured Badge */}
                {product.featured && (
                  <div className="absolute top-3.5 left-3.5 z-10 bg-[#781D42]/95 backdrop-blur-xs text-amber-50 text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-xs shadow-xs">
                    Featured Atelier Piece
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT: PRODUCT INFO & PURCHASE CONTROLS (6 cols on lg)        */}
            {/* ============================================================ */}
            <div className="lg:col-span-6 flex flex-col justify-start">
              {/* Category, Brand & Utility Links */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 text-xs text-stone-500 uppercase tracking-widest">
                <span className="font-medium text-[#781D42]">
                  {product.category?.name || product.brand || 'Indian Ethnic Couture'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="hover:text-stone-900 transition-colors inline-flex items-center gap-1 normal-case tracking-normal text-xs"
                    title="Share link"
                  >
                    <Share2 size={13} />
                    <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-stone-950 mt-3 leading-tight">
                {product.title}
              </h1>

              {/* SKU & Brand Indicator */}
              <div className="flex items-center gap-3 mt-2 text-xs text-stone-500 font-mono">
                <span>SKU: {currentVariant?.sku || product.slug || product.id}</span>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="font-sans text-stone-600 tracking-wide">
                  By {product.brand || 'Collections by Chandni'}
                </span>
              </div>

              {/* Pricing Section */}
              <div className="mt-5 p-4 bg-white border border-stone-200/90 rounded-sm">
                <div className="flex items-baseline flex-wrap gap-3">
                  {pricing.hasValidPrice ? (
                    <>
                      <span className="text-2xl sm:text-3xl font-semibold text-stone-950 font-sans tabular-nums">
                        ₹{pricing.sellingPrice.toLocaleString('en-IN')}
                      </span>
                      {pricing.hasDiscount && (
                        <>
                          <span className="text-base text-stone-500 line-through font-sans tabular-nums">
                            MRP ₹{pricing.mrp.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs uppercase tracking-wider font-semibold text-[#781D42] bg-[#FAF4EB] border border-[#E6D7C3] px-2 py-0.5 rounded-xs">
                            {pricing.discountPercent}% OFF
                          </span>
                          {pricing.savings > 0 && (
                            <span className="text-xs text-emerald-800 font-medium">
                              (You save ₹{pricing.savings.toLocaleString('en-IN')})
                            </span>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-stone-600 font-serif italic text-base">
                      Price currently unavailable
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 mt-1 font-light">
                  Inclusive of all taxes. Free shipping across India.
                </p>
              </div>

              {/* Stock Status Indicator */}
              <div className="mt-4 flex items-center gap-2">
                {isOutOfStock ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xs">
                    <AlertCircle size={13} />
                    <span>Out of Stock for Selected Variant</span>
                  </div>
                ) : isLowStock ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xs">
                    <Clock size={13} />
                    <span>Low Stock: Only {stock} piece{stock > 1 ? 's' : ''} left in atelier</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xs">
                    <Check size={13} />
                    <span>In Stock · Ready to Dispatch</span>
                  </div>
                )}
              </div>

              {/* Short Summary Description */}
              {product.description && (
                <p className="text-stone-600 text-sm leading-relaxed mt-4 font-light border-b border-stone-200/60 pb-5">
                  {product.description.length > 220
                    ? `${product.description.slice(0, 220)}...`
                    : product.description}
                </p>
              )}

              {/* Dynamic Variant Selector: Color */}
              {availableColors.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-stone-900 uppercase tracking-wider">
                      Color:{' '}
                      <span className="font-normal text-stone-600 normal-case">
                        {selectedColor || 'Choose a color'}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((colorName) => {
                      const isSelected = selectedColor === colorName;
                      // Check if this color has any active stock across any size
                      const hasStockForColor = activeVariants.some(
                        (v) => v.color === colorName && Number(v.stock) > 0
                      );

                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => setSelectedColor(colorName)}
                          className={`px-3.5 py-2 text-xs font-medium rounded-xs border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'border-[#781D42] bg-[#FAF4EB] text-[#781D42] ring-1 ring-[#781D42]'
                              : 'border-stone-300 bg-white hover:border-stone-400 text-stone-800'
                          } ${!hasStockForColor ? 'opacity-60' : ''}`}
                        >
                          <span>{colorName}</span>
                          {!hasStockForColor && (
                            <span className="text-[10px] text-stone-600 font-light italic">
                              (Out of stock)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Variant Selector: Size */}
              {availableSizes.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-stone-900 uppercase tracking-wider">
                      Size:{' '}
                      <span className="font-normal text-stone-600 normal-case">
                        {selectedSize || 'Choose your size'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="text-[#781D42] hover:underline inline-flex items-center gap-1 font-medium text-xs tracking-normal"
                    >
                      <Ruler size={13} />
                      <span>Size Guide</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((sizeName) => {
                      const isSelected = selectedSize === sizeName;
                      // Match specific variant for (sizeName, selectedColor)
                      const matchedVariant = activeVariants.find(
                        (v) => v.size === sizeName && (!selectedColor || v.color === selectedColor)
                      );
                      const sizeStock = matchedVariant ? Number(matchedVariant.stock) : 0;
                      const sizeHasStock = sizeStock > 0;

                      return (
                        <button
                          key={sizeName}
                          type="button"
                          onClick={() => setSelectedSize(sizeName)}
                          className={`min-w-12 h-10 px-3 text-xs font-semibold rounded-xs border transition-all flex items-center justify-center ${
                            isSelected
                              ? 'border-[#781D42] bg-[#781D42] text-white shadow-xs'
                              : sizeHasStock
                              ? 'border-stone-300 bg-white hover:border-stone-500 text-stone-900'
                              : 'border-stone-200 bg-stone-100 text-stone-400 line-through'
                          }`}
                          title={sizeHasStock ? `Size ${sizeName} in stock` : `Size ${sizeName} out of stock`}
                        >
                          {sizeName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector & Purchase Actions */}
              <div className="mt-7 pt-5 border-t border-stone-200/80 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-stone-300 rounded-xs bg-white">
                    <button
                      type="button"
                      disabled={isOutOfStock || quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-base"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-sans text-sm font-semibold tabular-nums text-stone-900">
                      {isOutOfStock ? 0 : quantity}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock || quantity >= maxPurchaseQty}
                      onClick={() => setQuantity((q) => Math.min(maxPurchaseQty, q + 1))}
                      className="w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-base"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  {maxPurchaseQty > 0 && (
                    <span className="text-xs text-stone-600">
                      (Max {maxPurchaseQty} per order)
                    </span>
                  )}
                </div>

                {/* Primary & Secondary Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isOutOfStock || !pricing.hasValidPrice || cartMutating}
                    onClick={handleAddToCart}
                    className="w-full py-3.5 px-6 bg-[#781D42] text-white hover:bg-[#5B1123] disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
                  >
                    <ShoppingBag size={16} className={`${cartMutating ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform`} />
                    <span>
                      {isOutOfStock ? 'Sold Out' : cartMutating ? 'Adding to Bag...' : 'Add to Shopping Bag'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isOutOfStock || !pricing.hasValidPrice || cartMutating}
                    onClick={handleBuyNow}
                    className="w-full py-3.5 px-6 border-2 border-[#781D42] text-[#781D42] bg-[#FAF4EB]/60 hover:bg-[#FAF4EB] hover:text-[#5B1123] disabled:border-stone-300 disabled:text-stone-400 disabled:bg-transparent disabled:cursor-not-allowed text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
                  >
                    <Sparkles size={16} />
                    <span>Instant Purchase</span>
                  </button>
                </div>
              </div>

              {/* Trust Signals & Indian Couture Assurance */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-stone-200/80 pt-6">
                <div className="flex items-start gap-3 p-3 bg-white/70 border border-stone-200/70 rounded-xs">
                  <div className="w-8 h-8 rounded-full bg-[#FAF4EB] text-[#781D42] flex items-center justify-center shrink-0">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-stone-900 tracking-wide">
                      100% Authentic Couture
                    </h5>
                    <p className="text-[11px] text-stone-500 font-light mt-0.5">
                      Hand-inspected directly from our master karigars.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/70 border border-stone-200/70 rounded-xs">
                  <div className="w-8 h-8 rounded-full bg-[#FAF4EB] text-[#781D42] flex items-center justify-center shrink-0">
                    <Truck size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-stone-900 tracking-wide">
                      Insured Pan-India Transit
                    </h5>
                    <p className="text-[11px] text-stone-500 font-light mt-0.5">
                      Dispatched within 24-48 business hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/70 border border-stone-200/70 rounded-xs">
                  <div className="w-8 h-8 rounded-full bg-[#FAF4EB] text-[#781D42] flex items-center justify-center shrink-0">
                    <RotateCcw size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-stone-900 tracking-wide">
                      7-Day Easy Exchange
                    </h5>
                    <p className="text-[11px] text-stone-500 font-light mt-0.5">
                      Hassle-free size alteration & exchange support.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/70 border border-stone-200/70 rounded-xs">
                  <div className="w-8 h-8 rounded-full bg-[#FAF4EB] text-[#781D42] flex items-center justify-center shrink-0">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-stone-900 tracking-wide">
                      Bespoke Finishing
                    </h5>
                    <p className="text-[11px] text-stone-500 font-light mt-0.5">
                      Premium fabric lining & reinforced seams.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* TABS / SPECIFICATIONS ACCORDION                                   */}
          {/* ---------------------------------------------------------------- */}
          <div className="mt-16 pt-8 border-t border-stone-200/90">
            {/* Tab Navigation */}
            <div className="flex items-center gap-6 border-b border-stone-200/90 overflow-x-auto scrollbar-none pb-px">
              {[
                { id: 'description', label: 'Craft & Description' },
                { id: 'fabric', label: 'Fabric & Care' },
                { id: 'delivery', label: 'Delivery & Returns' },
                { id: 'sizing', label: 'Measurement Guide' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3.5 text-xs uppercase tracking-widest font-semibold transition-colors shrink-0 relative ${
                      isActive
                        ? 'text-[#781D42]'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#781D42]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="py-8 bg-white p-6 sm:p-8 border border-stone-200/80 rounded-b-sm border-t-0 text-sm">
              {activeTab === 'description' && (
                <div className="space-y-4 max-w-3xl leading-relaxed text-stone-700">
                  <h3 className="font-serif text-lg text-stone-900 font-semibold">
                    The Artisan Story of {product.title}
                  </h3>
                  <p className="whitespace-pre-line font-light">
                    {product.description ||
                      'Handcrafted with meticulous dedication by master karigars at Collections by Chandni. Featuring time-honoured needlecraft, balanced drape, and thoughtful embellishments designed for memorable celebrations.'}
                  </p>
                  <div className="pt-2">
                    <h4 className="text-xs uppercase tracking-wider text-[#781D42] font-semibold mb-2">
                      Key Highlights:
                    </h4>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-stone-600 font-light">
                      <li>Tailored silhouette with precision seam allowance</li>
                      <li>Intricate embellishment designed for subtle luminosity</li>
                      <li>Breathable natural fibers suitable for all seasons</li>
                      <li>Curated exclusively for festive soirees and weddings</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'fabric' && (
                <div className="space-y-4 max-w-3xl leading-relaxed text-stone-700">
                  <h3 className="font-serif text-lg text-stone-900 font-semibold">
                    Fabric Composition & Care Instructions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-[#FAF9F5] border border-stone-200/80 rounded-xs space-y-1">
                      <span className="font-semibold text-stone-900 uppercase tracking-wider block">
                        Fabric Details
                      </span>
                      <p className="text-stone-600 font-light">
                        Premium Chanderi Silk / Organic Combed Mulmul with Soft Shantoon Lining.
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-stone-200/80 rounded-xs space-y-1">
                      <span className="font-semibold text-stone-900 uppercase tracking-wider block">
                        Weave Technique
                      </span>
                      <p className="text-stone-600 font-light">
                        Artisan Loom Weave with Hand-guided Resham and Gota Patti Borders.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 text-xs space-y-2">
                    <p className="font-semibold text-stone-900 uppercase tracking-wider">
                      Preservation & Washing:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-stone-600 font-light">
                      <li>Dry clean only for the initial three washes to preserve zari sheen.</li>
                      <li>Gentle hand-wash thereafter with cold water and mild liquid detergent.</li>
                      <li>Do not wring; dry flat in shade away from direct sunlight.</li>
                      <li>Steam iron on reverse using low to moderate heat setting.</li>
                      <li>Store in breathable cotton muslin bags away from moisture.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'delivery' && (
                <div className="space-y-4 max-w-3xl leading-relaxed text-stone-700">
                  <h3 className="font-serif text-lg text-stone-900 font-semibold">
                    Shipping & Exchange Policies
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-[#FAF9F5] border border-stone-200/80 rounded-xs space-y-1">
                      <span className="font-semibold text-stone-900 uppercase tracking-wider block">
                        Domestic Dispatch
                      </span>
                      <p className="text-stone-600 font-light">
                        2 to 4 business days dispatch from our central studio in India.
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-stone-200/80 rounded-xs space-y-1">
                      <span className="font-semibold text-stone-900 uppercase tracking-wider block">
                        Delivery Timelines
                      </span>
                      <p className="text-stone-600 font-light">
                        Metro cities: 3-5 working days. Rest of India: 5-7 working days.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 font-light pt-2">
                    Every piece is packaged in tamper-proof, branded gift boxes. For size alterations or exchange requests, notify our customer care within 7 days of receiving your parcel.
                  </p>
                </div>
              )}

              {activeTab === 'sizing' && (
                <div className="space-y-4 max-w-3xl text-stone-700">
                  <h3 className="font-serif text-lg text-stone-900 font-semibold">
                    Indian Ethnic Sizing Chart (Inches)
                  </h3>
                  <p className="text-xs text-stone-500 font-light">
                    Measurements correspond to standard garment garment dimensions. For tailored comfort, select a size 2 inches larger than your snug body measurement.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-stone-200">
                      <thead className="bg-[#FAF4EB] text-stone-900 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3 border-b border-stone-200">Size</th>
                          <th className="p-3 border-b border-stone-200">Bust (in)</th>
                          <th className="p-3 border-b border-stone-200">Waist (in)</th>
                          <th className="p-3 border-b border-stone-200">Hip (in)</th>
                          <th className="p-3 border-b border-stone-200">Garment Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-stone-600 font-sans">
                        <tr className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">XS</td>
                          <td className="p-3">34"</td>
                          <td className="p-3">30"</td>
                          <td className="p-3">38"</td>
                          <td className="p-3">44" - 46"</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">S</td>
                          <td className="p-3">36"</td>
                          <td className="p-3">32"</td>
                          <td className="p-3">40"</td>
                          <td className="p-3">44" - 46"</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">M</td>
                          <td className="p-3">38"</td>
                          <td className="p-3">34"</td>
                          <td className="p-3">42"</td>
                          <td className="p-3">45" - 47"</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">L</td>
                          <td className="p-3">40"</td>
                          <td className="p-3">36"</td>
                          <td className="p-3">44"</td>
                          <td className="p-3">45" - 47"</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">XL</td>
                          <td className="p-3">42"</td>
                          <td className="p-3">38"</td>
                          <td className="p-3">46"</td>
                          <td className="p-3">46" - 48"</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">XXL</td>
                          <td className="p-3">44"</td>
                          <td className="p-3">40"</td>
                          <td className="p-3">48"</td>
                          <td className="p-3">46" - 48"</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* RELATED / RECOMMENDED PRODUCTS SECTION                           */}
          {/* ---------------------------------------------------------------- */}
          {relatedProducts.length > 0 && (
            <div className="mt-20 pt-10 border-t border-stone-200/90">
              <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8 pb-4 border-b border-stone-200/80 gap-2">
                <div>
                  <span className="text-xs uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                    Complete The Ensemble
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-950">
                    You May Also Adore
                  </h2>
                </div>
                {product.category && (
                  <Link
                    to={`/shop?category=${product.category.id}`}
                    className="text-xs uppercase tracking-widest text-[#781D42] hover:text-[#5B1123] font-semibold inline-flex items-center group"
                  >
                    <span>View More in {product.category.name}</span>
                    <ChevronRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>

              {/* 4-Column Grid of Related Products */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {relatedProducts.map((relProduct) => (
                  <ProductCard key={relProduct.id} product={relProduct} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FULLSCREEN LIGHTBOX MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      {lightboxOpen && activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 focus:outline-none"
              aria-label="Close fullscreen view"
            >
              <X size={24} />
            </button>

            {/* Lightbox Image */}
            <img
              src={activeImage.imageUrl}
              alt={activeImage.altText || product.title}
              className="max-h-[80vh] w-auto object-contain rounded-xs shadow-2xl"
            />

            {/* Lightbox Controls */}
            {images.length > 1 && (
              <div className="mt-4 flex items-center gap-4 text-white text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((idx) =>
                      idx === 0 ? images.length - 1 : idx - 1
                    )
                  }
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xs transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-mono">
                  {activeImageIndex + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((idx) =>
                      idx === images.length - 1 ? 0 : idx + 1
                    )
                  }
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xs transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* QUICK SIZE GUIDE MODAL                                             */}
      {/* ------------------------------------------------------------------ */}
      {sizeGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="bg-white max-w-lg w-full p-6 sm:p-8 rounded-sm shadow-xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#781D42] font-semibold block">
                  Collections by Chandni
                </span>
                <h3 className="font-serif text-xl font-semibold text-stone-900">
                  Garment Measurement Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                className="text-stone-400 hover:text-stone-800 p-1"
                aria-label="Close size guide"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-stone-600 font-light mb-4">
              Garments are handcrafted with generous 2-inch side margins allowing simple alterations if required.
            </p>

            <table className="w-full text-left text-xs border border-stone-200 mb-5">
              <thead className="bg-[#FAF4EB] text-stone-900 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-2.5 border-b border-stone-200">Size</th>
                  <th className="p-2.5 border-b border-stone-200">Bust</th>
                  <th className="p-2.5 border-b border-stone-200">Waist</th>
                  <th className="p-2.5 border-b border-stone-200">Hip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-600">
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">XS</td>
                  <td className="p-2.5">34 in</td>
                  <td className="p-2.5">30 in</td>
                  <td className="p-2.5">38 in</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">S</td>
                  <td className="p-2.5">36 in</td>
                  <td className="p-2.5">32 in</td>
                  <td className="p-2.5">40 in</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">M</td>
                  <td className="p-2.5">38 in</td>
                  <td className="p-2.5">34 in</td>
                  <td className="p-2.5">42 in</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">L</td>
                  <td className="p-2.5">40 in</td>
                  <td className="p-2.5">36 in</td>
                  <td className="p-2.5">44 in</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">XL</td>
                  <td className="p-2.5">42 in</td>
                  <td className="p-2.5">38 in</td>
                  <td className="p-2.5">46 in</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">XXL</td>
                  <td className="p-2.5">44 in</td>
                  <td className="p-2.5">40 in</td>
                  <td className="p-2.5">48 in</td>
                </tr>
              </tbody>
            </table>

            <button
              type="button"
              onClick={() => setSizeGuideOpen(false)}
              className="w-full py-2.5 bg-[#781D42] text-white text-xs uppercase tracking-widest font-semibold rounded-xs"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
