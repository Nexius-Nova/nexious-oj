import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import * as userService from '../services/userService';

const jwtSecret: Secret = config.jwt.secret;
const jwtOptions: SignOptions = {
  expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await userService.findByEmailOrUsername(email, username);
    if (existingUser) {
      throw new HttpError(400, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);
    
    const user = await userService.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      jwtOptions
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          has_ai_api_key: Boolean(user.ai_api_key),
          ai_base_url: user.ai_base_url,
          ai_model: user.ai_model,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await userService.findByEmail(email);
    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      jwtOptions
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          has_ai_api_key: Boolean(user.ai_api_key),
          ai_base_url: user.ai_base_url,
          ai_model: user.ai_model,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const user = await userService.findById(userId);

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        rating: user.rating,
        rank: user.rank,
        role: user.role,
        has_ai_api_key: Boolean(user.ai_api_key),
        ai_base_url: user.ai_base_url,
        ai_model: user.ai_model,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { avatar, bio, ai_api_key, ai_base_url, ai_model } = req.body;

    const user = await userService.update(userId, {
      avatar,
      bio,
      ai_api_key: ai_api_key === '' ? null : ai_api_key,
      ai_base_url: ai_base_url === '' ? null : ai_base_url,
      ai_model: ai_model === '' ? null : ai_model,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        rating: user.rating,
        rank: user.rank,
        role: user.role,
        has_ai_api_key: Boolean(user.ai_api_key),
        ai_base_url: user.ai_base_url,
        ai_model: user.ai_model,
      },
    });
  } catch (error) {
    next(error);
  }
};
