import { body, param, type ValidationChain } from 'express-validator';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const createProjectValidator: ValidationChain[] = [
  body('name')
    .isString()
    .withMessage('Project name must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('color')
    .isString()
    .withMessage('Color must be a string')
    .trim()
    .matches(HEX_COLOR_REGEX)
    .withMessage('Color must be a valid hex code (e.g. #156E30)'),
];

export const updateProjectValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid project ID'),
  body('name')
    .optional()
    .isString()
    .withMessage('Project name must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .isString()
    .withMessage('Color must be a string')
    .trim()
    .matches(HEX_COLOR_REGEX)
    .withMessage('Color must be a valid hex code (e.g. #156E30)'),
];

export const projectIdValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid project ID'),
];
