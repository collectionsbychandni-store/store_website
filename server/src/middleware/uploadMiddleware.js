import multer from 'multer';

// Use Memory Storage so files are validated in-memory and streamed to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Initial MIME check (server-side magic bytes validator executes next)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      const err = new Error(
        `Invalid file type "${file.mimetype}". Only JPEG, PNG, and WebP are allowed.`
      );
      err.status = 400;
      err.code = 'INVALID_FILE_TYPE';
      cb(err, false);
    }
  },
});

/**
 * Middleware handling up to 10 uploaded images with field name 'images' or 'image'
 */
export function handleImageUpload(req, res, next) {
  // Support both 'images' (multiple) and 'image' (single)
  const uploadFields = upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'image', maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'One or more files exceed the maximum allowed size of 5 MB.',
            code: 'FILE_TOO_LARGE',
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded. Maximum 10 images are allowed per product.',
            code: 'TOO_MANY_FILES',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          code: err.code,
        });
      }

      const status = err.status || 400;
      return res.status(status).json({
        success: false,
        message: err.message || 'File upload failed',
        code: err.code || 'UPLOAD_FAILED',
      });
    }

    // Normalize req.files to a flat array
    let files = [];
    if (req.files) {
      if (Array.isArray(req.files.images)) {
        files = files.concat(req.files.images);
      }
      if (Array.isArray(req.files.image)) {
        files = files.concat(req.files.image);
      }
    } else if (req.file) {
      files = [req.file];
    }
    req.uploadedFiles = files;

    next();
  });
}

export default {
  handleImageUpload,
};
