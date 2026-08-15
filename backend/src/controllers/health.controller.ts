import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';
import { env } from '../config/env.js';

/**
 * Health check controller
 * Checks both server responsiveness and live Prisma database connectivity
 */
export async function getHealthStatus(_req: Request, res: Response): Promise<void> {
  const dbHealth = await checkDatabaseConnection();

  const isHealthy = dbHealth.connected;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    server: {
      status: 'running',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    },
    database: {
      provider: 'mysql',
      connected: dbHealth.connected,
      latencyMs: dbHealth.latencyMs,
      ...(dbHealth.error && {
        error: env.isProduction ? 'Database connection failed' : dbHealth.error,
      }),
    },
    message: isHealthy
      ? 'BINDU Live Sale Backend & MySQL Database are operational.'
      : 'Backend is running but MySQL database is unreachable. Check DATABASE_URL configuration.',
  });
}
