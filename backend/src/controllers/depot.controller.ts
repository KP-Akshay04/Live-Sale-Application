import { Response, NextFunction } from 'express';
import { depotService, DepotServiceError } from '../services/depot.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { DepotFilterQuery } from '../types/depot.types.js';

export class DepotController {
  /**
   * GET /api/depots
   * Retrieves all depots matching query filters.
   */
  async getDepots(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: DepotFilterQuery = {};

      if (typeof req.query.search === 'string' && req.query.search.trim()) {
        filters.search = req.query.search.trim();
      }

      if (req.query.isActive !== undefined && req.query.isActive !== '') {
        const activeStr = String(req.query.isActive).toLowerCase();
        if (activeStr === 'true') {
          filters.isActive = true;
        } else if (activeStr === 'false') {
          filters.isActive = false;
        }
      }

      if (typeof req.query.city === 'string' && req.query.city.trim()) {
        filters.city = req.query.city.trim();
      }

      const depots = await depotService.getDepots(filters);

      res.status(200).json({
        success: true,
        data: depots,
        count: depots.length,
      });
    } catch (err: unknown) {
      if (err instanceof DepotServiceError) {
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
   * GET /api/depots/:id
   * Retrieves a single depot by numeric ID or code or site name.
   */
  async getDepotById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Depot ID is required in URL path.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const depot = await depotService.getDepotById(id);

      res.status(200).json({
        success: true,
        data: depot,
      });
    } catch (err: unknown) {
      if (err instanceof DepotServiceError) {
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
   * POST /api/depots
   * Creates a new Depot record in MySQL.
   */
  async createDepot(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const userAgent = req.headers?.['user-agent'];

      const depot = await depotService.createDepot(
        req.body,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Depot registered successfully',
        data: depot,
      });
    } catch (err: unknown) {
      if (err instanceof DepotServiceError) {
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
   * PUT /api/depots/:id
   * Updates an existing Depot record in MySQL.
   */
  async updateDepot(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Depot ID must be a valid integer.',
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

      const depot = await depotService.updateDepot(
        numericId,
        req.body,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Depot updated successfully',
        data: depot,
      });
    } catch (err: unknown) {
      if (err instanceof DepotServiceError) {
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
   * PATCH /api/depots/:id/status
   * Activates or deactivates a Depot record.
   */
  async updateDepotStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Depot ID must be a valid integer.',
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

      const depot = await depotService.updateDepotStatus(
        numericId,
        isActive,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: isActive ? 'Depot activated successfully' : 'Depot deactivated successfully',
        data: depot,
      });
    } catch (err: unknown) {
      if (err instanceof DepotServiceError) {
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

export const depotController = new DepotController();
