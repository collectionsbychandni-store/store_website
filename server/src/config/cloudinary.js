import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

/**
 * Configure Cloudinary using server-side environment variables.
 * Never expose CLOUDINARY_API_SECRET to the client.
 */
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

const isConfigured = Boolean(
  cloudName &&
  apiKey &&
  apiSecret &&
  !cloudName.includes('replace') &&
  !apiKey.includes('replace') &&
  !apiSecret.includes('replace')
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/**
 * Checks if Cloudinary is configured with valid credentials
 * @returns {boolean}
 */
export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_CLOUD_NAME.includes('replace')
  );
}

/**
 * Returns public configuration status (safe for clients)
 */
export function getCloudinaryStatus() {
  const configured = isCloudinaryConfigured();
  return {
    configured,
    cloudName: configured ? process.env.CLOUDINARY_CLOUD_NAME : null,
    provider: 'Cloudinary',
    maxFileSizeMB: 5,
    maxImagesPerProduct: 10,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  };
}

/**
 * Uploads a file buffer directly to Cloudinary via upload stream
 * @param {Buffer} buffer
 * @param {object} options
 * @returns {Promise<{ url: string, secure_url: string, public_id: string, format: string, width: number, height: number, bytes: number }>}
 */
export function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      const err = new Error(
        'Cloudinary credentials are not configured in server environment. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
      );
      err.status = 503;
      err.code = 'STORAGE_NOT_CONFIGURED';
      return reject(err);
    }

    const uploadOptions = {
      folder: 'collections_by_chandni/products',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });

    stream.end(buffer);
  });
}

/**
 * Deletes an image from Cloudinary by its public ID
 * @param {string} publicId
 * @returns {Promise<object>}
 */
export async function deleteFromCloudinary(publicId) {
  if (!isCloudinaryConfigured() || !publicId) {
    return { result: 'skipped_not_configured' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return result;
  } catch (error) {
    console.error('Error deleting asset from Cloudinary:', error);
    // Don't fail the whole operation if Cloudinary deletion returns an error
    return { result: 'error', error: error.message };
  }
}

/**
 * Validates file buffer magic bytes and size
 * Accepts JPEG, PNG, and WebP
 * Enforces 5 MB limit
 * @param {{ buffer: Buffer, size: number, originalname: string, mimetype: string }} file
 * @returns {{ valid: boolean, error?: string, format?: string }}
 */
export function validateImageFile(file) {
  if (!file || !file.buffer) {
    return { valid: false, error: 'No file buffer provided' };
  }

  // 1. Check size (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File "${file.originalname}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed size of 5 MB.`,
    };
  }

  const buf = file.buffer;
  if (buf.length < 12) {
    return { valid: false, error: 'File is too small to be a valid image.' };
  }

  // 2. Check Magic Numbers:
  // JPEG: FF D8 FF
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;

  // WebP: RIFF (bytes 0-3: 52 49 46 46) and WEBP (bytes 8-11: 57 45 42 50)
  const isWebp =
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50;

  if (isJpeg) return { valid: true, format: 'jpeg', extension: 'jpg' };
  if (isPng) return { valid: true, format: 'png', extension: 'png' };
  if (isWebp) return { valid: true, format: 'webp', extension: 'webp' };

  return {
    valid: false,
    error: `Unsupported image format for "${file.originalname}". Only JPEG, PNG, and WebP images are permitted.`,
  };
}

export default {
  cloudinary,
  isCloudinaryConfigured,
  getCloudinaryStatus,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
};
