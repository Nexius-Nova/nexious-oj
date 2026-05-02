import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController';
import { registerValidation, loginValidation } from '../middlewares/validator';
import { authenticate } from '../middlewares/auth';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router: Router = Router();

router.post('/register', authRateLimiter, registerValidation, register);
router.post('/login', authRateLimiter, loginValidation, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
