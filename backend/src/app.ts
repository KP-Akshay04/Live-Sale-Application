import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cross-Origin Resource Sharing (CORS)
  const allowedOrigins = [
    env.clientUrl,
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin) || env.nodeEnv === 'development') {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body parsers with safe size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root redirect/status
  app.get('/', (_req, res) => {
    res.json({
      name: 'BINDU Live Sale Application API',
      status: 'active',
      documentation: '/api/health',
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
