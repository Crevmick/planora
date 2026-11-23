import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadAvatarMiddleware } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateProfileValidator } from '../validators/profile.validator.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/profile:
 *   get:
 *     tags:
 *       - 6. Profile
 *     summary: Get current user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile (`name`, `email`, `avatarUrl`, `createdAt`)
 *       401:
 *         description: Unauthorized
 */
router.get('/', profileController.getProfile);

/**
 * @openapi
 * /api/profile:
 *   patch:
 *     tags:
 *       - 6. Profile
 *     summary: Update display name and/or avatar photo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Adaeze
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: JPEG, PNG, or WebP image (max 5 MB)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation failed or invalid image
 */
router.patch(
  '/',
  uploadAvatarMiddleware,
  validate(updateProfileValidator),
  profileController.updateProfile
);

/**
 * @openapi
 * /api/profile:
 *   delete:
 *     tags:
 *       - 6. Profile
 *     summary: Soft-delete the current user's account
 *     description: Marks the account as deleted (`deletedAt`), schedules permanent removal in 30 days (`scheduledDeletionAt`), and revokes all active sessions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account scheduled for deletion
 *       401:
 *         description: Unauthorized
 */
router.delete('/', profileController.deleteAccount);

export default router;
