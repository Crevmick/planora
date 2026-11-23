import { body, param, query, type ValidationChain } from 'express-validator';

export const createTaskValidator: ValidationChain[] = [
  body('title')
    .isString()
    .withMessage('Task title must be a string')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  body('projectId')
    .optional({ values: 'null' })
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('dueDate')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('dueTime')
    .optional({ values: 'null' })
    .isString()
    .withMessage('dueTime must be a string')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('dueTime must be between 1 and 20 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
];

export const updateTaskValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('title')
    .optional()
    .isString()
    .withMessage('Task title must be a string')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  body('projectId')
    .optional({ values: 'null' })
    .custom((value) => value === null || /^[0-9a-fA-F]{24}$/.test(String(value)))
    .withMessage('Invalid project ID'),
  body('dueDate')
    .optional({ values: 'null' })
    .custom((value) => value === null || !Number.isNaN(Date.parse(String(value))))
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('dueTime')
    .optional({ values: 'null' })
    .custom((value) => {
      if (value === null) return true;
      return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 20;
    })
    .withMessage('dueTime must be a string between 1 and 20 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean'),
];

export const taskIdValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid task ID'),
];

export const listTasksValidator: ValidationChain[] = [
  query('projectId').optional().isMongoId().withMessage('Invalid project ID'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  query('isCompleted')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isCompleted must be true or false'),
  query('due')
    .optional()
    .isIn(['today', 'tomorrow', 'upcoming'])
    .withMessage('due must be today, tomorrow, or upcoming'),
  query('sort')
    .optional()
    .isIn(['default', 'priority'])
    .withMessage('sort must be default or priority'),
];
