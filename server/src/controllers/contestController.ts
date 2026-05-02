import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { HttpError } from '../middlewares/errorHandler';
import * as contestService from '../services/contestService';

export const getContests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const userId = (req as AuthRequest).user?.userId;

    const { contests, total } = await contestService.findAll({
      page,
      limit,
      status,
      userId,
    });

    res.json({
      success: true,
      data: contests,
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

export const getContest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    const contest = await contestService.findById(id);

    if (!contest) {
      throw new HttpError(404, 'Contest not found');
    }

    res.json({
      success: true,
      data: contest,
    });
  } catch (error) {
    next(error);
  }
};

export const createContest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const contestData = { ...req.body, creator_id: userId };
    const contest = await contestService.create(contestData);

    res.status(201).json({
      success: true,
      message: 'Contest created successfully',
      data: contest,
    });
  } catch (error) {
    next(error);
  }
};

export const updateContest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.userId;

    const existingContest = await contestService.findById(id);
    if (!existingContest) {
      throw new HttpError(404, '比赛不存在');
    }

    if (existingContest.creator_id !== userId) {
      throw new HttpError(403, '只有比赛创建者才能编辑比赛');
    }

    const contest = await contestService.update(id, req.body);

    res.json({
      success: true,
      message: 'Contest updated successfully',
      data: contest,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.userId;

    const existingContest = await contestService.findById(id);
    if (!existingContest) {
      throw new HttpError(404, '比赛不存在');
    }

    if (existingContest.creator_id !== userId) {
      throw new HttpError(403, '只有比赛创建者才能删除比赛');
    }

    await contestService.remove(id);

    res.json({
      success: true,
      message: 'Contest deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const joinContest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const password = req.body.password;

    await contestService.join(contestId, userId, password);

    res.json({
      success: true,
      message: 'Joined contest successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const leaderboard = await contestService.getLeaderboard(contestId);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

export const addProblem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const { problemId, order } = req.body;

    await contestService.addProblem(contestId, problemId, order);

    res.json({
      success: true,
      message: 'Problem added to contest successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const removeProblem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const problemId = parseInt(req.params.problemId);

    await contestService.removeProblem(contestId, problemId);

    res.json({
      success: true,
      message: 'Problem removed from contest successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateProblemOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const problemId = parseInt(req.params.problemId);
    const { order } = req.body;

    await contestService.updateProblemOrder(contestId, problemId, order);

    res.json({
      success: true,
      message: 'Problem order updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const startContest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const session = await contestService.startContestSession(contestId, userId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const getStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const statistics = await contestService.getContestStatistics(contestId, userId);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};

export const getContestSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const session = await contestService.getSessionWithAnswers(contestId, userId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const saveAnswer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const { problemId, code, language } = req.body;

    const session = await contestService.saveContestAnswer(
      contestId,
      userId,
      problemId,
      code,
      language
    );

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const submitAnswer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const { problemId, code, language } = req.body;

    const result = await contestService.submitContestAnswer(
      contestId,
      userId,
      problemId,
      code,
      language
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const finishContest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const session = await contestService.finishContest(contestId, userId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const getContestResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const results = await contestService.getContestResults(contestId, userId);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const joinByInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user!.userId;

    const result = await contestService.joinByInviteCode(inviteCode, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getContestByInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { inviteCode } = req.params;

    const contest = await contestService.findByInviteCode(inviteCode);

    if (!contest) {
      throw new HttpError(404, '邀请链接无效或已过期');
    }

    res.json({
      success: true,
      data: contest,
    });
  } catch (error) {
    next(error);
  }
};

export const getParticipants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const participants = await contestService.getParticipants(contestId, userId);

    res.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    next(error);
  }
};

export const getParticipantSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const contestId = parseInt(req.params.id);
    const participantId = parseInt(req.params.participantId);
    const userId = req.user!.userId;

    const session = await contestService.getParticipantSession(contestId, participantId, userId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};
