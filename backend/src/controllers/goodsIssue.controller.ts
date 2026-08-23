import { Request, Response, NextFunction } from 'express';
import { goodsIssueService, GoodsIssueServiceError } from '../services/goodsIssue.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class GoodsIssueController {
  /**
   * List goods issues with filter queries.
   */
  async getGoodsIssues(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string,
        depotId: req.query.depotId as string,
        lineSaleId: req.query.lineSaleId as string,
        partyCode: req.query.partyCode as string,
        status: req.query.status as string,
        vehicleNumber: req.query.vehicleNumber as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const results = await goodsIssueService.getGoodsIssues(filters, req.user);

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
   * Get single goods issue by id or documentId.
   */
  async getGoodsIssueById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await goodsIssueService.getGoodsIssueById(id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsIssueServiceError) {
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
   * Create a new Goods Issue with line items and historical rates transactionally.
   */
  async createGoodsIssue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'API Client';

      const result = await goodsIssueService.createGoodsIssue(
        req.body,
        req.user,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: `Goods Issue '${result.documentId}' created successfully with ${result.itemCount} items.`,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsIssueServiceError) {
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
   * Update Goods Issue metadata.
   */
  async updateGoodsIssue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'API Client';

      const result = await goodsIssueService.updateGoodsIssue(
        id,
        req.body,
        req.user,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: `Goods Issue '${result.documentId}' updated successfully.`,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsIssueServiceError) {
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
   * Update Goods Issue status lifecycle (e.g. DRAFT -> ISSUED -> COMPLETED / CANCELLED).
   */
  async updateGoodsIssueStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || typeof status !== 'string' || status.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status field is required in request body.',
          },
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'API Client';

      const result = await goodsIssueService.updateGoodsIssueStatus(
        id,
        status,
        req.user,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: `Goods Issue '${result.documentId}' status updated to '${result.status}'.`,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof GoodsIssueServiceError) {
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

export const goodsIssueController = new GoodsIssueController();
