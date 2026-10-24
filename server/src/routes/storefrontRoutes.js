import { Router } from 'express';
import * as storefrontController from '../controllers/storefrontController.js';

const router = Router();

// Public customer storefront routes (no authentication required)
router.get('/home', storefrontController.getStorefrontHome);

export default router;
