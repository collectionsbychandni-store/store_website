import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/Container';
import ProductCard from '../components/storefront/ProductCard';
import HeroBannerSection from '../components/storefront/HeroBannerSection';
import { getStorefrontHome } from '../services/storefrontService';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  RefreshCw,
  Compass,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

// High-fidelity image assets generated for Collections by Chandni
import heroBannerImg from '../assets/images/chandni_hero_banner_1792063871455.jpg';
import artisanCraftImg from '../assets/images/chandni_artisan_craft_1792063892951.jpg';

/**
 * Customer Storefront Homepage for Collections by Chandni
 *
 * Sections:
 * 1. Hero Campaign Banner (with luxury couture photography & clear CTAs)
 * 2. Shop by Category (dynamic active categories)
 * 3. Featured Products Collection (dynamic active featured products with active variant pricing)
 * 4. Brand & Artisanal Craft Story (curated Indian boutique heritage)
 * 5. New Arrivals (latest active ethnic wear pieces)
 * 6. Boutique Service Highlights (authenticity, shipping, craft)
 */
export default function HomePage() {
  const [storefrontData, setStorefrontData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    getStorefrontHome()
      .then((data) => {
        setStorefrontData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load storefront data:', err);
        setError('Unable to load current collections. Please try again.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = storefrontData?.categories || [];
  const featuredProducts = storefrontData?.featuredProducts || [];
  const newArrivals = storefrontData?.newArrivals || [];

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: HERO CAMPAIGN BANNER                                     */}
      {/* ------------------------------------------------------------------ */}
      <HeroBannerSection
        banners={storefrontData?.banners}
        fallbackHero={storefrontData?.hero}
      />

      {/* Error Banner with retry */}
      {error && (
        <Container>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xs flex items-center justify-between text-amber-900 text-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle size={18} className="text-amber-700 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 bg-amber-200/80 hover:bg-amber-200 text-amber-950 rounded-xs font-medium inline-flex items-center space-x-1"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        </Container>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: SHOP BY CATEGORY                                         */}
      {/* ------------------------------------------------------------------ */}
      <section id="categories" className="scroll-mt-24">
        <Container>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-stone-200/80 gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                Curated Categories
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-950">
                Shop by Silhouettes & Adornments
              </h2>
            </div>
            <Link
              to="/categories"
              className="text-xs uppercase tracking-widest text-[#781D42] hover:text-[#5B1123] font-semibold inline-flex items-center group"
            >
              <span>View All Categories</span>
              <ChevronRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse bg-stone-200/60 aspect-[4/5] rounded-xs" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center bg-stone-100/50 rounded-xs border border-stone-200/60">
              <p className="text-sm text-stone-500 font-light">No active categories available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.id}`}
                  className="group relative flex flex-col bg-white border border-stone-200/80 rounded-xs overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#781D42]/40"
                >
                  <div className="aspect-[4/5] w-full bg-[#F3EFE6] overflow-hidden relative">
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#F3EFE6] text-stone-400">
                        <Compass size={24} strokeWidth={1.5} className="text-[#781D42] mb-1" />
                        <span className="text-[10px] uppercase tracking-wider text-stone-500">
                          {cat.name}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-serif text-base sm:text-lg font-medium leading-tight">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-[11px] text-stone-200 line-clamp-1 font-light mt-0.5">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3: FEATURED PRODUCTS COLLECTION                            */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <Container>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-stone-200/80 gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                Handpicked by Chandni
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-950">
                Featured Ensembles
              </h2>
            </div>
            <Link
              to="/shop?featured=true"
              className="text-xs uppercase tracking-widest text-[#781D42] hover:text-[#5B1123] font-semibold inline-flex items-center group"
            >
              <span>Explore All Featured</span>
              <ChevronRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse bg-stone-200/60 aspect-[3/4] rounded-xs" />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="py-12 text-center bg-stone-100/50 rounded-xs border border-stone-200/60">
              <p className="text-sm text-stone-500 font-light">No featured products currently highlighted.</p>
              <Link to="/shop" className="text-xs uppercase tracking-wider text-[#781D42] font-semibold mt-2 inline-block">
                Browse our complete catalog →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 4: ARTISANAL CRAFTSMANSHIP & STORY                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-[#F6F2E9] py-16 sm:py-20 border-y border-stone-200/80">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Visual Artisan image */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/3] w-full rounded-sm overflow-hidden shadow-md border border-stone-300/80 bg-white">
                <img
                  src={artisanCraftImg}
                  alt="Artisanal Indian embroidery and zari handwork by master craftsmen"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>

            {/* Brand introduction copy */}
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs uppercase tracking-[0.28em] text-[#781D42] font-semibold block">
                The Atelier Story
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-950 leading-tight">
                Authentic Craftsmanship, Reimagined for the Modern Wardrobe.
              </h2>

              <p className="text-stone-700 text-sm sm:text-base leading-relaxed font-light">
                At <strong>Collections by Chandni</strong>, every piece begins with
                reverence for Indian textile heritage. From delicate needlepoint
                gota-patti work to handloom Chanderi and Banarasi silks, our designs
                celebrate centuries-old artistry infused with contemporary silhouettes.
              </p>

              <p className="text-stone-600 text-sm leading-relaxed font-light">
                Complemented by curated imitation jewellery—from timeless kundan and
                polki chokers to lightweight temple motifs—we bring you statement
                finishing touches that empower effortless self-expression.
              </p>

              <div className="pt-2">
                <Link
                  to="/shop"
                  className="inline-flex items-center px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs uppercase tracking-widest font-semibold rounded-xs transition-colors"
                >
                  <span>Explore Atelier Designs</span>
                  <ArrowRight size={14} className="ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 5: NEW ARRIVALS                                            */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <Container>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-stone-200/80 gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#781D42] font-semibold block mb-1">
                Fresh Off The Looms
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-950">
                New Arrivals
              </h2>
            </div>
            <Link
              to="/shop?sortBy=createdAt&sortOrder=desc"
              className="text-xs uppercase tracking-widest text-[#781D42] hover:text-[#5B1123] font-semibold inline-flex items-center group"
            >
              <span>View All New Arrivals</span>
              <ChevronRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse bg-stone-200/60 aspect-[3/4] rounded-xs" />
              ))}
            </div>
          ) : newArrivals.length === 0 ? (
            <div className="py-12 text-center bg-stone-100/50 rounded-xs border border-stone-200/60">
              <p className="text-sm text-stone-500 font-light">New pieces are being cataloged. Check back shortly!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {newArrivals.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 6: BOUTIQUE SERVICE PILLARS                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-stone-200/80 pt-12">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4 p-4">
              <div className="w-10 h-10 rounded-full bg-[#781D42]/10 text-[#781D42] flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-950">
                  Curated Artisanal Quality
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed font-light">
                  Each garment and jewellery piece is rigorously inspected for
                  craftsmanship, fabric purity, and lasting allure.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4">
              <div className="w-10 h-10 rounded-full bg-[#781D42]/10 text-[#781D42] flex items-center justify-center shrink-0">
                <Truck size={18} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-950">
                  Complimentary Express Shipping
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed font-light">
                  Secure door-to-door delivery across India with tamper-proof luxury packaging.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4">
              <div className="w-10 h-10 rounded-full bg-[#781D42]/10 text-[#781D42] flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-950">
                  Authentic Boutique Guarantee
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed font-light">
                  100% genuine ethnic weaves, zardozi needlework, and skin-friendly imitation jewellery.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
