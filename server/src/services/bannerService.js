import prisma from '../config/db.js';
import {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
} from '../config/cloudinary.js';

let lastDbCheckTime = 0;
let lastDbAliveStatus = false;

async function isDatabaseAlive() {
  const now = Date.now();
  if (now - lastDbCheckTime < 10000) {
    return lastDbAliveStatus;
  }
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 500)
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

// -----------------------------------------------------------------------------
// Seed-aligned In-Memory Store for Banners (Dev & Fallback)
// -----------------------------------------------------------------------------
const INITIAL_DEMO_BANNERS = [
  {
    id: 'banner-seed-1',
    title: 'Grace in Every Thread, Royalty in Every Detail',
    subtitle: 'Discover handcrafted Indian ethnic wear, festive couture, and artisanal jewellery tailored for effortless modern grace.',
    imageUrl: '/images/chandni_hero_banner_1792063871455.jpg',
    desktopImageUrl: '/images/chandni_hero_banner_1792063871455.jpg',
    mobileImageUrl: '/images/chandni_hero_banner_1792063871455.jpg',
    imagePublicId: null,
    buttonText: 'Shop Collection',
    buttonLink: '/shop',
    destinationUrl: '/shop',
    displayOrder: 1,
    sortOrder: 1,
    isActive: true,
    startDate: null,
    endDate: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  },
  {
    id: 'banner-seed-2',
    title: 'Festive Couture & Handloom Weaves',
    subtitle: 'Exquisite Banarasi silk kurtis, zardozi embroidery, and timeless silhouettes for celebrations.',
    imageUrl: '/images/chandni_artisan_craft_1792063892951.jpg',
    desktopImageUrl: '/images/chandni_artisan_craft_1792063892951.jpg',
    mobileImageUrl: '/images/chandni_artisan_craft_1792063892951.jpg',
    imagePublicId: null,
    buttonText: 'Explore Kurtis',
    buttonLink: '/shop?category=cat-kurtis',
    destinationUrl: '/shop?category=cat-kurtis',
    displayOrder: 2,
    sortOrder: 2,
    isActive: true,
    startDate: null,
    endDate: null,
    createdAt: new Date('2026-10-05T00:00:00Z'),
    updatedAt: new Date('2026-10-05T00:00:00Z'),
  },
];

let inMemoryBanners = [...INITIAL_DEMO_BANNERS];

export function _getInMemoryBanners() {
  return inMemoryBanners;
}

/**
 * Validates and sanitizes destination URL
 * Rejects dangerous schemes like javascript:, data:, vbscript:
 */
export function validateDestinationUrl(url) {
  if (!url || typeof url !== 'string') return '/shop';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.includes('<script')
  ) {
    const err = new Error('Invalid destination URL. Unsafe URL schemes (such as javascript:) are prohibited.');
    err.status = 400;
    throw err;
  }

  // Ensure relative URLs start with /
  if (!trimmed.startsWith('/') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('#')) {
    return `/${trimmed}`;
  }

  return trimmed;
}

/**
 * Validates optional scheduling start and end dates
 */
export function validateDates(startDate, endDate) {
  let start = null;
  let end = null;

  if (startDate) {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      const err = new Error('Invalid start date format');
      err.status = 400;
      throw err;
    }
  }

  if (endDate) {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      const err = new Error('Invalid end date format');
      err.status = 400;
      throw err;
    }
  }

  if (start && end && start >= end) {
    const err = new Error('Start date/time must precede end date/time');
    err.status = 400;
    throw err;
  }

  return { startDate: start, endDate: end };
}

/**
 * Formats a banner record for consistent public and admin responses
 */
export function formatBanner(b) {
  const now = new Date();
  const startDate = b.startDate ? new Date(b.startDate) : null;
  const endDate = b.endDate ? new Date(b.endDate) : null;

  // Determine scheduling status
  let scheduleStatus = 'ACTIVE';
  let isCurrentlyEligible = Boolean(b.isActive);

  if (!b.isActive) {
    scheduleStatus = 'INACTIVE';
    isCurrentlyEligible = false;
  } else if (startDate && startDate > now) {
    scheduleStatus = 'SCHEDULED';
    isCurrentlyEligible = false;
  } else if (endDate && endDate < now) {
    scheduleStatus = 'EXPIRED';
    isCurrentlyEligible = false;
  } else {
    scheduleStatus = 'ACTIVE';
    isCurrentlyEligible = true;
  }

  const desktopUrl = b.desktopImageUrl || b.imageUrl || '';
  const mobileUrl = b.mobileImageUrl || desktopUrl || '';
  const destUrl = b.destinationUrl || b.buttonLink || '/shop';
  const order = typeof b.displayOrder === 'number' ? b.displayOrder : (typeof b.sortOrder === 'number' ? b.sortOrder : 0);

  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle || '',
    imageUrl: desktopUrl,
    desktopImageUrl: desktopUrl,
    mobileImageUrl: mobileUrl,
    imagePublicId: b.imagePublicId || null,
    buttonText: b.buttonText || 'Shop Now',
    buttonLink: destUrl,
    destinationUrl: destUrl,
    displayOrder: order,
    sortOrder: order,
    isActive: Boolean(b.isActive),
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    scheduleStatus,
    isCurrentlyEligible,
    createdAt: b.createdAt || new Date(),
    updatedAt: b.updatedAt || new Date(),
  };
}

/**
 * Retrieves public eligible active banners for storefront
 * Strictly filters out inactive, future scheduled, or past expired banners.
 * Returns in displayOrder asc, createdAt desc.
 */
export async function getPublicBanners() {
  const dbConnected = await isDatabaseAlive();
  const now = new Date();

  if (dbConnected) {
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { displayOrder: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return banners.map(formatBanner);
  }

  // In-memory fallback
  const eligible = inMemoryBanners.filter((b) => {
    if (!b.isActive) return false;
    if (b.startDate && new Date(b.startDate) > now) return false;
    if (b.endDate && new Date(b.endDate) < now) return false;
    return true;
  });

  eligible.sort((a, b) => {
    const ordA = a.displayOrder ?? a.sortOrder ?? 0;
    const ordB = b.displayOrder ?? b.sortOrder ?? 0;
    if (ordA !== ordB) return ordA - ordB;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return eligible.map(formatBanner);
}

/**
 * Retrieves all banners for admin management
 * Includes active, inactive, scheduled, and expired banners.
 */
export async function getAllBanners() {
  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const banners = await prisma.banner.findMany({
      orderBy: [
        { displayOrder: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return banners.map(formatBanner);
  }

  // In-memory fallback
  const copy = [...inMemoryBanners];
  copy.sort((a, b) => {
    const ordA = a.displayOrder ?? a.sortOrder ?? 0;
    const ordB = b.displayOrder ?? b.sortOrder ?? 0;
    if (ordA !== ordB) return ordA - ordB;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return copy.map(formatBanner);
}

/**
 * Retrieves a single banner by ID
 */
export async function getBannerById(id) {
  if (!id) {
    const err = new Error('Banner ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      const err = new Error('Banner not found');
      err.status = 404;
      throw err;
    }
    return formatBanner(banner);
  }

  const found = inMemoryBanners.find((b) => b.id === id);
  if (!found) {
    const err = new Error('Banner not found');
    err.status = 404;
    throw err;
  }

  return formatBanner(found);
}

/**
 * Uploads a banner image to Cloudinary
 * Validates format (JPEG, PNG, WebP) and size (<= 5MB)
 * Shows clear configuration error if storage credentials are not provided.
 */
export async function uploadBannerImage(file) {
  if (!file || !file.buffer) {
    const err = new Error('No image file was uploaded');
    err.status = 400;
    throw err;
  }

  // Validate format and magic numbers
  const validation = validateImageFile(file);
  if (!validation.valid) {
    const err = new Error(validation.error);
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }

  if (!isCloudinaryConfigured()) {
    const err = new Error(
      'Cloud storage credentials (Cloudinary) are not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment or use a direct image URL.'
    );
    err.status = 503;
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }

  const result = await uploadBufferToCloudinary(file.buffer, {
    folder: 'collections_by_chandni/banners',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });

  return {
    imageUrl: result.secure_url,
    desktopImageUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

/**
 * Creates a new banner
 */
export async function createBanner({
  title,
  subtitle,
  imageUrl,
  desktopImageUrl,
  mobileImageUrl,
  imagePublicId,
  buttonText = 'Shop Collection',
  destinationUrl = '/shop',
  buttonLink,
  displayOrder,
  sortOrder,
  isActive = true,
  startDate,
  endDate,
}) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    const err = new Error('Banner title is required');
    err.status = 400;
    throw err;
  }

  const finalImageUrl = (desktopImageUrl || imageUrl || '').trim();
  if (!finalImageUrl) {
    const err = new Error('Desktop image URL is required');
    err.status = 400;
    throw err;
  }

  const finalDestUrl = validateDestinationUrl(destinationUrl || buttonLink);
  const { startDate: validStart, endDate: validEnd } = validateDates(startDate, endDate);

  // Compute display order
  let order = 0;
  if (displayOrder !== undefined && !isNaN(parseInt(displayOrder, 10))) {
    order = parseInt(displayOrder, 10);
  } else if (sortOrder !== undefined && !isNaN(parseInt(sortOrder, 10))) {
    order = parseInt(sortOrder, 10);
  }

  const bannerData = {
    title: title.trim(),
    subtitle: subtitle ? subtitle.trim() : null,
    imageUrl: finalImageUrl,
    desktopImageUrl: finalImageUrl,
    mobileImageUrl: mobileImageUrl && mobileImageUrl.trim() ? mobileImageUrl.trim() : null,
    imagePublicId: imagePublicId ? imagePublicId.trim() : null,
    buttonText: buttonText ? buttonText.trim() : 'Shop Collection',
    buttonLink: finalDestUrl,
    destinationUrl: finalDestUrl,
    displayOrder: order,
    sortOrder: order,
    isActive: Boolean(isActive),
    startDate: validStart,
    endDate: validEnd,
  };

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const created = await prisma.banner.create({
      data: bannerData,
    });
    return formatBanner(created);
  }

  // In-memory fallback
  const newBanner = {
    id: `banner-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...bannerData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryBanners.push(newBanner);
  return formatBanner(newBanner);
}

/**
 * Updates an existing banner
 */
export async function updateBanner(id, updateData) {
  if (!id) {
    const err = new Error('Banner ID is required');
    err.status = 400;
    throw err;
  }

  const existing = await getBannerById(id);

  const cleanData = {};

  if (updateData.title !== undefined) {
    if (!updateData.title || !updateData.title.trim()) {
      const err = new Error('Banner title cannot be empty');
      err.status = 400;
      throw err;
    }
    cleanData.title = updateData.title.trim();
  }

  if (updateData.subtitle !== undefined) {
    cleanData.subtitle = updateData.subtitle ? updateData.subtitle.trim() : null;
  }

  if (updateData.imageUrl !== undefined || updateData.desktopImageUrl !== undefined) {
    const url = (updateData.desktopImageUrl || updateData.imageUrl || '').trim();
    if (!url) {
      const err = new Error('Desktop image URL cannot be empty');
      err.status = 400;
      throw err;
    }
    cleanData.imageUrl = url;
    cleanData.desktopImageUrl = url;
  }

  if (updateData.mobileImageUrl !== undefined) {
    cleanData.mobileImageUrl = updateData.mobileImageUrl ? updateData.mobileImageUrl.trim() : null;
  }

  if (updateData.imagePublicId !== undefined) {
    cleanData.imagePublicId = updateData.imagePublicId ? updateData.imagePublicId.trim() : null;
  }

  if (updateData.buttonText !== undefined) {
    cleanData.buttonText = updateData.buttonText ? updateData.buttonText.trim() : 'Shop Collection';
  }

  if (updateData.destinationUrl !== undefined || updateData.buttonLink !== undefined) {
    const url = validateDestinationUrl(updateData.destinationUrl || updateData.buttonLink);
    cleanData.destinationUrl = url;
    cleanData.buttonLink = url;
  }

  if (updateData.displayOrder !== undefined || updateData.sortOrder !== undefined) {
    const ord = parseInt(updateData.displayOrder ?? updateData.sortOrder, 10);
    if (!isNaN(ord)) {
      cleanData.displayOrder = ord;
      cleanData.sortOrder = ord;
    }
  }

  if (updateData.isActive !== undefined) {
    cleanData.isActive = Boolean(updateData.isActive);
  }

  if (updateData.startDate !== undefined || updateData.endDate !== undefined) {
    const start = updateData.startDate !== undefined ? updateData.startDate : existing.startDate;
    const end = updateData.endDate !== undefined ? updateData.endDate : existing.endDate;
    const { startDate: validStart, endDate: validEnd } = validateDates(start, end);
    cleanData.startDate = validStart;
    cleanData.endDate = validEnd;
  }

  cleanData.updatedAt = new Date();

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const updated = await prisma.banner.update({
      where: { id },
      data: cleanData,
    });
    return formatBanner(updated);
  }

  // In-memory fallback
  const idx = inMemoryBanners.findIndex((b) => b.id === id);
  inMemoryBanners[idx] = {
    ...inMemoryBanners[idx],
    ...cleanData,
  };

  return formatBanner(inMemoryBanners[idx]);
}

/**
 * Toggles active/inactive status of a banner
 */
export async function updateBannerStatus(id, isActive) {
  if (typeof isActive !== 'boolean') {
    const err = new Error('isActive must be a boolean');
    err.status = 400;
    throw err;
  }

  return await updateBanner(id, { isActive });
}

/**
 * Reorders banners atomically
 * @param {Array<string>} bannerIds - array of banner IDs in desired sequence
 */
export async function reorderBanners(bannerIds) {
  if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
    const err = new Error('bannerIds array is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const updates = bannerIds.map((id, index) =>
      prisma.banner.update({
        where: { id },
        data: {
          displayOrder: index + 1,
          sortOrder: index + 1,
          updatedAt: new Date(),
        },
      })
    );

    await prisma.$transaction(updates);
    return await getAllBanners();
  }

  // In-memory fallback
  bannerIds.forEach((id, index) => {
    const b = inMemoryBanners.find((item) => item.id === id);
    if (b) {
      b.displayOrder = index + 1;
      b.sortOrder = index + 1;
      b.updatedAt = new Date();
    }
  });

  return await getAllBanners();
}

/**
 * Safely deletes a banner
 * Does not delete cloud images if they are used elsewhere
 */
export async function deleteBanner(id) {
  if (!id) {
    const err = new Error('Banner ID is required');
    err.status = 400;
    throw err;
  }

  const existing = await getBannerById(id);
  const dbConnected = await isDatabaseAlive();

  // If banner had an imagePublicId, check if another banner still references it before cloud deletion
  if (existing.imagePublicId && isCloudinaryConfigured()) {
    let isShared = false;
    if (dbConnected) {
      const other = await prisma.banner.findFirst({
        where: {
          imagePublicId: existing.imagePublicId,
          NOT: { id },
        },
      });
      if (other) isShared = true;
    } else {
      isShared = inMemoryBanners.some((b) => b.imagePublicId === existing.imagePublicId && b.id !== id);
    }

    if (!isShared) {
      try {
        await deleteFromCloudinary(existing.imagePublicId);
      } catch (cloudErr) {
        console.warn('Could not delete banner image from Cloudinary:', cloudErr.message);
      }
    }
  }

  if (dbConnected) {
    await prisma.banner.delete({ where: { id } });
    return true;
  }

  inMemoryBanners = inMemoryBanners.filter((b) => b.id !== id);
  return true;
}

export default {
  validateDestinationUrl,
  validateDates,
  formatBanner,
  getPublicBanners,
  getAllBanners,
  getBannerById,
  uploadBannerImage,
  createBanner,
  updateBanner,
  updateBannerStatus,
  reorderBanners,
  deleteBanner,
  _getInMemoryBanners,
};
