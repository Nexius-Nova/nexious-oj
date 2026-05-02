import { Request, Response, NextFunction } from 'express';
import * as categoryService from '../services/categoryService';

export const getTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await categoryService.getAllTags();
    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
};

export const getTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tag = await categoryService.getTagById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }
    res.json({
      success: true,
      data: tag,
    });
  } catch (error) {
    next(error);
  }
};

export const createTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tag = await categoryService.createTag(req.body);
    res.status(201).json({
      success: true,
      data: tag,
    });
  } catch (error) {
    next(error);
  }
};

export const getProblemTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problemId = parseInt(req.params.problemId, 10);
    const tags = await categoryService.getProblemTags(problemId);
    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
};

export const setProblemTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problemId = parseInt(req.params.problemId, 10);
    const { tagIds } = req.body;
    await categoryService.setProblemTags(problemId, tagIds || []);
    res.json({
      success: true,
      message: 'Tags updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
