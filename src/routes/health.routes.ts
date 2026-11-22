import { Router } from 'express';
import { getHealthStatus } from '../controllers/health.controller.js';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check server and database health
 *     responses:
 *       200:
 *         description: Server and MongoDB status
 */
router.get('/', getHealthStatus);

export default router;
