import { Request, Response, NextFunction } from 'express';
import { authService, AuthenticationError } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates user credentials and returns safe user profile with signed JWT.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loginId, password } = req.body || {};

      // 1. Request Body Validation
      if (!loginId || typeof loginId !== 'string' || loginId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'loginId is required and must not be empty.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      if (loginId.trim().length > 100) {
        res.status(400).json({
          success: false,
          error: {
            message: 'loginId exceeds maximum length of 100 characters.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      if (!password || typeof password !== 'string' || password.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'password is required and must not be empty.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      if (password.length > 128) {
        res.status(400).json({
          success: false,
          error: {
            message: 'password exceeds maximum length of 128 characters.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      // Extract client metadata for audit tracking
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // 2. Perform Authentication via Service
      const result = await authService.login(
        loginId.trim(),
        password,
        clientIp,
        userAgent
      );

      // 3. Return sanitized response
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (err: unknown) {
      if (err instanceof AuthenticationError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            message: err.message,
            statusCode: err.statusCode,
            code: err.code,
          },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Retrieves the authenticated user's current profile from the database.
   */
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required.',
            statusCode: 401,
            code: 'AUTH_REQUIRED',
          },
        });
        return;
      }

      const user = await authService.getCurrentUser(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (err: unknown) {
      if (err instanceof AuthenticationError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            message: err.message,
            statusCode: err.statusCode,
            code: err.code,
          },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   * Stateless JWT logout endpoint.
   * Clients discard their local token; server confirms session termination.
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}

export const authController = new AuthController();
