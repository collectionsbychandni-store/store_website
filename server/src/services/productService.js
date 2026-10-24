import prisma from '../config/db.js';
import * as categoryService from './categoryService.js';

/**
 * Utility: Generates a URL-friendly slug from title
 * @param {string} text
 * @returns {string}
 */
export function generateSlug(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// -----------------------------------------------------------------------------
// Dev fallback in-memory store matching Step 2 seed products
// Used if PostgreSQL database server is offline in sandbox container
// -----------------------------------------------------------------------------
const INITIAL_DEMO_PRODUCTS = [
  {
    id: 'prod-1',
    title: "Women's Designer Kurti",
    slug: 'womens-designer-kurti',
    description: 'A masterfully crafted A-line designer kurti featuring intricate gota patti handwork, tailored in breathable chanderi silk. Perfect for festive celebrations and intimate gatherings.',
    categoryId: 'cat-kurtis',
    brand: 'Collections by Chandni',
    featured: true,
    isActive: true,
    createdAt: new Date('2026-09-29T11:00:00Z'),
    updatedAt: new Date('2026-09-29T11:00:00Z'),
    images: [
      {
        id: 'img-1-1',
        imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop',
        altText: "Women's Designer Kurti Front View in Blush Rose",
        sortOrder: 1,
      },
      {
        id: 'img-1-2',
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop',
        altText: "Women's Designer Kurti Neckline Embroidery Detail",
        sortOrder: 2,
      },
    ],
    variants: [
      { id: 'var-1-1', size: 'S', color: 'Blush Pink', sku: 'CBC-WDK-PNK-S', mrp: 3499.0, sellingPrice: 2499.0, stock: 15, isActive: true },
      { id: 'var-1-2', size: 'M', color: 'Blush Pink', sku: 'CBC-WDK-PNK-M', mrp: 3499.0, sellingPrice: 2499.0, stock: 20, isActive: true },
      { id: 'var-1-3', size: 'L', color: 'Blush Pink', sku: 'CBC-WDK-PNK-L', mrp: 3499.0, sellingPrice: 2499.0, stock: 12, isActive: true },
      { id: 'var-1-4', size: 'XL', color: 'Blush Pink', sku: 'CBC-WDK-PNK-XL', mrp: 3499.0, sellingPrice: 2499.0, stock: 8, isActive: true },
      { id: 'var-1-5', size: 'S', color: 'Royal Teal', sku: 'CBC-WDK-TEA-S', mrp: 3499.0, sellingPrice: 2499.0, stock: 10, isActive: true },
      { id: 'var-1-6', size: 'M', color: 'Royal Teal', sku: 'CBC-WDK-TEA-M', mrp: 3499.0, sellingPrice: 2499.0, stock: 18, isActive: true },
      { id: 'var-1-7', size: 'L', color: 'Royal Teal', sku: 'CBC-WDK-TEA-L', mrp: 3499.0, sellingPrice: 2499.0, stock: 14, isActive: true },
    ],
    hasOrders: true, // protected from deletion in demo
  },
  {
    id: 'prod-2',
    title: 'Floral Print Kurti',
    slug: 'floral-print-kurti',
    description: 'Breezy mulmul cotton kurti adorned with hand-block botanical floral prints and mother-of-pearl button accents along the placket. Designed for effortless all-day grace.',
    categoryId: 'cat-kurtis',
    brand: 'Collections by Chandni',
    featured: true,
    isActive: true,
    createdAt: new Date('2026-09-29T11:05:00Z'),
    updatedAt: new Date('2026-09-29T11:05:00Z'),
    images: [
      {
        id: 'img-2-1',
        imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop',
        altText: 'Floral Print Kurti in Sage Olive',
        sortOrder: 1,
      },
    ],
    variants: [
      { id: 'var-2-1', size: 'S', color: 'Sage Green', sku: 'CBC-FPK-SGE-S', mrp: 2199.0, sellingPrice: 1599.0, stock: 25, isActive: true },
      { id: 'var-2-2', size: 'M', color: 'Sage Green', sku: 'CBC-FPK-SGE-M', mrp: 2199.0, sellingPrice: 1599.0, stock: 30, isActive: true },
      { id: 'var-2-3', size: 'L', color: 'Sage Green', sku: 'CBC-FPK-SGE-L', mrp: 2199.0, sellingPrice: 1599.0, stock: 20, isActive: true },
    ],
    hasOrders: true,
  },
  {
    id: 'prod-3',
    title: 'Elegant Party Wear Dress',
    slug: 'elegant-party-wear-dress',
    description: 'Floor-sweeping maxi gown rendered in lightweight crushed georgette, complemented by a sequin-embellished waistline and cascading flared hem for soirees and receptions.',
    categoryId: 'cat-dresses',
    brand: 'Collections by Chandni',
    featured: true,
    isActive: true,
    createdAt: new Date('2026-09-29T11:10:00Z'),
    updatedAt: new Date('2026-09-29T11:10:00Z'),
    images: [
      {
        id: 'img-3-1',
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
        altText: 'Elegant Party Wear Dress in Midnight Burgundy',
        sortOrder: 1,
      },
    ],
    variants: [
      { id: 'var-3-1', size: 'S', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-S', mrp: 5999.0, sellingPrice: 4299.0, stock: 12, isActive: true },
      { id: 'var-3-2', size: 'M', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-M', mrp: 5999.0, sellingPrice: 4299.0, stock: 16, isActive: true },
    ],
    hasOrders: true,
  },
  {
    id: 'prod-4',
    title: 'Cotton Casual Kurti',
    slug: 'cotton-casual-kurti',
    description: 'Everyday essential straight-cut kurti made with 100% combed organic cotton. Features subtle thread pintucks, dual side slits, and comfortable 3/4 sleeves.',
    categoryId: 'cat-kurtis',
    brand: 'Collections by Chandni',
    featured: false,
    isActive: true,
    createdAt: new Date('2026-09-29T11:15:00Z'),
    updatedAt: new Date('2026-09-29T11:15:00Z'),
    images: [
      {
        id: 'img-4-1',
        imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=800&auto=format&fit=crop',
        altText: 'Cotton Casual Kurti in Ivory Linen',
        sortOrder: 1,
      },
    ],
    variants: [
      { id: 'var-4-1', size: 'S', color: 'Ivory White', sku: 'CBC-CCK-IVR-S', mrp: 1599.0, sellingPrice: 1199.0, stock: 30, isActive: true },
      { id: 'var-4-2', size: 'M', color: 'Ivory White', sku: 'CBC-CCK-IVR-M', mrp: 1599.0, sellingPrice: 1199.0, stock: 40, isActive: true },
    ],
    hasOrders: false,
  },
  {
    id: 'prod-5',
    title: "Embroidered Women's Kurti",
    slug: 'embroidered-womens-kurti',
    description: 'Resham and zardozi embroidered ceremonial kurti with delicate scalloped borders on the cuffs and hemline. Pairs seamlessly with organza dupattas and flared palazzos.',
    categoryId: 'cat-kurtis',
    brand: 'Collections by Chandni',
    featured: true,
    isActive: true,
    createdAt: new Date('2026-09-29T11:20:00Z'),
    updatedAt: new Date('2026-09-29T11:20:00Z'),
    images: [
      {
        id: 'img-5-1',
        imageUrl: 'https://images.unsplash.com/photo-1610030469668-932d04a7be65?q=80&w=800&auto=format&fit=crop',
        altText: "Embroidered Women's Kurti in Deep Crimson",
        sortOrder: 1,
      },
    ],
    variants: [
      { id: 'var-5-1', size: 'S', color: 'Crimson Red', sku: 'CBC-EWK-CRM-S', mrp: 4499.0, sellingPrice: 3299.0, stock: 12, isActive: true },
      { id: 'var-5-2', size: 'M', color: 'Crimson Red', sku: 'CBC-EWK-CRM-M', mrp: 4499.0, sellingPrice: 3299.0, stock: 18, isActive: true },
    ],
    hasOrders: false,
  },
];

let inMemoryProducts = [...INITIAL_DEMO_PRODUCTS];

export function _getInMemoryProducts() {
  return inMemoryProducts;
}

export function _setInMemoryProducts(updated) {
  inMemoryProducts = updated;
}

let lastDbCheckTime = 0;
let lastDbAliveStatus = false;

/**
 * Checks whether PostgreSQL connection is alive with short timeout and cached status
 */
async function isDatabaseAlive() {
  const now = Date.now();
  if (now - lastDbCheckTime < 10000) {
    return lastDbAliveStatus;
  }
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 1000)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    lastDbAliveStatus = true;
    lastDbCheckTime = now;
    return true;
  } catch (e) {
    lastDbAliveStatus = false;
    lastDbCheckTime = now;
    return false;
  }
}

/**
 * Computes min/max price range and selling price/mrp from product variants
 */
function derivePriceRange(variants = []) {
  if (!variants || variants.length === 0) {
    return null;
  }
  const activeVariants = variants.filter((v) => v.isActive !== false);
  const validPriceVariants = activeVariants.filter((v) => {
    const sp = Number(v.sellingPrice);
    const mrp = Number(v.mrp);
    return (sp && sp > 0) || (mrp && mrp > 0);
  });

  if (validPriceVariants.length === 0) return null;

  const prices = validPriceVariants.map((v) => {
    const sp = Number(v.sellingPrice);
    return sp > 0 ? sp : Number(v.mrp);
  });

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Representative variant with lowest selling price
  const representative = validPriceVariants.find((v) => {
    const sp = Number(v.sellingPrice) > 0 ? Number(v.sellingPrice) : Number(v.mrp);
    return sp === minPrice;
  }) || validPriceVariants[0];

  const mrpVal = representative && Number(representative.mrp) > 0 ? Number(representative.mrp) : null;
  const sellingPriceVal = minPrice;
  const discountPercent =
    mrpVal && sellingPriceVal && mrpVal > sellingPriceVal
      ? Math.round(((mrpVal - sellingPriceVal) / mrpVal) * 100)
      : 0;

  return {
    minPrice,
    maxPrice,
    sellingPrice: sellingPriceVal,
    mrp: mrpVal && mrpVal > sellingPriceVal ? mrpVal : null,
    discountPercent,
    currency: 'INR',
    hasMultiplePrices: minPrice !== maxPrice,
  };
}

/**
 * Enriches product with category and price range
 */
async function enrichProductInMemory(p, isAdmin = false) {
  let category = null;
  try {
    category = await categoryService.getCategoryById(p.categoryId);
  } catch (e) {
    // Ignore error
  }

  let variants = p.variants || [];
  try {
    const { _getInMemoryVariants } = await import('./variantService.js');
    if (_getInMemoryVariants) {
      const liveVariants = _getInMemoryVariants().filter((v) => v.productId === p.id);
      variants = liveVariants.length > 0 ? liveVariants : variants;
    }
  } catch (e) {
    // fallback
  }

  if (!isAdmin && Array.isArray(variants)) {
    variants = variants.filter((v) => v.isActive !== false);
  }

  const priceRange = derivePriceRange(variants);
  const images = [...(p.images || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const primaryImage = images.find((img) => img.isPrimary) || images[0] || null;
  const thumbnailUrl = primaryImage?.imageUrl || null;

  return {
    ...p,
    category: category
      ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
        }
      : null,
    images,
    primaryImage,
    thumbnailUrl,
    variants: variants || [],
    _count: {
      variants: variants?.length || 0,
      images: images.length,
    },
    priceRange,
    sellingPrice: priceRange?.sellingPrice ?? null,
    mrp: priceRange?.mrp ?? null,
    discountPercent: priceRange?.discountPercent ?? 0,
  };
}

// -----------------------------------------------------------------------------
// Service Methods
// -----------------------------------------------------------------------------

/**
 * Retrieves paginated products with filtering & search
 * @param {object} params
 * @param {boolean} isAdmin - if true, allows viewing both active and inactive
 */
/**
 * Retrieves paginated products with comprehensive filtering, variant matching & search
 * @param {object} params
 * @param {boolean} isAdmin - if true, allows viewing both active and inactive
 */
export async function getProducts({
  search = '',
  categoryId,
  size,
  color,
  minPrice,
  maxPrice,
  availability,
  isActive,
  featured,
  page = 1,
  limit = 12,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}, isAdmin = false) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 12);
  const skip = (pageNum - 1) * limitNum;

  // Normalize sort options
  let normalizedSortBy = sortBy;
  let normalizedSortOrder = sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'newest') {
    normalizedSortBy = 'createdAt';
    normalizedSortOrder = 'desc';
  } else if (sortBy === 'price_asc') {
    normalizedSortBy = 'price';
    normalizedSortOrder = 'asc';
  } else if (sortBy === 'price_desc') {
    normalizedSortBy = 'price';
    normalizedSortOrder = 'desc';
  } else if (sortBy === 'name_asc') {
    normalizedSortBy = 'title';
    normalizedSortOrder = 'asc';
  } else if (sortBy === 'name_desc') {
    normalizedSortBy = 'title';
    normalizedSortOrder = 'desc';
  }

  // Parse price bounds safely
  const parsedMinPrice =
    minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice))
      ? Math.max(0, Number(minPrice))
      : null;
  const parsedMaxPrice =
    maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice))
      ? Math.max(0, Number(maxPrice))
      : null;

  // Resolve parent/child category expansion if needed
  let targetCategoryIds = null;
  if (categoryId && typeof categoryId === 'string' && categoryId.trim()) {
    const trimmedCat = categoryId.trim();
    targetCategoryIds = [trimmedCat];
    try {
      const allCategories = await categoryService.getCategories({ isActive: true, limit: 100 });
      const children = (allCategories.data || []).filter((c) => c.parentId === trimmedCat);
      if (children.length > 0) {
        targetCategoryIds = [trimmedCat, ...children.map((c) => c.id)];
      }
    } catch (e) {
      // fallback to single id
    }
  }

  // Check if any variant-level filter is active
  const hasVariantFilters = Boolean(
    (size && typeof size === 'string' && size.trim()) ||
    (color && typeof color === 'string' && color.trim()) ||
    parsedMinPrice !== null ||
    parsedMaxPrice !== null ||
    (availability && availability !== 'all')
  );

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const where = {};

    // 1. Text Search across Title, Description, Brand, Slug
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ];
    }

    // 2. Category Filter (including children)
    if (targetCategoryIds && targetCategoryIds.length > 0) {
      where.categoryId = targetCategoryIds.length > 1
        ? { in: targetCategoryIds }
        : targetCategoryIds[0];
    }

    // 3. Featured Filter
    if (featured !== undefined && featured !== '') {
      where.featured = featured === true || featured === 'true';
    }

    // 4. Active status filter
    if (!isAdmin) {
      where.isActive = true;
    } else if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === true || isActive === 'true';
    }

    // 5. Variant-Level Filter (enforcing size + color + price + stock on the SAME single active variant)
    if (hasVariantFilters) {
      const variantCondition = {
        isActive: true,
      };

      if (size && typeof size === 'string' && size.trim()) {
        variantCondition.size = { equals: size.trim(), mode: 'insensitive' };
      }

      if (color && typeof color === 'string' && color.trim()) {
        variantCondition.color = { equals: color.trim(), mode: 'insensitive' };
      }

      if (parsedMinPrice !== null || parsedMaxPrice !== null) {
        variantCondition.sellingPrice = {};
        if (parsedMinPrice !== null) variantCondition.sellingPrice.gte = parsedMinPrice;
        if (parsedMaxPrice !== null) variantCondition.sellingPrice.lte = parsedMaxPrice;
      }

      if (availability === 'in-stock') {
        variantCondition.stock = { gt: 0 };
      } else if (availability === 'out-of-stock') {
        variantCondition.stock = { lte: 0 };
      }

      where.variants = {
        some: variantCondition,
      };
    }

    // Fetch matching products with active variants
    const allMatching = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: isAdmin ? true : { where: { isActive: true } },
        _count: {
          select: { variants: true, images: true },
        },
      },
    });

    // Format & derive pricing for each matching product
    const formattedData = allMatching.map((p) => {
      const primaryImage = p.images?.find((img) => img.isPrimary) || p.images?.[0] || null;
      const priceRange = derivePriceRange(p.variants);
      return {
        ...p,
        primaryImage,
        thumbnailUrl: primaryImage?.imageUrl || null,
        priceRange,
        sellingPrice: priceRange?.sellingPrice ?? null,
        mrp: priceRange?.mrp ?? null,
        discountPercent: priceRange?.discountPercent ?? 0,
      };
    });

    // Deterministic Sorting
    formattedData.sort((a, b) => {
      if (normalizedSortBy === 'price') {
        const isAsc = normalizedSortOrder === 'asc';
        const priceA = a.sellingPrice !== null && !isNaN(a.sellingPrice) ? a.sellingPrice : (isAsc ? Infinity : -Infinity);
        const priceB = b.sellingPrice !== null && !isNaN(b.sellingPrice) ? b.sellingPrice : (isAsc ? Infinity : -Infinity);
        if (priceA !== priceB) return isAsc ? priceA - priceB : priceB - priceA;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      if (normalizedSortBy === 'featured') {
        if (a.featured !== b.featured) return b.featured ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      if (normalizedSortBy === 'title') {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const cmp = titleA.localeCompare(titleB);
        if (cmp !== 0) return normalizedSortOrder === 'asc' ? cmp : -cmp;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      // Default: createdAt or updatedAt
      const dateA = new Date(a[normalizedSortBy] || a.createdAt).getTime();
      const dateB = new Date(b[normalizedSortBy] || b.createdAt).getTime();
      if (dateA !== dateB) return normalizedSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      return (a.id || '').localeCompare(b.id || '');
    });

    const total = formattedData.length;
    const paged = formattedData.slice(skip, skip + limitNum);

    return {
      data: paged,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
      filtersApplied: {
        search: search || null,
        categoryId: categoryId || null,
        size: size || null,
        color: color || null,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        availability: availability || null,
        sortBy: normalizedSortBy,
        sortOrder: normalizedSortOrder,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // In-Memory Fallback
  // ---------------------------------------------------------------------------
  let filtered = [...inMemoryProducts];

  // 1. Search
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        (p.description && p.description.toLowerCase().includes(s)) ||
        p.brand.toLowerCase().includes(s) ||
        p.slug.toLowerCase().includes(s)
    );
  }

  // 2. Category (including children)
  if (targetCategoryIds && targetCategoryIds.length > 0) {
    filtered = filtered.filter((p) => targetCategoryIds.includes(p.categoryId));
  }

  // 3. Featured
  if (featured !== undefined && featured !== '') {
    const bool = featured === true || featured === 'true';
    filtered = filtered.filter((p) => p.featured === bool);
  }

  // 4. Active status
  if (!isAdmin) {
    filtered = filtered.filter((p) => p.isActive === true);
  } else if (isActive !== undefined && isActive !== '') {
    const bool = isActive === true || isActive === 'true';
    filtered = filtered.filter((p) => p.isActive === bool);
  }

  // 5. Variant-Level Filters (ensuring size + color + price + stock match on the SAME variant)
  if (hasVariantFilters) {
    filtered = filtered.filter((p) => {
      const vars = p.variants || [];
      return vars.some((v) => {
        if (v.isActive === false) return false;
        if (size && typeof size === 'string' && size.trim()) {
          if (!v.size || v.size.toLowerCase() !== size.trim().toLowerCase()) return false;
        }
        if (color && typeof color === 'string' && color.trim()) {
          if (!v.color || v.color.toLowerCase() !== color.trim().toLowerCase()) return false;
        }
        const priceVal = Number(v.sellingPrice) > 0 ? Number(v.sellingPrice) : Number(v.mrp) || 0;
        if (parsedMinPrice !== null && priceVal < parsedMinPrice) return false;
        if (parsedMaxPrice !== null && priceVal > parsedMaxPrice) return false;
        if (availability === 'in-stock' && (Number(v.stock) || 0) <= 0) return false;
        if (availability === 'out-of-stock' && (Number(v.stock) || 0) > 0) return false;
        return true;
      });
    });
  }

  // Enrich all matched products with pricing and images
  const enriched = await Promise.all(filtered.map((p) => enrichProductInMemory(p, isAdmin)));

  // Deterministic Sorting
  enriched.sort((a, b) => {
    if (normalizedSortBy === 'price') {
      const isAsc = normalizedSortOrder === 'asc';
      const priceA = a.sellingPrice !== null && !isNaN(a.sellingPrice) ? a.sellingPrice : (isAsc ? Infinity : -Infinity);
      const priceB = b.sellingPrice !== null && !isNaN(b.sellingPrice) ? b.sellingPrice : (isAsc ? Infinity : -Infinity);
      if (priceA !== priceB) return isAsc ? priceA - priceB : priceB - priceA;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    if (normalizedSortBy === 'featured') {
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    if (normalizedSortBy === 'title') {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      const cmp = titleA.localeCompare(titleB);
      if (cmp !== 0) return normalizedSortOrder === 'asc' ? cmp : -cmp;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    const dateA = new Date(a[normalizedSortBy] || a.createdAt).getTime();
    const dateB = new Date(b[normalizedSortBy] || b.createdAt).getTime();
    if (dateA !== dateB) return normalizedSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    return (a.id || '').localeCompare(b.id || '');
  });

  const total = enriched.length;
  const paged = enriched.slice(skip, skip + limitNum);

  return {
    data: paged,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 0,
    },
    filtersApplied: {
      search: search || null,
      categoryId: categoryId || null,
      size: size || null,
      color: color || null,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      availability: availability || null,
      sortBy: normalizedSortBy,
      sortOrder: normalizedSortOrder,
    },
  };
}

/**
 * Returns available filter options (categories, sizes, colors, price range bounds)
 * based on active products and active variants
 */
export async function getProductFilterOptions() {
  const dbConnected = await isDatabaseAlive();
  let activeVariants = [];
  let activeProducts = [];

  if (dbConnected) {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: { where: { isActive: true } },
      },
    });
    activeProducts = products;
    activeVariants = products.flatMap((p) => p.variants || []);
  } else {
    activeProducts = inMemoryProducts.filter((p) => p.isActive === true);
    activeVariants = activeProducts.flatMap((p) => p.variants || []).filter((v) => v.isActive !== false);
  }

  // Standard apparel size ordering
  const standardSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
  const uniqueSizes = Array.from(
    new Set(activeVariants.map((v) => v.size).filter((s) => s && typeof s === 'string' && s.trim()))
  ).sort((a, b) => {
    const idxA = standardSizeOrder.indexOf(a);
    const idxB = standardSizeOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Unique Colors sorted alphabetically
  const uniqueColors = Array.from(
    new Set(activeVariants.map((v) => v.color).filter((c) => c && typeof c === 'string' && c.trim()))
  ).sort((a, b) => a.localeCompare(b));

  // Price range calculation
  const validPrices = activeVariants
    .map((v) => Number(v.sellingPrice) || Number(v.mrp) || 0)
    .filter((p) => p > 0);

  const minPrice = validPrices.length > 0 ? Math.floor(Math.min(...validPrices) / 100) * 100 : 0;
  const maxPrice = validPrices.length > 0 ? Math.ceil(Math.max(...validPrices) / 100) * 100 : 10000;

  // Active categories
  let categories = [];
  try {
    const catRes = await categoryService.getCategories({ isActive: true, limit: 50 });
    categories = (catRes.data || []).filter((c) => c.isActive !== false);
  } catch (e) {
    // ignore
  }

  return {
    categories,
    sizes: uniqueSizes,
    colors: uniqueColors,
    priceRange: {
      min: minPrice,
      max: maxPrice,
    },
    availabilityOptions: [
      { label: 'All Items', value: 'all' },
      { label: 'In Stock Only', value: 'in-stock' },
      { label: 'Out of Stock', value: 'out-of-stock' },
    ],
    sortOptions: [
      { label: 'Featured', value: 'featured' },
      { label: 'Newest Arrivals', value: 'newest' },
      { label: 'Price: Low to High', value: 'price_asc' },
      { label: 'Price: High to Low', value: 'price_desc' },
      { label: 'Name: A to Z', value: 'name_asc' },
    ],
  };
}

/**
 * Retrieves a single product by ID
 * @param {string} id
 * @param {boolean} isAdmin
 */
export async function getProductById(id, isAdmin = false) {
  if (!id) return null;

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, parentId: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: isAdmin ? true : { where: { isActive: true } },
        _count: {
          select: { variants: true, images: true },
        },
      },
    });

    if (!product) return null;
    if (!isAdmin && product.isActive === false) return null;

    const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0] || null;
    const priceRange = derivePriceRange(product.variants);

    return {
      ...product,
      primaryImage,
      thumbnailUrl: primaryImage?.imageUrl || null,
      priceRange,
      sellingPrice: priceRange?.sellingPrice ?? null,
      mrp: priceRange?.mrp ?? null,
      discountPercent: priceRange?.discountPercent ?? 0,
    };
  }

  // In-memory fallback (supports both id and slug)
  const product = inMemoryProducts.find((p) => p.id === id || p.slug === id);
  if (!product) return null;
  if (!isAdmin && product.isActive === false) return null;

  return await enrichProductInMemory(product, isAdmin);
}

/**
 * Creates a new product
 */
export async function createProduct({
  title,
  description,
  categoryId,
  brand = 'Collections by Chandni',
  featured = false,
  isActive = true,
}) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    const err = new Error('Product title is required');
    err.status = 400;
    throw err;
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length > 150) {
    const err = new Error('Product title must not exceed 150 characters');
    err.status = 400;
    throw err;
  }

  if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
    const err = new Error('Category is required');
    err.status = 400;
    throw err;
  }

  const trimmedCategoryId = categoryId.trim();

  // Validate that category exists
  const category = await categoryService.getCategoryById(trimmedCategoryId);
  if (!category) {
    const err = new Error('Category does not exist');
    err.status = 400;
    throw err;
  }

  // Generate unique slug
  const slug = generateSlug(trimmedTitle);
  if (!slug) {
    const err = new Error('Invalid title for slug generation');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      const err = new Error('A product with this title or slug already exists');
      err.status = 400;
      throw err;
    }

    const created = await prisma.product.create({
      data: {
        title: trimmedTitle,
        slug,
        description: description ? description.trim() : '',
        categoryId: trimmedCategoryId,
        brand: brand ? brand.trim() : 'Collections by Chandni',
        featured: Boolean(featured),
        isActive: Boolean(isActive),
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: true,
        variants: true,
        _count: {
          select: { variants: true, images: true },
        },
      },
    });

    return {
      ...created,
      priceRange: derivePriceRange(created.variants),
    };
  }

  // In-memory create
  const existingSlug = inMemoryProducts.find((p) => p.slug === slug);
  if (existingSlug) {
    const err = new Error('A product with this title or slug already exists');
    err.status = 400;
    throw err;
  }

  const newProduct = {
    id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: trimmedTitle,
    slug,
    description: description ? description.trim() : '',
    categoryId: trimmedCategoryId,
    brand: brand ? brand.trim() : 'Collections by Chandni',
    featured: Boolean(featured),
    isActive: Boolean(isActive),
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
    variants: [],
    hasOrders: false,
  };

  inMemoryProducts.push(newProduct);
  return await enrichProductInMemory(newProduct);
}

/**
 * Updates an existing product
 */
export async function updateProduct(id, {
  title,
  description,
  categoryId,
  brand,
  featured,
  isActive,
}) {
  if (!id) {
    const err = new Error('Product ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  let existing = null;
  if (dbConnected) {
    existing = await prisma.product.findUnique({ where: { id } });
  } else {
    existing = inMemoryProducts.find((p) => p.id === id);
  }

  if (!existing) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  // Validate title and slug if updated
  let updatedSlug = existing.slug;
  let trimmedTitle = existing.title;

  if (title !== undefined) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      const err = new Error('Product title cannot be empty');
      err.status = 400;
      throw err;
    }
    trimmedTitle = title.trim();
    if (trimmedTitle.length > 150) {
      const err = new Error('Product title must not exceed 150 characters');
      err.status = 400;
      throw err;
    }

    updatedSlug = generateSlug(trimmedTitle);

    // Check slug uniqueness
    if (dbConnected) {
      const slugConflict = await prisma.product.findFirst({
        where: {
          slug: updatedSlug,
          NOT: { id },
        },
      });
      if (slugConflict) {
        const err = new Error('A product with this title or slug already exists');
        err.status = 400;
        throw err;
      }
    } else {
      const slugConflict = inMemoryProducts.find(
        (p) => p.slug === updatedSlug && p.id !== id
      );
      if (slugConflict) {
        const err = new Error('A product with this title or slug already exists');
        err.status = 400;
        throw err;
      }
    }
  }

  // Validate categoryId if updated
  let finalCategoryId = existing.categoryId;
  if (categoryId !== undefined) {
    if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
      const err = new Error('Category is required');
      err.status = 400;
      throw err;
    }
    const trimmedCat = categoryId.trim();
    const catExists = await categoryService.getCategoryById(trimmedCat);
    if (!catExists) {
      const err = new Error('Category does not exist');
      err.status = 400;
      throw err;
    }
    finalCategoryId = trimmedCat;
  }

  const updateData = {
    title: trimmedTitle,
    slug: updatedSlug,
    description: description !== undefined ? (description ? description.trim() : '') : existing.description,
    categoryId: finalCategoryId,
    brand: brand !== undefined ? (brand ? brand.trim() : 'Collections by Chandni') : existing.brand,
    featured: featured !== undefined ? Boolean(featured) : existing.featured,
    isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    updatedAt: new Date(),
  };

  if (dbConnected) {
    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
        _count: {
          select: { variants: true, images: true },
        },
      },
    });

    return {
      ...updated,
      priceRange: derivePriceRange(updated.variants),
    };
  }

  // In-memory update
  const idx = inMemoryProducts.findIndex((p) => p.id === id);
  inMemoryProducts[idx] = {
    ...inMemoryProducts[idx],
    ...updateData,
  };

  return await enrichProductInMemory(inMemoryProducts[idx]);
}

/**
 * Toggles product active status
 */
export async function updateProductStatus(id, isActive) {
  if (typeof isActive !== 'boolean') {
    const err = new Error('isActive must be a boolean');
    err.status = 400;
    throw err;
  }

  return await updateProduct(id, { isActive });
}

/**
 * Safely deletes a product
 * Returns 409 Conflict if product has customer order history
 */
export async function deleteProduct(id) {
  if (!id) {
    const err = new Error('Product ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          select: { id: true },
        },
      },
    });

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    // Check order history on any product variant
    const variantIds = product.variants.map((v) => v.id);
    let orderItemCount = 0;
    if (variantIds.length > 0) {
      orderItemCount = await prisma.orderItem.count({
        where: {
          productVariantId: { in: variantIds },
        },
      });
    }

    if (orderItemCount > 0) {
      const err = new Error(
        'Cannot delete product because it has associated customer order history. You may deactivate the product instead to preserve historical records.'
      );
      err.status = 409;
      throw err;
    }

    // Safe to delete product (cascade deletes images and variants)
    await prisma.product.delete({ where: { id } });
    return true;
  }

  // In-memory delete
  const product = inMemoryProducts.find((p) => p.id === id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  if (product.hasOrders) {
    const err = new Error(
      'Cannot delete product because it has associated customer order history. You may deactivate the product instead to preserve historical records.'
    );
    err.status = 409;
    throw err;
  }

  inMemoryProducts = inMemoryProducts.filter((p) => p.id !== id);
  return true;
}

export default {
  generateSlug,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};
