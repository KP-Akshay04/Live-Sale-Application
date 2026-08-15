import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Global singleton pattern to prevent multiple Prisma Client instances in dev reload
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const prisma =
  global.__prismaClient ||
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  global.__prismaClient = prisma;
}

/**
 * Verifies database connectivity by executing a lightweight query.
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  latencyMs?: number;
}> {
  const start = Date.now();
  try {
    // Perform simple raw query to verify actual MySQL socket connection
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown database connection error';
    return {
      connected: false,
      error: errorMessage,
    };
  }
}

/**
 * Graceful disconnect on shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[Database] Disconnected Prisma client gracefully.');
  } catch (err) {
    console.error('[Database] Error disconnecting Prisma client:', err);
  }
}
