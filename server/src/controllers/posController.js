import posService, { POS_STORE_CONFIG } from '../services/posService.js';

/**
 * Collections by Chandni - Point of Sale (POS) Controller
 *
 * Implements Step 27:
 * - POS Product & variant search
 * - Walk-in & registered customer lookup
 * - Atomically debited POS counter checkout
 * - Historical bill lookup and reprint
 */

/**
 * Search products and available variants for POS billing counter
 * GET /api/admin/pos/products
 */
export async function searchProducts(req, res) {
  try {
    const { search, categoryId, inStockOnly } = req.query;
    const products = await posService.searchPosProducts({
      search,
      categoryId,
      inStockOnly: inStockOnly === 'true' || inStockOnly === '1',
    });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to search POS products',
    });
  }
}

/**
 * Search registered customers for POS billing
 * GET /api/admin/pos/customers
 */
export async function searchCustomers(req, res) {
  try {
    const { q, search } = req.query;
    const customers = await posService.searchPosCustomers(q || search || '');

    return res.json({
      success: true,
      customers,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to search customers',
    });
  }
}

/**
 * Execute in-store POS checkout
 * POST /api/admin/pos/checkout
 */
export async function checkout(req, res) {
  try {
    const {
      items,
      customer,
      paymentMethod,
      discountType,
      discountValue,
      taxRate,
      cashTendered,
      notes,
      idempotencyKey,
    } = req.body;

    const result = await posService.createPosSale({
      items,
      customer,
      paymentMethod,
      discountType,
      discountValue,
      taxRate,
      cashTendered,
      notes,
      idempotencyKey,
      cashierUser: req.user,
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'POS checkout failed',
      code: error.code || 'POS_CHECKOUT_FAILED',
    });
  }
}

/**
 * Retrieve recent POS bills list
 * GET /api/admin/pos/bills
 */
export async function getRecentBills(req, res) {
  try {
    const { page, limit, search, date, paymentMethod } = req.query;
    const result = await posService.getPosBills({
      page,
      limit,
      search,
      date,
      paymentMethod,
    });

    return res.json({
      success: true,
      ...result,
      storeConfig: POS_STORE_CONFIG,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve POS bills',
    });
  }
}

/**
 * Retrieve single POS bill details for view/reprint
 * GET /api/admin/pos/bills/:id
 */
export async function getBillDetails(req, res) {
  try {
    const { id } = req.params;
    const bill = await posService.getPosBillById(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'POS bill not found',
      });
    }

    return res.json({
      success: true,
      bill,
      storeConfig: POS_STORE_CONFIG,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve POS bill details',
    });
  }
}

/**
 * Get POS configuration & store branding details
 * GET /api/admin/pos/config
 */
export async function getPosConfig(req, res) {
  return res.json({
    success: true,
    storeConfig: POS_STORE_CONFIG,
  });
}

export default {
  searchProducts,
  searchCustomers,
  checkout,
  getRecentBills,
  getBillDetails,
  getPosConfig,
};
