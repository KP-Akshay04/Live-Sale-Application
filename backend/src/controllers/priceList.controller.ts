import { Response, NextFunction } from 'express';
import { priceListService, PriceListServiceError } from '../services/priceList.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { PriceListFilterQuery, CreatePriceListDTO, UpdatePriceListDTO, UpdatePriceListItemDTO } from '../types/priceList.types.js';

export class PriceListController {
  /**
   * GET /api/price-lists
   * Retrieves all price lists matching query filters.
   */
  async getPriceLists(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: PriceListFilterQuery = {};

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

      if (typeof req.query.currency === 'string' && req.query.currency.trim()) {
        filters.currency = req.query.currency.trim();
      }

      if (typeof req.query.code === 'string' && req.query.code.trim()) {
        filters.code = req.query.code.trim();
      }

      const lists = await priceListService.getPriceLists(filters);

      res.status(200).json({
        success: true,
        data: lists,
        count: lists.length,
      });
    } catch (err: unknown) {
      if (err instanceof PriceListServiceError) {
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
   * GET /api/price-lists/:id
   * Retrieves a single price list by ID or code.
   */
  async getPriceListById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: "Price list ID or code parameter is required.",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const list = await priceListService.getPriceListById(id.trim());

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (err: unknown) {
      if (err instanceof PriceListServiceError) {
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
   * POST /api/price-lists
   * Creates a new Price List and its configured items transactionally.
   */
  async createPriceList(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as CreatePriceListDTO;

      if (!body || typeof body !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            message: "Invalid request payload. Expected JSON object.",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const userId = req.user?.userId;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const created = await priceListService.createPriceList(body, userId, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        message: `Price List '${created.name}' (${created.code}) created successfully.`,
        data: created,
      });
    } catch (err: unknown) {
      if (err instanceof PriceListServiceError) {
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
   * PUT /api/price-lists/:id
   * Updates an existing price list and optionally reconciles child items.
   */
  async updatePriceList(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = req.body as UpdatePriceListDTO;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: "Price list identifier parameter is required.",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const userId = req.user?.userId;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await priceListService.updatePriceList(id.trim(), body, userId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: `Price List '${updated.name}' (${updated.code}) updated successfully.`,
        data: updated,
      });
    } catch (err: unknown) {
      if (err instanceof PriceListServiceError) {
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
   * PATCH /api/price-lists/:id/status
   * Activates or deactivates a price list.
   */
  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: "Price list identifier parameter is required.",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

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

      const userId = req.user?.userId;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await priceListService.updateStatus(id.trim(), isActive, userId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: `Price List status changed to ${isActive ? 'Active' : 'Inactive'}.`,
        data: updated,
      });
    } catch (err: unknown) {
      if (err instanceof PriceListServiceError) {
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
   * PUT /api/price-lists/:id/items
   * Upserts a single item rate in the specified price list.
   */
  async upsertItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = req.body as UpdatePriceListItemDTO;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: {
            message: "Price list identifier parameter is required.",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      if (!body || !body.productId) {
        res.status(400).json({
          success: false,
          error: {
            message: "Item 'productId' and 'rate' are required.",
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const userId = req.user?.userId;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await priceListService.upsertItemRate(id.trim(), body, userId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Price list item rate updated successfully.',
        data: updated,
      });
    } catch (err: unknown) {
      if (err instanceof PriceListServiceError) {
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

export const priceListController = new PriceListController();
