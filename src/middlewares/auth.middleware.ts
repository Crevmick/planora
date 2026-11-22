import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/token.service.js';
import { AppError } from '../utils/AppError.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Verifies the Bearer access token and attaches `req.user`.
 */
export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Authorization token missing', 401));
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    next(new AppError('Authorization token missing', 401));
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    next(err);
  }
}
