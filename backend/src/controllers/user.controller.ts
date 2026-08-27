import { Response, NextFunction } from 'express';
import { userService, UserServiceError } from '../services/user.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { UserFilterQuery } from '../types/user.types.js';

function normalizeRole(role: string | undefined): string {
  return String(role || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function isSuperAdmin(req: AuthenticatedRequest): boolean {
  return normalizeRole(req.user?.role) === 'superadmin';
}

function isDepotScopedRole(req: AuthenticatedRequest): boolean {
  const role = normalizeRole(req.user?.role);

  return (
    role === 'depotperson' ||
    role === 'salesofficer'
  );
}

function getAuthenticatedDepotId(
  req: AuthenticatedRequest
): number | null {
  const depotId = req.user?.depotId;

  if (depotId === null || depotId === undefined) {
    return null;
  }

  const numericDepotId = Number(depotId);

  return Number.isInteger(numericDepotId) && numericDepotId > 0
    ? numericDepotId
    : null;
}

export class UserController {
  /**
   * GET /api/users
   *
   * Super Admin:
   *   Can view all users and optionally filter by depot.
   *
   * Depot Person / Sales Officer:
   *   Can only view users belonging to their own depot.
   *
   * The depot restriction is enforced here on the server.
   */
  async getUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters: UserFilterQuery = {};

      if (
        typeof req.query.search === 'string' &&
        req.query.search.trim()
      ) {
        filters.search = req.query.search.trim();
      }

      if (
        typeof req.query.role === 'string' &&
        req.query.role.trim()
      ) {
        filters.role = req.query.role.trim();
      }

      if (
        req.query.depotId !== undefined &&
        req.query.depotId !== ''
      ) {
        const requestedDepotId = Number(req.query.depotId);

        if (
          !Number.isInteger(requestedDepotId) ||
          requestedDepotId <= 0
        ) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Depot ID must be a valid positive integer.',
              statusCode: 400,
              code: 'INVALID_DEPOT_ID',
            },
          });
          return;
        }

        filters.depotId = requestedDepotId;
      }

      if (
        req.query.isActive !== undefined &&
        req.query.isActive !== ''
      ) {
        const activeStr = String(req.query.isActive).toLowerCase();

        if (activeStr === 'true') {
          filters.isActive = true;
        } else if (activeStr === 'false') {
          filters.isActive = false;
        } else {
          res.status(400).json({
            success: false,
            error: {
              message: "Query parameter 'isActive' must be true or false.",
              statusCode: 400,
              code: 'INVALID_ACTIVE_FILTER',
            },
          });
          return;
        }
      }

      /**
       * IMPORTANT:
       * Depot-scoped users cannot choose their own depot filter.
       * Their authenticated depot is always authoritative.
       */
      if (isDepotScopedRole(req)) {
        const authenticatedDepotId = getAuthenticatedDepotId(req);

        if (authenticatedDepotId === null) {
          res.status(403).json({
            success: false,
            error: {
              message:
                'Your account is not assigned to a valid depot.',
              statusCode: 403,
              code: 'DEPOT_ASSIGNMENT_REQUIRED',
            },
          });
          return;
        }

        filters.depotId = authenticatedDepotId;
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
   *
   * Super Admin:
   *   Can retrieve any user.
   *
   * Depot Person / Sales Officer:
   *   Can retrieve only users belonging to their own depot.
   */
  async getUserById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id?.trim()) {
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

      /**
       * Never allow a depot-scoped user to retrieve
       * another depot's user by directly changing the URL.
       */
      if (isDepotScopedRole(req)) {
        const authenticatedDepotId = getAuthenticatedDepotId(req);

        if (authenticatedDepotId === null) {
          res.status(403).json({
            success: false,
            error: {
              message:
                'Your account is not assigned to a valid depot.',
              statusCode: 403,
              code: 'DEPOT_ASSIGNMENT_REQUIRED',
            },
          });
          return;
        }

        if (user.depotId !== authenticatedDepotId) {
          res.status(403).json({
            success: false,
            error: {
              message:
                'You are not authorized to access users outside your assigned depot.',
              statusCode: 403,
              code: 'DEPOT_SCOPE_FORBIDDEN',
            },
          });
          return;
        }
      }

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
   *
   * Only Super Admin is allowed to create users.
   */
  async createUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)
          ?.split(',')[0]
          ?.trim() ||
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
   *
   * Only Super Admin is allowed to modify user records.
   */
  async updateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = Number(id);

      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID must be a valid positive integer.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)
          ?.split(',')[0]
          ?.trim() ||
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
   *
   * Only Super Admin is allowed to activate/deactivate accounts.
   */
  async updateUserStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = Number(id);

      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID must be a valid positive integer.',
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
            message:
              "Field 'isActive' must be a boolean (true or false).",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)
          ?.split(',')[0]
          ?.trim() ||
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
        message: isActive
          ? 'User activated successfully'
          : 'User deactivated successfully',
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