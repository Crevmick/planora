import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { type AuthProvider, type IUser, User } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import {
  sendEmailVerificationCodeEmail,
  sendPasswordResetCodeEmail,
  sendWelcomeEmail,
} from './email.service.js';
import { verifyOAuthIdToken } from './oauth.service.js';
import {
  hashToken,
  signAccessToken,
  signPasswordResetToken,
  signRefreshToken,
  verifyPasswordResetToken,
  verifyRefreshToken,
} from './token.service.js';

const MAX_ACTIVE_REFRESH_TOKENS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

async function createOtpChallenge(): Promise<{
  code: string;
  codeHash: string;
  expiresAt: Date;
}> {
  const code = crypto.randomInt(1000, 10000).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  return { code, codeHash, expiresAt };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: ReturnType<IUser['toJSON']>;
  tokens: AuthTokens;
}

async function issueSessionTokens(user: IUser): Promise<AuthTokens> {
  const userId = user._id.toString();
  const accessToken = signAccessToken(userId, user.email);
  const { token: refreshToken, expiresAt } = signRefreshToken(userId);

  const now = new Date();
  const activeTokens = (user.refreshTokens ?? []).filter((entry) => entry.expiresAt > now);
  activeTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt,
    createdAt: now,
  });

  // Cap stored sessions per user to prevent unbounded document growth.
  user.refreshTokens = activeTokens.slice(-MAX_ACTIVE_REFRESH_TOKENS);
  await user.save();

  return { accessToken, refreshToken };
}

export async function signUp(input: {
  name?: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
  const { code, codeHash, expiresAt } = await createOtpChallenge();

  const user = await User.create({
    name: input.name?.trim(),
    email,
    passwordHash,
    authProvider: 'local',
    isEmailVerified: false,
    emailVerificationCodeHash: codeHash,
    emailVerificationExpiresAt: expiresAt,
    emailVerificationAttempts: 0,
  });

  const tokens = await issueSessionTokens(user);
  if (env.RESEND_API_KEY) {
    await sendEmailVerificationCodeEmail(user.email, code, user.name);
  } else {
    console.warn(`RESEND_API_KEY is not set; skipping verification OTP email for ${user.email}`);
  }

  return { user: user.toJSON(), tokens };
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokens');

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.deletedAt) {
    throw new AppError('This account has been deleted', 403);
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = await issueSessionTokens(user);
  return { user: user.toJSON(), tokens };
}

export async function oauthLogin(input: {
  provider: Exclude<AuthProvider, 'local'>;
  idToken: string;
  name?: string;
}): Promise<AuthResponse> {
  const profile = await verifyOAuthIdToken(input.provider, input.idToken);

  let user = await User.findOne({ email: profile.email }).select('+refreshTokens');
  if (user?.deletedAt) {
    throw new AppError('This account has been deleted', 403);
  }
  if (!user) {
    user = await User.create({
      name: input.name?.trim() || profile.name,
      email: profile.email,
      authProvider: profile.provider,
      providerId: profile.providerId,
      isEmailVerified: profile.emailVerified,
    });
    void sendWelcomeEmail(user.email, user.name);
  } else if (!user.providerId && user.authProvider === 'local') {
    user.providerId = profile.providerId;
    user.isEmailVerified = user.isEmailVerified || profile.emailVerified;
    if (!user.name && (input.name || profile.name)) {
      user.name = input.name?.trim() || profile.name;
    }
  }

  const tokens = await issueSessionTokens(user);
  return { user: user.toJSON(), tokens };
}

export async function refreshSession(refreshToken: string): Promise<AuthResponse> {
  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user || user.deletedAt) {
    throw new AppError('User not found', 401);
  }

  const now = new Date();
  const matchingIndex = user.refreshTokens.findIndex(
    (entry) => entry.tokenHash === tokenHash && entry.expiresAt > now
  );

  if (matchingIndex === -1) {
    throw new AppError('Refresh token has been revoked or expired', 401);
  }

  // Rotate: remove the used refresh token before issuing a new pair.
  user.refreshTokens.splice(matchingIndex, 1);
  const tokens = await issueSessionTokens(user);

  return { user: user.toJSON(), tokens };
}

export async function logout(userId: string, refreshToken?: string): Promise<void> {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
  } else {
    user.refreshTokens = [];
  }

  await user.save();
}

export async function sendEmailVerificationOtp(emailInput: string): Promise<void> {
  const email = emailInput.toLowerCase().trim();
  const user = await User.findOne({ email }).select(
    '+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts'
  );

  if (!user) {
    return;
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  const { code, codeHash, expiresAt } = await createOtpChallenge();
  user.emailVerificationCodeHash = codeHash;
  user.emailVerificationExpiresAt = expiresAt;
  user.emailVerificationAttempts = 0;
  await user.save();

  await sendEmailVerificationCodeEmail(user.email, code, user.name);
}

export async function verifyEmailOtp(input: {
  email: string;
  code: string;
}): Promise<{ user: ReturnType<IUser['toJSON']> }> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select(
    '+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts'
  );

  if (!user) {
    throw new AppError('Invalid or expired verification code', 400);
  }

  if (user.isEmailVerified) {
    return { user: user.toJSON() };
  }

  if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
    throw new AppError('Invalid or expired verification code', 400);
  }

  if (user.emailVerificationExpiresAt <= new Date()) {
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    user.emailVerificationAttempts = 0;
    await user.save();
    throw new AppError('Verification code has expired. Please request a new code.', 400);
  }

  if (user.emailVerificationAttempts >= MAX_OTP_ATTEMPTS) {
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    user.emailVerificationAttempts = 0;
    await user.save();
    throw new AppError('Too many failed attempts. Please request a new code.', 429);
  }

  const isMatch = await bcrypt.compare(input.code, user.emailVerificationCodeHash);
  if (!isMatch) {
    user.emailVerificationAttempts += 1;
    await user.save();
    throw new AppError('Invalid verification code', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.emailVerificationAttempts = 0;
  await user.save();

  void sendWelcomeEmail(user.email, user.name);
  return { user: user.toJSON() };
}

export async function forgotPassword(emailInput: string): Promise<void> {
  const email = emailInput.toLowerCase().trim();
  const user = await User.findOne({ email }).select(
    '+resetCodeHash +resetCodeExpiresAt +resetCodeAttempts'
  );

  // Return silently when the email is not found or deleted to prevent account enumeration.
  if (!user || user.deletedAt) {
    return;
  }

  const { code, codeHash, expiresAt } = await createOtpChallenge();
  user.resetCodeHash = codeHash;
  user.resetCodeExpiresAt = expiresAt;
  user.resetCodeAttempts = 0;
  await user.save();

  await sendPasswordResetCodeEmail(user.email, code, user.name);
}

export async function verifyResetCode(input: {
  email: string;
  code: string;
}): Promise<{ resetToken: string }> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select(
    '+resetCodeHash +resetCodeExpiresAt +resetCodeAttempts'
  );

  if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
    throw new AppError('Invalid or expired reset code', 400);
  }

  if (user.resetCodeExpiresAt <= new Date()) {
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    user.resetCodeAttempts = 0;
    await user.save();
    throw new AppError('Reset code has expired. Please request a new code.', 400);
  }

  if (user.resetCodeAttempts >= MAX_OTP_ATTEMPTS) {
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    user.resetCodeAttempts = 0;
    await user.save();
    throw new AppError('Too many failed attempts. Please request a new code.', 429);
  }

  const isMatch = await bcrypt.compare(input.code, user.resetCodeHash);
  if (!isMatch) {
    user.resetCodeAttempts += 1;
    await user.save();
    throw new AppError('Invalid reset code', 400);
  }

  user.resetCodeHash = undefined;
  user.resetCodeExpiresAt = undefined;
  user.resetCodeAttempts = 0;
  await user.save();

  const resetToken = signPasswordResetToken(user._id.toString(), user.email);
  return { resetToken };
}

export async function resetPassword(input: {
  resetToken: string;
  newPassword: string;
}): Promise<void> {
  const decoded = verifyPasswordResetToken(input.resetToken);
  const user = await User.findById(decoded.sub).select('+passwordHash +refreshTokens');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
  // Revoke all existing sessions after a password reset.
  user.refreshTokens = [];
  await user.save();
}

export async function changePassword(
  userId: string,
  input: {
    currentPassword: string;
    newPassword: string;
  }
): Promise<AuthTokens> {
  const user = await User.findById(userId).select('+passwordHash +refreshTokens');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.passwordHash) {
    throw new AppError(
      'This account uses social sign-in and does not have a password set',
      400
    );
  }

  const isCurrentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const isSameAsCurrent = await bcrypt.compare(input.newPassword, user.passwordHash);
  if (isSameAsCurrent) {
    throw new AppError('New password must be different from your current password', 400);
  }

  user.passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
  // Revoke all existing sessions and issue a fresh token pair for this device.
  user.refreshTokens = [];
  return issueSessionTokens(user);
}

export async function getCurrentUser(userId: string): Promise<ReturnType<IUser['toJSON']>> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user.toJSON();
}
