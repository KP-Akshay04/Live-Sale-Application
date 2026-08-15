import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * 404 Handler for undefined API routes
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found at route: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
}

/**
 * Centralized Error Handler middleware
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  
  // Safe sanitized message
  let message = err.message || 'Internal Server Error';

  // Prevent leaking sensitive database credentials, passwords, or connection strings
  if (message.includes('mysql://') || message.includes('DATABASE_URL') || message.includes('password')) {
    message = 'A database configuration or connection issue occurred.';
  }

  // Log error for server diagnostics
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      code: err.code || 'INTERNAL_ERROR',
      ...(env.nodeEnv === 'development' && !env.isProduction && {
        stack: err.stack,
      }),
    },
  });
}
