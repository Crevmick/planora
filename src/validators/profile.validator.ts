import { body, type ValidationChain } from 'express-validator';

export const updateProfileValidator: ValidationChain[] = [
  body('name')
    .optional()
    .isString()
    .withMessage('Display name must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
];
