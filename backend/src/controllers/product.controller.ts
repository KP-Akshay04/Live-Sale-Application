import { Response, NextFunction } from 'express';
import { productService, ProductServiceError } from '../services/product.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { ProductFilterQuery } from '../types/product.types.js';

export class ProductController {
  /**
   * GET /api/products
   * Retrieves all products matching query filters (search, isActive, category).
   */
  async getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: ProductFilterQuery = {};

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

      if (typeof req.query.category === 'string' && req.query.category.trim()) {
        filters.category = req.query.category.trim();
      }

      const products = await productService.getProducts(filters);

      res.status(200).json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (err: unknown) {
      if (err instanceof ProductServiceError) {
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
   * GET /api/products/:id
   * Retrieves a single product by numeric ID or materialCode.
   */
  async getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Product ID is required in URL path.',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const product = await productService.getProductById(id);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (err: unknown) {
      if (err instanceof ProductServiceError) {
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
   * POST /api/products
   * Creates a new Product in MySQL.
   */
  async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp =
        (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const userAgent = req.headers?.['user-agent'];

      const product = await productService.createProduct(
        req.body,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (err: unknown) {
      if (err instanceof ProductServiceError) {
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
   * PUT /api/products/:id
   * Updates an existing Product in MySQL.
   */
  async updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Product ID must be a valid integer.',
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

      const product = await productService.updateProduct(
        numericId,
        req.body,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (err: unknown) {
      if (err instanceof ProductServiceError) {
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
   * PATCH /api/products/:id/status
   * Activates or deactivates a Product.
   */
  async updateProductStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Product ID must be a valid integer.',
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

      const product = await productService.updateProductStatus(
        numericId,
        isActive,
        req.user?.userId,
        clientIp,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: isActive ? 'Product activated successfully' : 'Product deactivated successfully',
        data: product,
      });
    } catch (err: unknown) {
      if (err instanceof ProductServiceError) {
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

export const productController = new ProductController();
