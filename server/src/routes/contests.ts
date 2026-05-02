import { Router } from 'express';
import {
  getContests,
  getContest,
  createContest,
  updateContest,
  deleteContest,
  joinContest,
  getLeaderboard,
  addProblem,
  removeProblem,
  updateProblemOrder,
  startContest,
  getContestSession,
  saveAnswer,
  submitAnswer,
  finishContest,
  getContestResults,
  joinByInvite,
  getContestByInvite,
  getParticipants,
  getParticipantSession,
  getStatistics,
} from '../controllers/contestController';
import { authenticate, optionalAuth } from '../middlewares/auth';

const router: Router = Router();

router.get('/', optionalAuth, getContests);
router.get('/invite/:inviteCode', getContestByInvite);
router.post('/invite/:inviteCode/join', authenticate, joinByInvite);
router.get('/:id', getContest);
router.post('/', authenticate, createContest);
router.put('/:id', authenticate, updateContest);
router.delete('/:id', authenticate, deleteContest);
router.post('/:id/join', authenticate, joinContest);
router.get('/:id/leaderboard', getLeaderboard);
router.get('/:id/statistics', authenticate, getStatistics);
router.get('/:id/participants', authenticate, getParticipants);
router.get('/:id/participants/:participantId/session', authenticate, getParticipantSession);
router.post('/:id/problems', authenticate, addProblem);
router.delete('/:id/problems/:problemId', authenticate, removeProblem);
router.put('/:id/problems/:problemId/order', authenticate, updateProblemOrder);

router.post('/:id/start', authenticate, startContest);
router.get('/:id/session', authenticate, getContestSession);
router.post('/:id/save', authenticate, saveAnswer);
router.post('/:id/submit', authenticate, submitAnswer);
router.post('/:id/finish', authenticate, finishContest);
router.get('/:id/results', authenticate, getContestResults);

export default router;
