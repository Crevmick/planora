import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authRateLimiter, otpRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  changePasswordValidator,
  forgotPasswordValidator,
  loginValidator,
  logoutValidator,
  oauthValidator,
  refreshValidator,
  resetPasswordValidator,
  sendEmailOtpValidator,
  signUpValidator,
  verifyEmailOtpValidator,
  verifyResetCodeValidator,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags:
 *       - 1. Sign Up & Email Verification
 *     summary: 1. Sign up (creates account and sends 4-digit OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, confirmPassword]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Adaeze
 *               lastName:
 *                 type: string
 *                 example: Okafor
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@gmail.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               confirmPassword:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Email already registered
 */
router.post('/signup', authRateLimiter, validate(signUpValidator), authController.signUp);

/**
 * @openapi
 * /api/auth/send-verification-otp:
 *   post:
 *     tags:
 *       - 1. Sign Up & Email Verification
 *     summary: 2. Send or resend 4-digit email verification OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@gmail.com
 *     responses:
 *       200:
 *         description: Verification OTP sent
 *       400:
 *         description: Email already verified or invalid
 */
router.post(
  '/send-verification-otp',
  otpRateLimiter,
  validate(sendEmailOtpValidator),
  authController.sendVerificationOtp
);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags:
 *       - 1. Sign Up & Email Verification
 *     summary: 3. Verify email with 4-digit OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@gmail.com
 *               code:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  '/verify-email',
  otpRateLimiter,
  validate(verifyEmailOtpValidator),
  authController.verifyEmail
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - 2. Sign In & Session
 *     summary: Sign in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@gmail.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Signed in
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, validate(loginValidator), authController.login);

/**
 * @openapi
 * /api/auth/oauth:
 *   post:
 *     tags:
 *       - 2. Sign In & Session
 *     summary: Continue with Google or Apple
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, idToken]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple]
 *               idToken:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: OAuth sign-in successful
 *       401:
 *         description: Invalid or expired OAuth ID token
 */
router.post('/oauth', authRateLimiter, validate(oauthValidator), authController.oauthLogin);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - 2. Sign In & Session
 *     summary: Refresh access token (also used for biometric sign-in)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or revoked refresh token
 */
router.post('/refresh', authRateLimiter, validate(refreshValidator), authController.refresh);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - 2. Sign In & Session
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', requireAuth, authController.getMe);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - 2. Sign In & Session
 *     summary: Log out and revoke refresh token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', requireAuth, validate(logoutValidator), authController.logout);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - 3. Password Reset
 *     summary: 1. Send 4-digit password reset code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@gmail.com
 *     responses:
 *       200:
 *         description: Reset code sent if account exists
 */
router.post(
  '/forgot-password',
  otpRateLimiter,
  validate(forgotPasswordValidator),
  authController.forgotPassword
);

/**
 * @openapi
 * /api/auth/verify-reset-code:
 *   post:
 *     tags:
 *       - 3. Password Reset
 *     summary: 2. Verify 4-digit reset code and get resetToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@gmail.com
 *               code:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Reset code verified
 *       400:
 *         description: Invalid or expired reset code
 */
router.post(
  '/verify-reset-code',
  otpRateLimiter,
  validate(verifyResetCodeValidator),
  authController.verifyResetCode
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - 3. Password Reset
 *     summary: 3. Set new password using resetToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword, confirmPassword]
 *             properties:
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123
 *               confirmPassword:
 *                 type: string
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       401:
 *         description: Invalid or expired resetToken
 */
router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordValidator),
  authController.resetPassword
);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - 3. Password Reset
 *     summary: Change password for authenticated user
 *     description: Verifies current password, prevents password reuse, revokes all prior refresh tokens, and returns a fresh token pair.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123
 *               confirmPassword:
 *                 type: string
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password updated successfully (returns fresh tokens)
 *       400:
 *         description: Validation failed, social-only account, or password reused
 *       401:
 *         description: Unauthorized or incorrect current password
 */
router.post(
  '/change-password',
  requireAuth,
  authRateLimiter,
  validate(changePasswordValidator),
  authController.changePassword
);

export default router;
