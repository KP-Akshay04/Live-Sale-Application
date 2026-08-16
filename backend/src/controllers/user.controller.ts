import { Response, NextFunction } from 'express';
import { userService, UserServiceError } from '../services/user.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { UserFilterQuery } from '../types/user.types.js';

export class UserController {
  /**
   * GET /api/users
   * Retrieves all users matching query filters.
   */
  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: UserFilterQuery = {};

      if (typeof req.query.search === 'string' && req.query.search.trim()) {
        filters.search = req.query.search.trim();
      }

      if (typeof req.query.role === 'string' && req.query.role.trim()) {
        filters.role = req.query.role.trim();
      }

      if (req.query.depotId !== undefined && req.query.depotId !== '') {
        const depotNum = Number(req.query.depotId);
        if (!isNaN(depotNum)) {
          filters.depotId = depotNum;
        }
      }

      if (req.query.isActive !== undefined && req.query.isActive !== '') {
        const activeStr = String(req.query.isActive).toLowerCase();
        if (activeStr === 'true') {
          filters.isActive = true;
        } else if (activeStr === 'false') {
          filters.isActive = false;
        }
      }

      const users = await userService.getUsers(filters);

      res.status(200).json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (err: unknown) {
      if (err instanceof UserServiceError) {
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
   * GET /api/users/:id
   * Retrieves a single user by database ID or employeeId.
   */
  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID is required in URL path.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const user = await userService.getUserById(id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err: unknown) {
      if (err instanceof UserServiceError) {
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
   * POST /api/users
   * Creates a new user record in the MySQL database.
   */
  async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const userAgent = req.headers?.['user-agent'];

      const user = await userService.createUser(
        req.body,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (err: unknown) {
      if (err instanceof UserServiceError) {
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
   * PUT /api/users/:id
   * Updates an existing user's information.
   */
  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID must be a valid integer.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const userAgent = req.headers?.['user-agent'];

      const user = await userService.updateUser(
        numericId,
        req.body,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (err: unknown) {
      if (err instanceof UserServiceError) {
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
   * PATCH /api/users/:id/status
   * Activates or deactivates an account.
   */
  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID must be a valid integer.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const { isActive } = req.body || {};
      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            message: "Field 'isActive' must be a boolean (true or false).",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const userAgent = req.headers?.['user-agent'];

      const user = await userService.updateUserStatus(
        numericId,
        isActive,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: isActive ? 'User activated successfully' : 'User deactivated successfully',
        data: user,
      });
    } catch (err: unknown) {
      if (err instanceof UserServiceError) {
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
}

export const userController = new UserController();
