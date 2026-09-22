import '../config/env.js';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await queryOne<{
      id: string;
      email: string;
      username: string;
    }>(
      'SELECT id, email, username FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error?.name === 'JsonWebTokenError' ||
      error?.name === 'TokenExpiredError' ||
      error?.name === 'NotBeforeError'
    ) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(error);
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
