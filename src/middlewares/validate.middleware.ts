import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { matchedData, type ValidationChain, validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

/**
 * Checks express-validator results and forwards a 400 AppError if invalid.
 */
export function handleValidationErrors(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new AppError('Validation failed', 400, errors.array()));
    return;
  }

  req.body = matchedData(req, { locations: ['body'], includeOptionals: false });
  next();
}

/**
 * Combines express-validator chains with the error handler into a middleware array.
 */
export function validate(chains: ValidationChain[]): RequestHandler[] {
  return [...chains, handleValidationErrors];
}
