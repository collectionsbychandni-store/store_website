import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import defaultHeroImg from '../../assets/images/chandni_hero_banner_1792063871455.jpg';

/**
 * HeroBannerSection
 * Displays active eligible banners in display order.
 * If multiple banners are available, provides an accessible, responsive carousel
 * with keyboard controls and prefers-reduced-motion compliance.
 * If 1 or 0 banners are available, renders an editorial hero showcase with graceful fallback.
 */
export default function HeroBannerSection({ banners = [], fallbackHero = null }) {
  // Use banners if provided and non-empty, otherwise fallback
  const activeBanners = Array.isArray(banners) && banners.length > 0 ? banners : null;
  const bannerList = activeBanners || [
    {
      id: 'default-hero',
      title: fallbackHero?.headline || 'Grace in Every Thread, Royalty in Every Detail.',
      subtitle:
        fallbackHero?.subheadline ||
        'Explore hand-finished ethnic kurtis, celebratory festive gowns, Banarasi weaves, and heirloom-inspired imitation jewellery tailored for contemporary celebration.',
      desktopImageUrl: fallbackHero?.bannerImage || defaultHeroImg,
      imageUrl: fallbackHero?.bannerImage || defaultHeroImg,
      mobileImageUrl: fallbackHero?.mobileBannerImage || null,
      buttonText: fallbackHero?.ctaText || 'Shop Collection',
      destinationUrl: fallbackHero?.ctaLink || '/shop',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  const total = bannerList.length;
  const currentBanner = bannerList[currentIndex] || bannerList[0];

  // Next and Previous Slide Handlers
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Keyboard navigation (ArrowLeft / ArrowRight)
  const handleKeyDown = (e) => {
    if (total <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  // Auto-advance carousel every 7 seconds, respecting reduced-motion and pause on hover
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isPaused, handleNext]);

  // Safe destination link check
  const getSafeLink = (url) => {
    if (!url || typeof url !== 'string') return '/shop';
    const lower = url.trim().toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
      return '/shop';
    }
    return url.trim();
  };

  const safeCtaLink = getSafeLink(currentBanner.destinationUrl || currentBanner.buttonLink);
  const isExternal = safeCtaLink.startsWith('http://') || safeCtaLink.startsWith('https://');

  return (
    <section
      ref={containerRef}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      tabIndex={total > 1 ? 0 : -1}
      aria-roledescription={total > 1 ? 'carousel' : undefined}
      aria-label="Homepage Banners"
      className="relative overflow-hidden bg-[#FAF9F5] border-b border-stone-200/80 focus:outline-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Typography & Dynamic CTAs */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.28em] text-[#781D42] font-semibold block">
                Bespoke Indian Fashion Boutique
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-semibold text-stone-950 tracking-tight leading-[1.12] transition-opacity duration-300">
                {currentBanner.title}
              </h1>
            </div>

            {currentBanner.subtitle && (
              <p className="text-stone-600 text-sm sm:text-base leading-relaxed font-light max-w-xl mx-auto lg:mx-0 transition-opacity duration-300">
                {currentBanner.subtitle}
              </p>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {isExternal ? (
                <a
                  href={safeCtaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#781D42] text-white hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors inline-flex items-center justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
                >
                  <span>{currentBanner.buttonText || 'Shop Collection'}</span>
                  <ArrowRight size={15} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              ) : (
                <Link
                  to={safeCtaLink}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#781D42] text-white hover:bg-[#5B1123] text-xs uppercase tracking-widest font-semibold rounded-xs shadow-xs transition-colors inline-flex items-center justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
                >
                  <span>{currentBanner.buttonText || 'Shop Collection'}</span>
                  <ArrowRight size={15} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              <a
                href="#categories"
                className="w-full sm:w-auto px-6 py-3.5 border border-stone-300 bg-white/80 hover:bg-white text-stone-800 text-xs uppercase tracking-widest font-medium rounded-xs transition-colors inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#781D42]"
              >
                Explore Categories
              </a>
            </div>

            {/* Micro Trust Signals */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-[11px] text-stone-500 uppercase tracking-wider font-light">
              <span>Handmade Craft</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span>Pure Silks & Cottons</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span>Express India Shipping</span>
            </div>
          </div>

          {/* Right Column: Hero Visual Asset (Responsive Desktop / Mobile Picture) */}
          <div className="lg:col-span-7">
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-sm overflow-hidden border border-stone-200/90 shadow-md bg-[#F3EFE6] group">
              <picture>
                {currentBanner.mobileImageUrl && (
                  <source media="(max-width: 640px)" srcSet={currentBanner.mobileImageUrl} />
                )}
                <img
                  key={currentBanner.id || currentIndex}
                  src={currentBanner.desktopImageUrl || currentBanner.imageUrl || defaultHeroImg}
                  alt={currentBanner.title || 'Collections by Chandni Campaign'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-all duration-500"
                  onError={(e) => {
                    e.target.src = defaultHeroImg;
                  }}
                />
              </picture>

              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

              {/* Atelier Couture Tag */}
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 text-white text-xs sm:text-sm font-serif italic drop-shadow-sm pointer-events-none">
                Festive Atelier · Royal Zardozi & Chanderi Silks
              </div>

              {/* Carousel Controls (when multiple banners exist) */}
              {total > 1 && (
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center space-x-2 bg-stone-900/60 backdrop-blur-xs px-2.5 py-1.5 rounded-full border border-white/20 text-white">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous banner"
                    className="p-1 hover:text-rose-300 transition-colors cursor-pointer focus:outline-none"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="font-mono text-[11px] font-medium px-1 select-none">
                    {currentIndex + 1} / {total}
                  </span>

                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next banner"
                    className="p-1 hover:text-rose-300 transition-colors cursor-pointer focus:outline-none"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Dot Indicators for multi-banner carousel */}
            {total > 1 && (
              <div className="mt-3 flex items-center justify-center lg:justify-end space-x-1.5" role="tablist">
                {bannerList.map((b, idx) => (
                  <button
                    key={b.id || idx}
                    type="button"
                    role="tab"
                    aria-selected={idx === currentIndex}
                    aria-label={`Slide ${idx + 1}: ${b.title}`}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentIndex
                        ? 'w-6 bg-[#781D42]'
                        : 'w-2 bg-stone-300 hover:bg-stone-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
