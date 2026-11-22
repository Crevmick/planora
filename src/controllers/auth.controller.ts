import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as authService from '../services/auth.service.js';

export async function signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.signUp(req.body);
    res.status(201).json({
      message: 'Account created successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.oauthLogin(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refreshSession(req.body.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user) {
      await authService.logout(req.user.userId, req.body?.refreshToken);
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function sendVerificationOtp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authService.sendEmailVerificationOtp(req.body.email);
    res.status(200).json({
      message: 'If an unverified account exists for that email, a 4-digit verification code has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.verifyEmailOtp(req.body);
    res.status(200).json({
      message: 'Email verified successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({
      message: 'If an account exists for that email, a 4-digit reset code has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyResetCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.verifyResetCode(req.body);
    res.status(200).json({
      message: 'Reset code verified',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authService.resetPassword(req.body);
    res.status(200).json({
      message: 'Password has been reset successfully. Please sign in again.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
