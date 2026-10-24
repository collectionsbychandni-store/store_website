import * as addressService from '../services/addressService.js';

/**
 * Controller for Customer Saved Addresses
 * Enforces authenticated patron session isolation on all operations.
 */

/**
 * GET /api/account/addresses
 */
export async function getAddresses(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view addresses',
      });
    }

    const addresses = await addressService.getAddressesByUserId(userId);
    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving addresses',
    });
  }
}

/**
 * GET /api/account/addresses/:id
 */
export async function getAddress(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const address = await addressService.getAddressById({ id, userId });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or unauthorized',
      });
    }

    return res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error retrieving address',
    });
  }
}

/**
 * POST /api/account/addresses
 */
export async function createAddress(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to add an address',
      });
    }

    const {
      name,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      addressType,
      isDefault,
    } = req.body || {};

    const address = await addressService.createAddress({
      userId,
      name,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      addressType,
      isDefault,
    });

    return res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error creating address',
      details: error.details,
    });
  }
}

/**
 * PUT /api/account/addresses/:id
 */
export async function updateAddress(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to update address',
      });
    }

    const {
      name,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      addressType,
      isDefault,
    } = req.body || {};

    const updated = await addressService.updateAddress({
      id,
      userId,
      name,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      addressType,
      isDefault,
    });

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: updated,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating address',
      details: error.details,
    });
  }
}

/**
 * DELETE /api/account/addresses/:id
 */
export async function deleteAddress(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await addressService.deleteAddress({ id, userId });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error deleting address',
    });
  }
}

/**
 * PATCH /api/account/addresses/:id/default
 */
export async function setDefaultAddress(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const updated = await addressService.setDefaultAddress({ id, userId });
    return res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: updated,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating default address',
    });
  }
}
