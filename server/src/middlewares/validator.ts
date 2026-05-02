import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { HttpError } from './errorHandler';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg);
    throw new HttpError(400, messages.join(', '));
  }
  
  next();
};

export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate,
];

export const loginValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

export const createProblemValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('input_description').trim().notEmpty().withMessage('Input description is required'),
  body('output_description').trim().notEmpty().withMessage('Output description is required'),
  body('sample_input').trim().notEmpty().withMessage('Sample input is required'),
  body('sample_output').trim().notEmpty().withMessage('Sample output is required'),
  body('sample_cases').optional().isArray({ min: 1 }).withMessage('Sample cases must be a non-empty array'),
  body('sample_cases.*.input').optional().isString().withMessage('Sample case input must be a string'),
  body('sample_cases.*.output').optional().isString().withMessage('Sample case output must be a string'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('time_limit').isInt({ min: 100 }).withMessage('Time limit must be at least 100ms'),
  body('memory_limit').isInt({ min: 1 }).withMessage('Memory limit must be at least 1MB'),
  body('test_cases')
    .isArray({ min: 1 })
    .withMessage('At least one real test case is required'),
  body('test_cases.*.input')
    .optional()
    .isString()
    .withMessage('Test case input must be a string'),
  body('test_cases.*.expected_output')
    .optional()
    .isString()
    .withMessage('Test case expected output must be a string'),
  validate,
];

export const submitCodeValidation = [
  body('problem_id').isInt().withMessage('Problem ID is required'),
  body('language')
    .isIn(['c', 'cpp', 'java', 'python', 'javascript', 'go', 'rust'])
    .withMessage('Invalid programming language'),
  body('code').trim().notEmpty().withMessage('Code is required'),
  validate,
];
