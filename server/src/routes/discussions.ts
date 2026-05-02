import { Router } from 'express';
import {
  getDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  likeDiscussion,
  addComment,
} from '../controllers/discussionController';
import { authenticate } from '../middlewares/auth';

const router: Router = Router();

router.get('/', getDiscussions);
router.get('/:id', getDiscussion);
router.post('/', authenticate, createDiscussion);
router.put('/:id', authenticate, updateDiscussion);
router.delete('/:id', authenticate, deleteDiscussion);
router.post('/:id/like', authenticate, likeDiscussion);
router.post('/:id/comments', authenticate, addComment);

export default router;
