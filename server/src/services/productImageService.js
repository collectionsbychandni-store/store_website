import prisma from '../config/db.js';
import * as productService from './productService.js';
import {
  isCloudinaryConfigured,
  getCloudinaryStatus,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
} from '../config/cloudinary.js';

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
 * Formats a ProductImage record for consistent API responses
 */
export function formatImage(img, index = 0) {
  return {
    id: img.id,
    productId: img.productId,
    imageUrl: img.imageUrl,
    publicId: img.publicId || null,
    altText: img.altText || null,
    sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : index + 1,
    isPrimary: Boolean(img.isPrimary),
    createdAt: img.createdAt || new Date(),
    updatedAt: img.updatedAt || new Date(),
  };
}

/**
 * Returns all images for a specific product in display order
 * @param {string} productId
 * @returns {Promise<Array>}
 */
export async function getProductImages(productId) {
  if (!productId) {
    const err = new Error('Product ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return images.map(formatImage);
  }

  // In-memory fallback
  const inMemProducts = productService._getInMemoryProducts();
  const product = inMemProducts.find((p) => p.id === productId);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  const images = [...(product.images || [])].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  return images.map((img, i) => formatImage({ ...img, productId }, i));
}

/**
 * Uploads one or more images for a product using Cloudinary
 * Validates magic numbers, size (<= 5MB), and product image limit (max 10)
 * @param {string} productId
 * @param {Array<Express.Multer.File>} files
 * @param {Array<string>} altTextList
 * @returns {Promise<Array>}
 */
export async function uploadProductImages(productId, files = [], altTextList = []) {
  if (!productId) {
    const err = new Error('Product ID is required');
    err.status = 400;
    throw err;
  }

  if (!files || files.length === 0) {
    const err = new Error('No image files provided for upload');
    err.status = 400;
    throw err;
  }

  // 1. Verify product exists
  const dbConnected = await isDatabaseAlive();
  let existingImages = [];

  if (dbConnected) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }
    existingImages = await prisma.productImage.findMany({ where: { productId } });
  } else {
    const inMemProducts = productService._getInMemoryProducts();
    const product = inMemProducts.find((p) => p.id === productId);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }
    existingImages = product.images || [];
  }

  // 2. Validate total image count limit (Max 10 per product)
  const MAX_IMAGES = 10;
  if (existingImages.length + files.length > MAX_IMAGES) {
    const err = new Error(
      `Cannot upload ${files.length} images. Product currently has ${existingImages.length} images, and the maximum allowed is ${MAX_IMAGES}.`
    );
    err.status = 400;
    err.code = 'MAX_IMAGES_EXCEEDED';
    throw err;
  }

  // 3. Validate every file for magic bytes and size limit
  for (const file of files) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.status = 400;
      err.code = 'INVALID_FILE';
      throw err;
    }
  }

  // 4. Verify Cloudinary configuration
  if (!isCloudinaryConfigured()) {
    const err = new Error(
      'Cloud storage provider (Cloudinary) is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your server environment (.env) to enable image uploads.'
    );
    err.status = 503;
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }

  // 5. Upload files to Cloudinary and persist records
  let maxSortOrder = existingImages.reduce(
    (max, img) => Math.max(max, img.sortOrder || 0),
    0
  );
  const hasExistingPrimary = existingImages.some((img) => img.isPrimary);

  const uploadedRecords = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const altText = altTextList[i] || file.originalname?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Product Image';
    const sortOrder = maxSortOrder + i + 1;
    const isPrimary = !hasExistingPrimary && i === 0;

    // Upload to Cloudinary folder
    const uploadResult = await uploadBufferToCloudinary(file.buffer, {
      folder: `collections_by_chandni/products/${productId}`,
      public_id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    });

    if (dbConnected) {
      const created = await prisma.productImage.create({
        data: {
          productId,
          imageUrl: uploadResult.secure_url || uploadResult.url,
          publicId: uploadResult.public_id,
          altText: altText.trim(),
          sortOrder,
          isPrimary,
        },
      });
      uploadedRecords.push(formatImage(created));
    } else {
      const newImg = {
        id: `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId,
        imageUrl: uploadResult.secure_url || uploadResult.url,
        publicId: uploadResult.public_id,
        altText: altText.trim(),
        sortOrder,
        isPrimary,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingImages.push(newImg);
      uploadedRecords.push(formatImage(newImg));
    }
  }

  // Update in-memory product cache if running in fallback mode
  if (!dbConnected) {
    const inMemProducts = productService._getInMemoryProducts();
    const idx = inMemProducts.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      inMemProducts[idx].images = existingImages;
      inMemProducts[idx].updatedAt = new Date();
      productService._setInMemoryProducts(inMemProducts);
    }
  }

  return uploadedRecords;
}

/**
 * Reorders product images based on an ordered list of image IDs
 * @param {string} productId
 * @param {Array<string>} imageIds
 * @returns {Promise<Array>}
 */
export async function reorderProductImages(productId, imageIds) {
  if (!productId) {
    const err = new Error('Product ID is required');
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    const err = new Error('imageIds must be a non-empty array of image IDs');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    // 1. Verify all image IDs belong to this product
    const images = await prisma.productImage.findMany({
      where: { productId },
    });

    const existingIds = new Set(images.map((img) => img.id));
    for (const id of imageIds) {
      if (!existingIds.has(id)) {
        const err = new Error(`Image ID "${id}" does not belong to product "${productId}"`);
        err.status = 400;
        throw err;
      }
    }

    // 2. Perform atomic reorder in a transaction
    const updateOperations = imageIds.map((id, index) =>
      prisma.productImage.update({
        where: { id },
        data: { sortOrder: index + 1, updatedAt: new Date() },
      })
    );

    await prisma.$transaction(updateOperations);

    // 3. Return updated images in new sort order
    const updatedImages = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return updatedImages.map(formatImage);
  }

  // In-memory fallback
  const inMemProducts = productService._getInMemoryProducts();
  const product = inMemProducts.find((p) => p.id === productId);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  const existingImages = product.images || [];
  const existingMap = new Map(existingImages.map((img) => [img.id, img]));

  for (const id of imageIds) {
    if (!existingMap.has(id)) {
      const err = new Error(`Image ID "${id}" does not belong to product "${productId}"`);
      err.status = 400;
      throw err;
    }
  }

  // Reorder
  imageIds.forEach((id, index) => {
    const img = existingMap.get(id);
    if (img) {
      img.sortOrder = index + 1;
      img.updatedAt = new Date();
    }
  });

  existingImages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  product.images = existingImages;
  productService._setInMemoryProducts(inMemProducts);

  return existingImages.map((img, i) => formatImage({ ...img, productId }, i));
}

/**
 * Sets an image as the product's primary image
 * Automatically clears isPrimary from all other images for this product
 * @param {string} productId
 * @param {string} imageId
 * @returns {Promise<Array>}
 */
export async function setPrimaryProductImage(productId, imageId) {
  if (!productId || !imageId) {
    const err = new Error('Product ID and Image ID are required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.productId !== productId) {
      const err = new Error(`Image "${imageId}" not found for product "${productId}"`);
      err.status = 404;
      throw err;
    }

    // Atomic transaction: reset other images, set target as primary
    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId, id: { not: imageId } },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true, updatedAt: new Date() },
      }),
    ]);

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return images.map(formatImage);
  }

  // In-memory fallback
  const inMemProducts = productService._getInMemoryProducts();
  const product = inMemProducts.find((p) => p.id === productId);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  const images = product.images || [];
  const target = images.find((img) => img.id === imageId);
  if (!target) {
    const err = new Error(`Image "${imageId}" not found for product "${productId}"`);
    err.status = 404;
    throw err;
  }

  images.forEach((img) => {
    img.isPrimary = img.id === imageId;
    img.updatedAt = new Date();
  });

  product.images = images;
  productService._setInMemoryProducts(inMemProducts);

  return images.map((img, i) => formatImage({ ...img, productId }, i));
}

/**
 * Updates alt text for an image
 * @param {string} productId
 * @param {string} imageId
 * @param {string} altText
 * @returns {Promise<object>}
 */
export async function updateImageAltText(productId, imageId, altText) {
  if (!productId || !imageId) {
    const err = new Error('Product ID and Image ID are required');
    err.status = 400;
    throw err;
  }

  const cleanAlt = typeof altText === 'string' ? altText.trim() : '';

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      const err = new Error(`Image "${imageId}" not found for product "${productId}"`);
      err.status = 404;
      throw err;
    }

    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: { altText: cleanAlt, updatedAt: new Date() },
    });

    return formatImage(updated);
  }

  // In-memory fallback
  const inMemProducts = productService._getInMemoryProducts();
  const product = inMemProducts.find((p) => p.id === productId);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  const images = product.images || [];
  const target = images.find((img) => img.id === imageId);
  if (!target) {
    const err = new Error(`Image "${imageId}" not found for product "${productId}"`);
    err.status = 404;
    throw err;
  }

  target.altText = cleanAlt;
  target.updatedAt = new Date();
  productService._setInMemoryProducts(inMemProducts);

  return formatImage({ ...target, productId });
}

/**
 * Safely deletes a product image
 * Removes from Cloudinary (if publicId exists) and deletes database record
 * Automatically promotes next image to primary if deleted image was primary
 * @param {string} productId
 * @param {string} imageId
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deleteProductImage(productId, imageId) {
  if (!productId || !imageId) {
    const err = new Error('Product ID and Image ID are required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      const err = new Error(`Image "${imageId}" not found for product "${productId}"`);
      err.status = 404;
      throw err;
    }

    // 1. Delete asset from Cloudinary if publicId exists
    if (image.publicId && isCloudinaryConfigured()) {
      await deleteFromCloudinary(image.publicId);
    }

    // 2. Delete from database
    await prisma.productImage.delete({ where: { id: imageId } });

    // 3. If deleted image was primary, promote remaining lowest sortOrder image
    if (image.isPrimary) {
      const remaining = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
      if (remaining) {
        await prisma.productImage.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }

    return {
      success: true,
      message: 'Product image deleted successfully',
    };
  }

  // In-memory fallback
  const inMemProducts = productService._getInMemoryProducts();
  const product = inMemProducts.find((p) => p.id === productId);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  const images = product.images || [];
  const idx = images.findIndex((img) => img.id === imageId);
  if (idx === -1) {
    const err = new Error(`Image "${imageId}" not found for product "${productId}"`);
    err.status = 404;
    throw err;
  }

  const target = images[idx];
  if (target.publicId && isCloudinaryConfigured()) {
    await deleteFromCloudinary(target.publicId);
  }

  const wasPrimary = target.isPrimary;
  images.splice(idx, 1);

  if (wasPrimary && images.length > 0) {
    images.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    images[0].isPrimary = true;
  }

  product.images = images;
  productService._setInMemoryProducts(inMemProducts);

  return {
    success: true,
    message: 'Product image deleted successfully',
  };
}

/**
 * Returns storage configuration status and setup instructions
 */
export function getStorageStatus() {
  return getCloudinaryStatus();
}

export default {
  formatImage,
  getProductImages,
  uploadProductImages,
  reorderProductImages,
  setPrimaryProductImage,
  updateImageAltText,
  deleteProductImage,
  getStorageStatus,
};
