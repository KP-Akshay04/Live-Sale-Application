import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file if present
dotenv.config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  clientUrl: string;
  isProduction: boolean;
  jwtSecret: string;
  jwtExpiration: string;
  devAdminLoginId?: string;
  devAdminEmail?: string;
  devAdminPassword?: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export const env: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  jwtSecret: process.env.JWT_SECRET || 'bindu-default-dev-secret-key-32-chars-long!!',
  jwtExpiration: process.env.JWT_EXPIRATION || '8h',
  devAdminLoginId: process.env.DEV_ADMIN_LOGIN_ID || process.env.DEV_ADMIN_EMAIL,
  devAdminEmail: process.env.DEV_ADMIN_EMAIL,
  devAdminPassword: process.env.DEV_ADMIN_PASSWORD,
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '20', 10),
};

export function validateEnvironment(): void {
  if (!env.databaseUrl) {
    console.warn(
      '[Config Warning] DATABASE_URL is not set in environment. Database connection will fail until configured.'
    );
  }

  if (env.isProduction && env.jwtSecret === 'bindu-default-dev-secret-key-32-chars-long!!') {
    console.error(
      '[Security Warning] Running in production with default JWT_SECRET! Set a secure random JWT_SECRET in environment.'
    );
  }
}
