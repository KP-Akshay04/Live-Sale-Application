import { Response, NextFunction } from 'express';
import {
  goodsReturnService,
  GoodsReturnServiceError,
} from '../services/goodsReturn.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class GoodsReturnController {
  /**
   * List Goods Returns with optional filters.
   */
  async getGoodsReturns(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string,
        goodsIssueId: req.query.goodsIssueId as string,
        depotId: req.query.depotId as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const results = await goodsReturnService.getGoodsReturns(
        filters,
        req.user
      );

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get a single Goods Return by numeric ID or document ID.
   */
  async getGoodsReturnById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const result =
        await goodsReturnService.getGoodsReturnById(id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsReturnServiceError) {
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
   * Create a new Goods Return.
   */
  async createGoodsReturn(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ipAddress =
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const userAgent =
        req.headers['user-agent'] ||
        'API Client';

      const result =
        await goodsReturnService.createGoodsReturn(
          req.body,
          req.user,
          ipAddress,
          userAgent
        );

      res.status(201).json({
        success: true,
        message: `Goods Return '${result.returnDocumentId}' created successfully with ${result.itemCount} items.`,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsReturnServiceError) {
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
   * Update an existing Goods Return.
   */
  async updateGoodsReturn(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const ipAddress =
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const userAgent =
        req.headers['user-agent'] ||
        'API Client';

      const result =
        await goodsReturnService.updateGoodsReturn(
          id,
          req.body,
          req.user,
          ipAddress,
          userAgent
        );

      res.status(200).json({
        success: true,
        message: `Goods Return '${result.returnDocumentId}' updated successfully.`,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsReturnServiceError) {
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
   * Update Goods Return status.
   */
  async updateGoodsReturnStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (
        !status ||
        typeof status !== 'string' ||
        status.trim().length === 0
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Status field is required in request body.',
          },
        });
        return;
      }

      const ipAddress =
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const userAgent =
        req.headers['user-agent'] ||
        'API Client';

      const result =
        await goodsReturnService.updateGoodsReturnStatus(
          id,
          status,
          req.user,
          ipAddress,
          userAgent
        );

      res.status(200).json({
        success: true,
        message: `Goods Return '${result.returnDocumentId}' status updated to '${result.status}'.`,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsReturnServiceError) {
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

export const goodsReturnController =
  new GoodsReturnController();