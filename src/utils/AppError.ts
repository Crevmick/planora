export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'INVALID_ID'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'FORBIDDEN'
  | 'CORS_FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'BAD_GATEWAY'
  | 'INTERNAL_ERROR';

export function defaultErrorCodeForStatus(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 429:
      return 'RATE_LIMITED';
    case 502:
      return 'BAD_GATEWAY';
    default:
      return 'INTERNAL_ERROR';
  }
}

/**
 * Operational HTTP error with status code, machine-readable code, and optional details.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(
    message: string,
    statusCode = 500,
    details?: unknown,
    code?: ErrorCode
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.code =
      code ??
      (statusCode === 400 && details !== undefined
        ? 'VALIDATION_ERROR'
        : defaultErrorCodeForStatus(statusCode));
    Error.captureStackTrace(this, this.constructor);
  }
}
