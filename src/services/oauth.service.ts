import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import type { AuthProvider } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface OAuthProfile {
  provider: Exclude<AuthProvider, 'local'>;
  providerId: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

/**
 * Verifies a Google or Apple ID token against the provider's official JWKS.
 */
export async function verifyOAuthIdToken(
  provider: Exclude<AuthProvider, 'local'>,
  idToken: string
): Promise<OAuthProfile> {
  try {
    if (provider === 'google') {
      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        ...(env.GOOGLE_CLIENT_ID ? { audience: env.GOOGLE_CLIENT_ID } : {}),
      });

      if (!payload.sub || typeof payload.email !== 'string') {
        throw new AppError('Google token missing required user claims', 401);
      }

      return {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email.toLowerCase(),
        name: typeof payload.name === 'string' ? payload.name : undefined,
        emailVerified: Boolean(payload.email_verified),
      };
    }

    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      ...(env.APPLE_CLIENT_ID ? { audience: env.APPLE_CLIENT_ID } : {}),
    });

    if (!payload.sub || typeof payload.email !== 'string') {
      throw new AppError('Apple token missing required user claims', 401);
    }

    return {
      provider: 'apple',
      providerId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Invalid or expired ${provider} ID token`, 401);
  }
}
