import { apiRequest } from './api';
import { getCategories } from './categoryService';
import { getProducts } from './productService';

/**
 * Storefront API service for customer-facing views
 */

/**
 * Fetches homepage aggregated payload (categories, featured products, new arrivals, hero)
 * Fallback to individual public endpoints if aggregation endpoint is unavailable
 */
export async function getStorefrontHome() {
  try {
    const res = await apiRequest('/api/storefront/home', { method: 'GET' });
    if (res && res.success && res.data) {
      return res.data;
    }
  } catch (err) {
    console.warn('Dedicated storefront endpoint fallback triggered:', err);
  }

  // Graceful fallback to existing public GET endpoints
  const [categoriesRes, featuredRes, newArrivalsRes] = await Promise.allSettled([
    getCategories({ isActive: true, limit: 12 }),
    getProducts({ isActive: true, featured: true, limit: 8, sortBy: 'createdAt', sortOrder: 'desc' }),
    getProducts({ isActive: true, limit: 8, sortBy: 'createdAt', sortOrder: 'desc' }),
  ]);

  const categories = categoriesRes.status === 'fulfilled' && categoriesRes.value?.success
    ? categoriesRes.value.data.filter((c) => c.isActive !== false)
    : [];

  const featuredProducts = featuredRes.status === 'fulfilled' && featuredRes.value?.success
    ? featuredRes.value.data.filter((p) => p.isActive !== false)
    : [];

  const newArrivals = newArrivalsRes.status === 'fulfilled' && newArrivalsRes.value?.success
    ? newArrivalsRes.value.data.filter((p) => p.isActive !== false)
    : [];

  return {
    brand: {
      name: 'Collections by Chandni',
      tagline: 'Discover Your Style',
      description:
        'A curated Indian fashion atelier celebrating handcrafted ethnic wear, bespoke designer kurtis, festive gowns, Banarasi silks, and exquisite imitation jewellery.',
    },
    hero: {
      headline: 'Grace in Every Thread, Royalty in Every Detail',
      subheadline:
        'Discover handcrafted Indian ethnic wear, festive couture, and artisanal jewellery tailored for effortless modern grace.',
      ctaText: 'Explore Collection',
      ctaLink: '/shop',
      secondaryCtaText: 'Shop by Category',
      secondaryCtaLink: '#categories',
      bannerImage: '/images/chandni_hero_banner_1792063871455.jpg',
    },
    categories,
    featuredProducts,
    newArrivals,
  };
}
