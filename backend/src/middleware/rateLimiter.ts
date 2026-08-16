import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Rate limiter middleware for authentication endpoints (e.g. POST /api/auth/login)
 * Helps protect against brute-force and credential stuffing attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs, // e.g. 60,000 ms (1 minute)
  max: env.rateLimitMax,           // e.g. 20 attempts per window
  standardHeaders: true,           // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,            // Disable `X-RateLimit-*` headers
  skip: () => env.nodeEnv === 'test', // Skip during automated test suites
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please wait a moment before trying again.',
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
    },
  },
});
