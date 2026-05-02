import { Router } from 'express';
import {
  getTags,
  getTag,
  createTag,
  getProblemTags,
  setProblemTags,
} from '../controllers/categoryController';
import { authenticate } from '../middlewares/auth';

const router: Router = Router();

router.get('/tags', getTags);
router.get('/tags/:id', getTag);
router.post('/tags', authenticate, createTag);

router.get('/problems/:problemId/tags', getProblemTags);
router.put('/problems/:problemId/tags', authenticate, setProblemTags);

export default router;
