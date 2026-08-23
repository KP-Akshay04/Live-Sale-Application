import { Request, Response, NextFunction } from 'express';
import { lineSaleService, LineSaleServiceError } from '../services/lineSale.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class LineSaleController {
  /**
   * GET /api/line-sales
   */
  async getLineSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, partyCode, accountName, salesOfficerId, depotId, isActive, routeName } = req.query;

      const filters: any = {};
      if (typeof search === 'string') filters.search = search;
      if (typeof partyCode === 'string') filters.partyCode = partyCode;
      if (typeof accountName === 'string') filters.accountName = accountName;
      if (typeof routeName === 'string') filters.routeName = routeName;
      if (typeof salesOfficerId === 'string') filters.salesOfficerId = salesOfficerId;
      if (typeof depotId === 'string') filters.depotId = depotId;
      if (isActive !== undefined) {
        filters.isActive = String(isActive) === 'true';
      }

      const results = await lineSaleService.getLineSales(filters);
      res.status(200).json({
        success: true,
        data: results,
        count: results.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/line-sales/:id
   */
  async getLineSaleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await lineSaleService.getLineSaleById(id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof LineSaleServiceError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /api/line-sales
   */
  async createLineSale(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorUserId = req.user?.userId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const created = await lineSaleService.createLineSale(
        req.body,
        creatorUserId,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Line Sale Account created successfully.',
        data: created,
      });
    } catch (err: any) {
      if (err instanceof LineSaleServiceError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * PUT /api/line-sales/:id
   */
  async updateLineSale(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updaterUserId = req.user?.userId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await lineSaleService.updateLineSale(
        id,
        req.body,
        updaterUserId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Line Sale Account updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      if (err instanceof LineSaleServiceError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * PATCH /api/line-sales/:id/status
   */
  async updateLineSaleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field isActive (boolean) is required in request body.',
          },
        });
        return;
      }

      const updaterUserId = req.user?.userId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await lineSaleService.updateLineSaleStatus(
        id,
        Boolean(isActive),
        updaterUserId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: `Line Sale Account status changed to ${updated.isActive ? 'Active' : 'Inactive'}.`,
        data: updated,
      });
    } catch (err: any) {
      if (err instanceof LineSaleServiceError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * PUT /api/line-sales/:id/depots
   */
  async updateLineSaleDepots(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { depotIds } = req.body;

      if (!Array.isArray(depotIds)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field depotIds (array) is required.',
          },
        });
        return;
      }

      const updaterUserId = req.user?.userId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await lineSaleService.updateLineSaleDepots(
        id,
        depotIds,
        updaterUserId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Line Sale Account assigned depots updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      if (err instanceof LineSaleServiceError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * PUT /api/line-sales/:id/schemes
   */
  async updateLineSaleSchemes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { schemeListIds } = req.body;

      if (!Array.isArray(schemeListIds)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field schemeListIds (array) is required.',
          },
        });
        return;
      }

      const updaterUserId = req.user?.userId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await lineSaleService.updateLineSaleSchemes(
        id,
        schemeListIds,
        updaterUserId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Line Sale Account assigned schemes updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      if (err instanceof LineSaleServiceError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }
}

export const lineSaleController = new LineSaleController();
