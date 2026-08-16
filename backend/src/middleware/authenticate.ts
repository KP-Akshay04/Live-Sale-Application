import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyJwtToken } from '../utils/security.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

/**
 * Authentication Middleware:
 * Inspects incoming Authorization: Bearer <JWT> header, verifies token, and attaches user context.
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. Missing Authorization header.',
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      },
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid Authorization header format. Expected Bearer <token>',
        statusCode: 401,
        code: 'INVALID_AUTH_HEADER',
      },
    });
    return;
  }

  const token = parts[1];
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication token missing.',
        statusCode: 401,
        code: 'TOKEN_MISSING',
      },
    });
    return;
  }

  try {
    const payload = verifyJwtToken(token);
    req.user = payload;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication session expired. Please log in again.',
          statusCode: 401,
          code: 'TOKEN_EXPIRED',
        },
      });
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authentication token.',
          statusCode: 401,
          code: 'INVALID_TOKEN',
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed.',
        statusCode: 401,
        code: 'AUTH_FAILED',
      },
    });
  }
}
