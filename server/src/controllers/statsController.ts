import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as statsService from '../services/statsService';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await statsService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const stats = await statsService.getUserStats(userId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const stats = await statsService.getUserStats(userId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProblemProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const progress = await statsService.getUserProblemProgress(userId);
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySubmissionTrend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const days = parseInt(req.query.days as string, 10) || 30;
    const trend = await statsService.getUserSubmissionTrend(userId, days);
    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyLanguageDistribution = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const distribution = await statsService.getUserLanguageDistribution(userId);
    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    next(error);
  }
};
