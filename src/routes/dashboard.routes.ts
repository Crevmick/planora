import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags:
 *       - 7. Dashboard
 *     summary: Get dashboard greeting and task completion metrics
 *     description: Returns user summary, today's task completion counts (`today.completedTasks` of `today.totalTasks`), and overall task completion percentage (`overall.completionPercentage`).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *       401:
 *         description: Unauthorized
 */
router.get('/', dashboardController.getDashboard);

export default router;
