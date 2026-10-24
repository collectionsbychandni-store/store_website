import { Router } from 'express';
import { checkHealth, checkDbHealth } from '../controllers/healthController.js';

const router = Router();

// GET /api/health
router.get('/health', checkHealth);

// GET /api/health/db
router.get('/health/db', checkDbHealth);

export default router;
