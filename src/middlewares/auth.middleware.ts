import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/user.model.js';
import { verifyAccessToken } from '../services/token.service.js';
import { AppError } from '../utils/AppError.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Verifies the Bearer access token, ensures the account is not soft-deleted, and attaches `req.user`.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
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
    const activeUser = await User.exists({ _id: decoded.sub, deletedAt: null });
    if (!activeUser) {
      next(new AppError('Account not found or has been deleted', 401));
      return;
    }
    req.user = { userId: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    next(err);
  }
}
