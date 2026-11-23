import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { uploadAvatarToCloudinary } from '../middlewares/upload.middleware.js';
import * as profileService from '../services/profile.service.js';

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await profileService.getProfile(req.user!.userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let avatarUrl: string | undefined;
    let avatarPublicId: string | undefined;

    if (req.file) {
      const uploaded = await uploadAvatarToCloudinary(req.file.buffer, req.user!.userId);
      avatarUrl = uploaded.url;
      avatarPublicId = uploaded.publicId;
    }

    const user = await profileService.updateProfile(req.user!.userId, {
      name: req.body.name,
      avatarUrl,
      avatarPublicId,
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await profileService.softDeleteAccount(req.user!.userId);
    res.status(200).json({
      message: 'Account scheduled for deletion',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
