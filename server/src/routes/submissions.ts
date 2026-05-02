import { Router } from 'express';
import {
  submitCode,
  getSubmissions,
  getSubmission,
  getUserSubmissions,
} from '../controllers/submissionController';
import { authenticate } from '../middlewares/auth';
import { submitCodeValidation } from '../middlewares/validator';
import { submissionRateLimiter } from '../middlewares/rateLimiter';

const router: Router = Router();

router.post('/', authenticate, submissionRateLimiter, submitCodeValidation, submitCode);
router.get('/', authenticate, getSubmissions);
router.get('/user/:userId', authenticate, getUserSubmissions);
router.get('/:id', authenticate, getSubmission);

export default router;
