import * as productService from '../services/productService.js';
import * as categoryService from '../services/categoryService.js';
import * as bannerService from '../services/bannerService.js';

/**
 * Controller for public customer storefront endpoints
 */

/**
 * GET /api/storefront/home
 * Single customer-safe aggregation for homepage data
 * Avoids N+1 queries and ensures only active categories, products, variants, and eligible banners are returned
 */
export async function getStorefrontHome(req, res, next) {
  try {
    // 1. Fetch eligible active banners
    let banners = [];
    try {
      banners = await bannerService.getPublicBanners();
    } catch (bannerErr) {
      console.warn('Could not load banners for storefront:', bannerErr.message);
    }

    // 2. Fetch active categories
    const categoriesResult = await categoryService.getCategories({
      isActive: true,
      limit: 20,
    });
    const activeCategories = (categoriesResult.data || []).filter((c) => c.isActive !== false);

    // 3. Fetch featured active products
    const featuredResult = await productService.getProducts(
      {
        isActive: true,
        featured: true,
        limit: 8,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      false // strictly non-admin
    );

    // 4. Fetch latest new arrivals active products
    const newArrivalsResult = await productService.getProducts(
      {
        isActive: true,
        limit: 8,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      false // strictly non-admin
    );

    // Primary banner or fallback hero
    const primaryBanner = banners && banners.length > 0 ? banners[0] : null;

    // 5. Return customer-safe payload
    return res.status(200).json({
      success: true,
      data: {
        brand: {
          name: 'Collections by Chandni',
          tagline: 'Discover Your Style',
          description:
            'A curated Indian fashion atelier celebrating handcrafted ethnic wear, bespoke designer kurtis, festive gowns, Banarasi silks, and exquisite imitation jewellery.',
        },
        hero: primaryBanner
          ? {
              headline: primaryBanner.title,
              subheadline: primaryBanner.subtitle || '',
              ctaText: primaryBanner.buttonText || 'Shop Collection',
              ctaLink: primaryBanner.destinationUrl || '/shop',
              secondaryCtaText: 'Shop by Category',
              secondaryCtaLink: '#categories',
              bannerImage: primaryBanner.desktopImageUrl || primaryBanner.imageUrl,
              mobileBannerImage: primaryBanner.mobileImageUrl || primaryBanner.desktopImageUrl,
            }
          : {
              headline: 'Grace in Every Thread, Royalty in Every Detail',
              subheadline:
                'Discover handcrafted Indian ethnic wear, festive couture, and artisanal jewellery tailored for effortless modern grace.',
              ctaText: 'Explore Collection',
              ctaLink: '/shop',
              secondaryCtaText: 'Shop by Category',
              secondaryCtaLink: '#categories',
              bannerImage: '/images/chandni_hero_banner_1792063871455.jpg',
              mobileBannerImage: '/images/chandni_hero_banner_1792063871455.jpg',
            },
        banners: banners || [],
        categories: activeCategories,
        featuredProducts: featuredResult.data || [],
        newArrivals: newArrivalsResult.data || [],
      },
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving storefront data',
    });
  }
}

export default {
  getStorefrontHome,
};
