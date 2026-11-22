import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface ResetTokenPayload {
  sub: string;
  email: string;
  type: 'password-reset';
}

/**
 * Hashes an opaque or JWT token with SHA-256 before storing in MongoDB.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(userId: string, email: string): string {
  const payload: AccessTokenPayload = { sub: userId, email, type: 'access' };
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== 'access') {
      throw new AppError('Invalid access token type', 401);
    }
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired access token', 401);
  }
}

export function signRefreshToken(userId: string): { token: string; expiresAt: Date } {
  const payload: RefreshTokenPayload = {
    sub: userId,
    jti: crypto.randomUUID(),
    type: 'refresh',
  };
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { token, expiresAt };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token type', 401);
    }
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

export function signPasswordResetToken(userId: string, email: string): string {
  const payload: ResetTokenPayload = { sub: userId, email, type: 'password-reset' };
  const options: SignOptions = {
    expiresIn: env.JWT_RESET_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_RESET_SECRET, options);
}

export function verifyPasswordResetToken(token: string): ResetTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_RESET_SECRET) as ResetTokenPayload;
    if (decoded.type !== 'password-reset') {
      throw new AppError('Invalid password reset token', 401);
    }
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired password reset token', 401);
  }
}
