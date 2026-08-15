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
}

export const env: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

export function validateEnvironment(): void {
  if (!env.databaseUrl) {
    console.warn(
      '[Config Warning] DATABASE_URL is not set in environment. Database connection will fail until configured.'
    );
  }
}
