import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const authRouter = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and receive JWT
 * @access  Public (Rate limited)
 */
authRouter.post('/login', authRateLimiter, (req, res, next) => {
  authController.login(req, res, next);
});

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve profile of the currently authenticated user
 * @access  Private (JWT required)
 */
authRouter.get('/me', authenticate, (req, res, next) => {
  authController.getMe(req, res, next);
});

/**
 * @route   POST /api/auth/logout
 * @desc    Session termination confirmation (Client-side token disposal)
 * @access  Public
 */
authRouter.post('/logout', (req, res) => {
  authController.logout(req, res);
});

export default authRouter;
