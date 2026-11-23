import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as dashboardService from '../services/dashboard.service.js';

export async function getDashboard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const metrics = await dashboardService.getDashboardMetrics(req.user!.userId);
    res.status(200).json(metrics);
  } catch (err) {
    next(err);
  }
}
