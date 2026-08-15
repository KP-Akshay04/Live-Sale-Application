import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: Record<string, unknown>
): void {
  const responseBody: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
  res.status(statusCode).json(responseBody);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code = 'SERVER_ERROR',
  details?: unknown
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      code,
      ...(details !== undefined && { details }),
    },
  });
}
