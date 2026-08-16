import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const apiRouter = Router();

// Mount foundational routes
apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);

export default apiRouter;

