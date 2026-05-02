import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { uploadImage } from '../controllers/uploadController';

const router: Router = Router();

router.post('/image', authenticate, uploadImage);

export default router;
