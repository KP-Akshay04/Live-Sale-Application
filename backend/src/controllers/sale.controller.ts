import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import {
  saleService,
  SaleServiceError,
} from '../services/sale.service.js';

export class SaleController {
  /**
   * GET /api/sales
   * Retrieve sales with optional filters.
   */
  async getSales(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        invoiceNumber: req.query.invoiceNumber as string | undefined,
        lineSaleId: req.query.lineSaleId as string | undefined,
        salesOfficerId: req.query.salesOfficerId as string | undefined,
        paymentStatus: req.query.paymentStatus as string | undefined,
        status: req.query.status as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };

      const results = await saleService.getSales(
        filters,
        req.user
      );

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * GET /api/sales/:id
   * Retrieve a single sale by ID or invoice number.
   */
  async getSaleById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const result = await saleService.getSaleById(
        id,
        req.user
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * POST /api/sales
   * Create a sale with items and optional payments.
   */
  async createSale(
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

        if (!req.user) {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    },
  });
  return;
}

      const result = await saleService.createSale(
        req.body,
        req.user,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: `Sale '${result.invoiceNumber}' created successfully.`,
        data: result,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * PUT /api/sales/:id
   * Update sale information and optionally reconcile items.
   */
  async updateSale(
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

        if (!req.user) {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    },
  });
  return;
}

      const result = await saleService.updateSale(
        id,
        req.body,
        req.user,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: `Sale '${result.invoiceNumber}' updated successfully.`,
        data: result,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * POST /api/sales/:id/payments
   * Add a payment against an existing sale.
   */
  async createPayment(
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

        if (!req.user) {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    },
  });
  return;
}

      const result = await saleService.createPayment(
        id,
        req.body,
        req.user,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: 'Payment created successfully.',
        data: result,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * PUT /api/payments/:id
   * Update an existing payment.
   */
  async updatePayment(
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

        if (!req.user) {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    },
  });
  return;
}

      const result = await saleService.updatePayment(
        id,
        req.body,
        req.user,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: 'Payment updated successfully.',
        data: result,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * GET /api/payments
   * Retrieve payments with optional filters.
   */
  async getPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        saleId: req.query.saleId as string | undefined,
        paymentMethod: req.query.paymentMethod as string | undefined,
        status: req.query.status as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };

      const results = await saleService.getPayments(
        filters,
        req.user
      );

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * GET /api/sales/summary
   * Retrieve sales and payment summary.
   */
  async getSalesSummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        lineSaleId: req.query.lineSaleId as string | undefined,
        salesOfficerId: req.query.salesOfficerId as string | undefined,
      };

      const result = await saleService.getSalesSummary(
        filters,
        req.user
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Centralized SaleService error handling.
   */
  private handleError(
    err: unknown,
    res: Response,
    next: NextFunction
  ): void {
    if (err instanceof SaleServiceError) {
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

export const saleController = new SaleController();