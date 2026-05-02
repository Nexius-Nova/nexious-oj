import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { HttpError } from '../middlewares/errorHandler';
import * as discussionService from '../services/discussionService';

export const getDiscussions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const problemId = req.query.problem_id as string;
    const type = req.query.type as string;

    const { discussions, total } = await discussionService.findAll({
      page,
      limit,
      problemId: problemId ? parseInt(problemId) : undefined,
      type,
    });

    res.json({
      success: true,
      data: discussions,
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

export const getDiscussion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    const discussion = await discussionService.findById(id);

    if (!discussion) {
      throw new HttpError(404, 'Discussion not found');
    }

    res.json({
      success: true,
      data: discussion,
    });
  } catch (error) {
    next(error);
  }
};

export const createDiscussion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const discussionData = { ...req.body, user_id: userId };
    const discussion = await discussionService.create(discussionData);

    res.status(201).json({
      success: true,
      message: 'Discussion created successfully',
      data: discussion,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDiscussion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.userId;
    const discussion = await discussionService.update(id, userId, req.body);

    if (!discussion) {
      throw new HttpError(404, 'Discussion not found');
    }

    res.json({
      success: true,
      message: 'Discussion updated successfully',
      data: discussion,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDiscussion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.userId;
    await discussionService.remove(id, userId);

    res.json({
      success: true,
      message: 'Discussion deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const likeDiscussion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    await discussionService.like(id);

    res.json({
      success: true,
      message: 'Discussion liked',
    });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const discussionId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const { content, parent_id } = req.body;

    const comment = await discussionService.addComment({
      discussion_id: discussionId,
      user_id: userId,
      content,
      parent_id,
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};
