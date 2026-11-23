import { deleteCloudinaryAvatar } from '../middlewares/upload.middleware.js';
import { User, type IUser } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

const ACCOUNT_DELETION_GRACE_DAYS = 30;

export async function getProfile(userId: string): Promise<ReturnType<IUser['toJSON']>> {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user.toJSON();
}

export async function updateProfile(
  userId: string,
  input: {
    name?: string;
    avatarUrl?: string;
    avatarPublicId?: string;
  }
): Promise<ReturnType<IUser['toJSON']>> {
  const user = await User.findOne({ _id: userId, deletedAt: null }).select('+avatarPublicId');
  if (!user) {
    if (input.avatarPublicId) {
      void deleteCloudinaryAvatar(input.avatarPublicId);
    }
    throw new AppError('User not found', 404);
  }

  let hasChanges = false;

  if (input.name !== undefined) {
    user.name = input.name.trim();
    hasChanges = true;
  }

  if (input.avatarUrl !== undefined) {
    const previousPublicId = user.avatarPublicId;
    user.avatarUrl = input.avatarUrl;
    user.avatarPublicId = input.avatarPublicId;
    void deleteCloudinaryAvatar(previousPublicId);
    hasChanges = true;
  }

  if (!hasChanges) {
    throw new AppError('Provide at least one field to update', 400);
  }

  await user.save();
  return user.toJSON();
}

export async function softDeleteAccount(
  userId: string
): Promise<{ deletedAt: Date; scheduledDeletionAt: Date }> {
  const user = await User.findOne({ _id: userId, deletedAt: null }).select(
    '+refreshTokens +emailVerificationCodeHash +emailVerificationExpiresAt +resetCodeHash +resetCodeExpiresAt'
  );
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const deletedAt = new Date();
  const scheduledDeletionAt = new Date(
    deletedAt.getTime() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000
  );

  user.deletedAt = deletedAt;
  user.scheduledDeletionAt = scheduledDeletionAt;
  user.refreshTokens = [];
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.resetCodeHash = undefined;
  user.resetCodeExpiresAt = undefined;

  await user.save();
  return { deletedAt, scheduledDeletionAt };
}
