import { Response, NextFunction } from 'express';
import { schemeListService, SchemeListServiceError } from '../services/schemeList.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import {
  SchemeListFilterQuery,
  CreateSchemeListDTO,
  UpdateSchemeListDTO,
  UpdateSchemeListItemDTO,
} from '../types/schemeList.types.js';

export class SchemeListController {
  /**
   * GET /api/scheme-lists
   * Retrieves all scheme lists matching query filters.
   */
  async getSchemeLists(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: SchemeListFilterQuery = {};

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

      if (typeof req.query.schemeType === 'string' && req.query.schemeType.trim()) {
        filters.schemeType = req.query.schemeType.trim();
      }

      if (typeof req.query.code === 'string' && req.query.code.trim()) {
        filters.code = req.query.code.trim();
      }

      const lists = await schemeListService.getSchemeLists(filters);

      res.status(200).json({
        success: true,
        data: lists,
        count: lists.length,
      });
    } catch (err: unknown) {
      if (err instanceof SchemeListServiceError) {
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
   * GET /api/scheme-lists/:id
   * Retrieves a single scheme list by ID or code.
   */
  async getSchemeListById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Scheme list ID or code parameter is required.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const list = await schemeListService.getSchemeListById(id.trim());

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (err: unknown) {
      if (err instanceof SchemeListServiceError) {
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
   * POST /api/scheme-lists
   * Creates a new promotional scheme list with item configurations.
   */
  async createSchemeList(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateSchemeListDTO = req.body;
      const userId = req.user?.userId;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const created = await schemeListService.createSchemeList(dto, userId, ip, userAgent);

      res.status(201).json({
        success: true,
        message: `Scheme list '${created.code}' created successfully`,
        data: created,
      });
    } catch (err: unknown) {
      if (err instanceof SchemeListServiceError) {
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
   * PUT /api/scheme-lists/:id
   * Updates an existing scheme list header and items.
   */
  async updateSchemeList(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Scheme list ID or code parameter is required.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const dto: UpdateSchemeListDTO = req.body;
      const userId = req.user?.userId;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await schemeListService.updateSchemeList(id.trim(), dto, userId, ip, userAgent);

      res.status(200).json({
        success: true,
        message: `Scheme list '${updated.code}' updated successfully`,
        data: updated,
      });
    } catch (err: unknown) {
      if (err instanceof SchemeListServiceError) {
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
   * PATCH /api/scheme-lists/:id/status
   * Activates or deactivates a scheme list.
   */
  async updateSchemeListStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Scheme list ID or code parameter is required.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            message: 'Field isActive must be a boolean (true/false)',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const userId = req.user?.userId;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await schemeListService.updateSchemeListStatus(id.trim(), isActive, userId, ip, userAgent);

      res.status(200).json({
        success: true,
        message: `Scheme list '${updated.code}' is now ${isActive ? 'active' : 'inactive'}`,
        data: updated,
      });
    } catch (err: unknown) {
      if (err instanceof SchemeListServiceError) {
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
   * PUT /api/scheme-lists/:id/items
   * Upserts a single item in a scheme list.
   */
  async upsertSchemeListItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Scheme list ID or code parameter is required.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const itemDto: UpdateSchemeListItemDTO = req.body;
      const userId = req.user?.userId;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await schemeListService.upsertSchemeListItem(id.trim(), itemDto, userId, ip, userAgent);

      res.status(200).json({
        success: true,
        message: 'Scheme list item updated successfully',
        data: updated,
      });
    } catch (err: unknown) {
      if (err instanceof SchemeListServiceError) {
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
   * DELETE /api/scheme-lists/:id
   * Deletes a scheme list and all its child items.
   */
  async deleteSchemeList(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Scheme list ID or code parameter is required.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const userId = req.user?.userId;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await schemeListService.deleteSchemeList(id.trim(), userId, ip, userAgent);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { deletedId: result.deletedId },
      });
    } catch (err: unknown) {
      if (err instanceof SchemeListServiceError) {
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

export const schemeListController = new SchemeListController();
