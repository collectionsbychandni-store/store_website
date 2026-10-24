/**
 * Standardized API response utilities for Collections by Chandni API
 */

export const successResponse = (res, message, data = null, statusCode = 200) => {
  const payload = {
    success: true,
    message,
  };
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
};

export const errorResponse = (res, message = 'Internal server error', statusCode = 500, error = null) => {
  const payload = {
    success: false,
    message,
  };
  if (error && process.env.NODE_ENV === 'development') {
    payload.error = error.message || error;
  }
  return res.status(statusCode).json(payload);
};
