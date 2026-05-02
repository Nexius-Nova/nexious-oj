import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { HttpError } from '../middlewares/errorHandler';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadImage = async (
  req: AuthRequest,
  res: Response,
  next: Function
) => {
  try {
    if (!req.body.image) {
      throw new HttpError(400, 'No image data provided');
    }

    const base64Data = req.body.image;
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new HttpError(400, 'Invalid image format');
    }

    const mimeType = matches[1];
    const base64String = matches[2];
    const buffer = Buffer.from(base64String, 'base64');

    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw new HttpError(400, 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP');
    }

    if (buffer.length > MAX_SIZE) {
      throw new HttpError(400, 'Image too large. Max size: 5MB');
    }

    const ext = mimeType.split('/')[1];
    const filename = `${uuidv4()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.API_BASE_URL || `${protocol}://${host}`;
    const imageUrl = `${baseUrl}/uploads/images/${filename}`;

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename,
        size: buffer.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
