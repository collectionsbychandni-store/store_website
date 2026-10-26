/**
 * Unified API Client for Collections by Chandni
 * Handles base URL configuration, headers, JWT injection, and error normalization.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'cbc_admin_token';
const GUEST_CART_KEY = 'cbc_cart_session_id';

/**
 * Retrieves the stored authentication token across all supported keys
 */
export function getStoredToken() {
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem('cbc_auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      null
    );
  } catch (e) {
    return null;
  }
}

/**
 * Stores the authentication token synchronously across all supported keys
 */
export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('cbc_auth_token', token);
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('cbc_auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
    }
  } catch (e) {
    console.error('Failed to update stored token:', e);
  }
}

/**
 * Removes the stored authentication token
 */
export function removeStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('cbc_auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('cbc_admin_user');
  } catch (e) {
    console.error('Failed to remove stored token:', e);
  }
}

/**
 * Retrieves the stored guest cart session ID
 */
export function getStoredGuestCartId() {
  try {
    return localStorage.getItem(GUEST_CART_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Stores the guest cart session ID
 */
export function setStoredGuestCartId(sessionId) {
  try {
    if (sessionId) {
      localStorage.setItem(GUEST_CART_KEY, sessionId);
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
    }
  } catch (e) {
    console.error('Failed to update stored guest cart session:', e);
  }
}

/**
 * Removes the stored guest cart session ID
 */
export function removeStoredGuestCartId() {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch (e) {
    console.error('Failed to remove stored guest cart session:', e);
  }
}

/**
 * Core API request wrapper
 * @param {string} endpoint - e.g. '/api/auth/me'
 * @param {object} options - fetch options
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Automatically attach JWT token if present
  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Automatically attach Guest Cart session ID if present
  const guestCartId = getStoredGuestCartId();
  if (guestCartId && !headers['X-Cart-Session-Id']) {
    headers['X-Cart-Session-Id'] = guestCartId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Capture returned session ID from server header if present
  const returnedSessionId = response.headers.get('x-cart-session-id');
  if (returnedSessionId) {
    setStoredGuestCartId(returnedSessionId);
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
  } else {
    const text = await response.text();
    data = { message: text };
  }

  // Also check if data payload returned a guestId
  if (data?.guestId) {
    setStoredGuestCartId(data.guestId);
  }

  if (!response.ok) {
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    error.response = { data, status: response.status, headers: response.headers };
    throw error;
  }

  return data;
}

/**
 * Checks API server health
 * GET /api/health
 */
export async function checkApiHealth() {
  try {
    return await apiRequest('/api/health', { method: 'GET' });
  } catch (error) {
    console.warn('API Health check error:', error);
    throw error;
  }
}

/**
 * Checks PostgreSQL database connection health
 * GET /api/health/db
 */
export async function checkDatabaseHealth() {
  try {
    return await apiRequest('/api/health/db', { method: 'GET' });
  } catch (error) {
    console.warn('Database health check error:', error);
    return {
      success: false,
      message: 'Database connection failed',
      error: error.message || 'Unable to connect to database',
    };
  }
}

function normalizeUrl(endpoint) {
  if (endpoint.startsWith('/api') || endpoint.startsWith('http')) {
    return endpoint;
  }
  return `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

export const api = {
  request: apiRequest,
  get: (endpoint, options = {}) => {
    let url = normalizeUrl(endpoint);
    if (options.params) {
      const qs = new URLSearchParams();
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          qs.append(k, String(v));
        }
      });
      const queryStr = qs.toString();
      if (queryStr) {
        url += (url.includes('?') ? '&' : '?') + queryStr;
      }
    }
    return apiRequest(url, { ...options, method: 'GET' });
  },
  post: (endpoint, body, options = {}) => {
    return apiRequest(normalizeUrl(endpoint), {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },
  put: (endpoint, body, options = {}) => {
    return apiRequest(normalizeUrl(endpoint), {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },
  patch: (endpoint, body, options = {}) => {
    return apiRequest(normalizeUrl(endpoint), {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  },
  delete: (endpoint, options = {}) => {
    return apiRequest(normalizeUrl(endpoint), { ...options, method: 'DELETE' });
  },
  apiRequest,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  checkApiHealth,
  checkDatabaseHealth,
};

export default api;
