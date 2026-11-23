import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError, defaultErrorCodeForStatus, type ErrorCode } from '../utils/AppError.js';

interface KnownError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  code?: number | string;
  details?: unknown;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { path?: string; message?: string }>;
}

/**
 * Handles unmatched routes by forwarding a 404 AppError.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      undefined,
      'NOT_FOUND'
    )
  );
}

/**
 * Centralized Express error-handling middleware.
 */
export function errorHandler(
  err: KnownError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode ?? err.status ?? 500;
  let code: ErrorCode =
    err instanceof AppError ? err.code : defaultErrorCodeForStatus(statusCode);
  let message = err.message || 'Internal Server Error';
  let details = err instanceof AppError ? err.details : undefined;

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON in request body';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload is too large';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    const duplicateField = err.keyValue ? Object.keys(err.keyValue)[0] : undefined;
    message = duplicateField
      ? `A record with this ${duplicateField} already exists`
      : 'A record with this value already exists';
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((fieldErr) => ({
      field: fieldErr.path,
      message: fieldErr.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier format';
  }

  // Log server errors and hide internal details in production.
  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}] ${statusCode}:`, err);
    if (env.NODE_ENV === 'production' && !(err instanceof AppError)) {
      message = 'Internal server error';
      details = undefined;
    }
  }

  const response: {
    success: false;
    code: ErrorCode;
    message: string;
    details?: unknown;
    stack?: string;
  } = {
    success: false,
    code,
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
