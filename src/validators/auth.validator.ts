import { body, type ValidationChain } from 'express-validator';

function strongPasswordRule(field: string): ValidationChain {
  return body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number');
}

export const signUpValidator: ValidationChain[] = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  strongPasswordRule('password'),
  body('confirmPassword')
    .isString()
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

export const loginValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required'),
];

export const oauthValidator: ValidationChain[] = [
  body('provider')
    .isIn(['google', 'apple'])
    .withMessage('Provider must be google or apple'),
  body('idToken')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('idToken is required'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

export const refreshValidator: ValidationChain[] = [
  body('refreshToken')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('refreshToken is required'),
];

export const logoutValidator: ValidationChain[] = [
  body('refreshToken')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('refreshToken cannot be empty'),
];

export const forgotPasswordValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
];

export const verifyResetCodeValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('code')
    .trim()
    .matches(/^\d{4}$/)
    .withMessage('Reset code must be a 4-digit number'),
];

export const resetPasswordValidator: ValidationChain[] = [
  body('resetToken')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('resetToken is required'),
  strongPasswordRule('newPassword'),
  body('confirmPassword')
    .isString()
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

export const changePasswordValidator: ValidationChain[] = [
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required'),
  strongPasswordRule('newPassword'),
  body('confirmPassword')
    .isString()
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

export const sendEmailOtpValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
];

export const verifyEmailOtpValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('code')
    .trim()
    .matches(/^\d{4}$/)
    .withMessage('Verification code must be a 4-digit number'),
];
