import { Router } from 'express';
import { 
  getDashboardStats, 
  getUserStats, 
  getMyStats,
  getMyProblemProgress,
  getMySubmissionTrend,
  getMyLanguageDistribution
} from '../controllers/statsController';
import { authenticate } from '../middlewares/auth';

const router: Router = Router();

router.get('/dashboard', getDashboardStats);
router.get('/user/:userId', authenticate, getUserStats);
router.get('/me', authenticate, getMyStats);
router.get('/me/progress', authenticate, getMyProblemProgress);
router.get('/me/trend', authenticate, getMySubmissionTrend);
router.get('/me/languages', authenticate, getMyLanguageDistribution);

export default router;
