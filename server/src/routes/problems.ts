import { Router } from 'express';
import {
  getProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  getTestCases,
  addTestCase,
  updateTestCase,
  deleteTestCase,
  batchAddTestCases,
  runCode,
  generateTestCasesController,
  previewTestCases,
  generateAiAnalysisController,
  generateAiTestCasesController,
  generateAiGeneratorController,
  runGeneratorController,
  saveCodeDraftController,
  getCodeDraftController,
} from '../controllers/problemController';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { createProblemValidation } from '../middlewares/validator';

const router: Router = Router();

router.get('/', optionalAuth, getProblems);
router.post('/', authenticate, createProblemValidation, createProblem);
router.post('/preview-testcases', authenticate, previewTestCases);
router.post('/ai-testcases', authenticate, generateAiTestCasesController);
router.post('/ai-generator', authenticate, generateAiGeneratorController);
router.get('/:id', optionalAuth, getProblem);
router.get('/:id/draft', authenticate, getCodeDraftController);
router.post('/:id/draft', authenticate, saveCodeDraftController);
router.post('/:id/ai-analysis', authenticate, generateAiAnalysisController);
router.post('/:id/run-generator', authenticate, runGeneratorController);
router.put('/:id', authenticate, updateProblem);
router.delete('/:id', authenticate, deleteProblem);
router.get('/:id/testcases', authenticate, getTestCases);
router.post('/:id/testcases', authenticate, addTestCase);
router.post('/:id/testcases/batch', authenticate, batchAddTestCases);
router.put('/:id/testcases/:testCaseId', authenticate, updateTestCase);
router.delete('/:id/testcases/:testCaseId', authenticate, deleteTestCase);
router.post('/:id/run', authenticate, runCode);
router.post('/:id/generate-testcases', authenticate, generateTestCasesController);

export default router;
