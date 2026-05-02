import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { HttpError } from '../middlewares/errorHandler';
import * as submissionService from '../services/submissionService';
import * as problemService from '../services/problemService';

export const submitCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { problem_id, language, code } = req.body;

    const problem = await problemService.findById(problem_id, userId);
    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    const submission = await submissionService.create({
      user_id: userId,
      problem_id,
      language,
      code,
    });

    res.status(201).json({
      success: true,
      message: 'Code submitted successfully',
      data: {
        id: submission.id,
        status: submission.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const problemId = req.query.problem_id as string;
    const userId = req.query.user_id as string;
    const status = req.query.status as string;

    const { submissions, total } = await submissionService.findAll({
      page,
      limit,
      problemId: problemId ? parseInt(problemId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
      status,
    });

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    const submission = await submissionService.findById(id);

    if (!submission) {
      throw new HttpError(404, 'Submission not found');
    }

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { submissions, total } = await submissionService.findByUserId(
      userId,
      page,
      limit
    );

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
