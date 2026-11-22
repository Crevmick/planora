import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

interface MongoLikeError extends Error {
  statusCode?: number;
  code?: number;
  details?: unknown;
}

/**
 * Handles unmatched routes by forwarding a 404 error.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
}

/**
 * Centralized Express error-handling middleware.
 */
export function errorHandler(
  err: MongoLikeError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode ?? 500;
  let message = err.message || 'Internal Server Error';
  let details = err instanceof AppError ? err.details : undefined;

  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier format';
  }

  const response: { message: string; details?: unknown; stack?: string } = {
    message,
  };

  if (details !== undefined) {
    response.details = details;
  }

  if (env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
