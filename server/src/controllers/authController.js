import * as authService from '../services/authService.js';

/**
 * Controller for Customer & Admin Authentication Endpoints
 */

/**
 * POST /api/auth/register
 * Registers a new customer account
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.body || {};

    const result = await authService.registerCustomer({
      name,
      email,
      password,
      phone,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: result,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating account',
    });
  }
}

/**
 * POST /api/auth/login
 * Customer / General user login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    const result = await authService.authenticateUser({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Authentication error',
    });
  }
}

/**
 * POST /api/auth/admin/login
 * Dedicated Admin Login (Enforces ADMIN role)
 */
export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body || {};

    const result = await authService.authenticateAdmin({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: result,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Authentication error',
    });
  }
}

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
export async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Refresh full profile including phone and creation date
    const userProfile = await authService.getUserById(req.user.id);
    if (!userProfile) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or inactive',
      });
    }

    return res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/auth/profile or PUT /api/account/profile
 * Updates permitted customer profile fields (name, phone)
 */
export async function updateProfile(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { name, phone } = req.body || {};

    const updated = await authService.updateUserProfile(req.user.id, {
      name,
      phone,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating profile',
    });
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res, next) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}
