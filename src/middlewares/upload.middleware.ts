import { v2 as cloudinary } from 'cloudinary';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function ensureCloudinaryConfigured(): void {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      500
    );
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_SIZE_BYTES,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400));
      return;
    }
    cb(null, true);
  },
});

/**
 * Parses an optional single `avatar` file from `multipart/form-data` into memory.
 */
export function uploadAvatarMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  upload.single('avatar')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('Avatar image must be 5 MB or smaller', 400));
        return;
      }
      next(new AppError(err.message, 400));
      return;
    }

    next(err);
  });
}

/**
 * Uploads an avatar buffer to Cloudinary under `planora/avatars`.
 */
export async function uploadAvatarToCloudinary(
  buffer: Buffer,
  userId: string
): Promise<{ url: string; publicId: string }> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'planora/avatars',
        public_id: `${userId}-${Date.now()}`,
        resource_type: 'image',
        transformation: [{ width: 512, height: 512, crop: 'limit' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError('Failed to upload avatar image', 502));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });
}

/**
 * Deletes a previously uploaded Cloudinary avatar by its `publicId`.
 */
export async function deleteCloudinaryAvatar(publicId?: string): Promise<void> {
  if (!publicId) {
    return;
  }

  try {
    ensureCloudinaryConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch {
    // Do not fail the request if old image cleanup fails.
  }
}
