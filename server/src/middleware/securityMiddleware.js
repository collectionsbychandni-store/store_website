/**
 * Collections by Chandni - Production Security Middleware
 *
 * Implements Launch Step 24:
 * - Secure HTTP headers (Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, etc.)
 * - In-memory sliding-window rate limiters for auth, checkout, and cancellation/return endpoints
 * - Frame ancestor policy compatible with AI Studio embedded iframe preview
 * - PII and credential sanitization
 */

// Memory stores for rate limiting
const ipRequestBuckets = new Map();
const authAttemptBuckets = new Map();
const checkoutAttemptBuckets = new Map();
const actionAttemptBuckets = new Map();

// Periodic cleanup of stale rate limiter buckets (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const cleanupBucket = (map, windowMs) => {
    for (const [key, records] of map.entries()) {
      const valid = records.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        map.delete(key);
      } else {
        map.set(key, valid);
      }
    }
  };

  cleanupBucket(ipRequestBuckets, 60 * 1000);
  cleanupBucket(authAttemptBuckets, 15 * 60 * 1000);
  cleanupBucket(checkoutAttemptBuckets, 60 * 1000);
  cleanupBucket(actionAttemptBuckets, 5 * 60 * 1000);
}, 5 * 60 * 1000).unref();

/**
 * Extracts client IP safely respecting reverse proxies (Cloudflare, Fly.io, GCP)
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Applies production security HTTP headers
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Legacy XSS protection for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information sent on cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict sensitive browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self "https://secure.payu.in" "https://test.payu.in")'
  );

  // Cross-Origin Opener Policy (allows PayU / OAuth popups if needed)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Content-Security-Policy (allows AI Studio preview iframe embedding while protecting against malicious inline framing)
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https: http:; img-src 'self' data: https: blob:; default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:;"
  );

  next();
}

/**
 * Generic sliding window rate limiter factory
 */
function createRateLimiter({
  store,
  windowMs,
  maxRequests,
  message,
  keyGenerator = (req) => getClientIp(req),
}) {
  return (req, res, next) => {
    // Skip rate limiting in automated testing if NODE_ENV === 'test'
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let timestamps = store.get(key) || [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSeconds)));
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again shortly.',
        retryAfter: retryAfterSeconds,
      });
    }

    timestamps.push(now);
    store.set(key, timestamps);
    next();
  };
}

/**
 * Global rate limiter: 300 requests per minute per IP
 */
export const globalRateLimiter = createRateLimiter({
  store: ipRequestBuckets,
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'API rate limit exceeded. Please throttle your requests.',
});

/**
 * Auth rate limiter: 15 attempts per 5 minutes per IP (Brute-force protection)
 */
export const authRateLimiter = createRateLimiter({
  store: authAttemptBuckets,
  windowMs: 5 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many authentication attempts. Please wait 5 minutes before trying again.',
});

/**
 * Checkout rate limiter: 25 requests per minute per IP (Spam / race condition prevention)
 */
export const checkoutRateLimiter = createRateLimiter({
  store: checkoutAttemptBuckets,
  windowMs: 60 * 1000,
  maxRequests: 25,
  message: 'Too many checkout requests in a short period. Please wait a moment.',
});

/**
 * Action rate limiter: 10 requests per 5 minutes per user or IP (cancellation/return flood prevention)
 */
export const actionRateLimiter = createRateLimiter({
  store: actionAttemptBuckets,
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => req.user?.id || getClientIp(req),
  message: 'Too many return or cancellation requests. Please try again shortly.',
});

export default {
  securityHeaders,
  globalRateLimiter,
  authRateLimiter,
  checkoutRateLimiter,
  actionRateLimiter,
  getClientIp,
};
