import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import depotRoutes from './depot.routes.js';
import productRoutes from './product.routes.js';

const apiRouter = Router();

// Mount foundational routes
apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/depots', depotRoutes);
apiRouter.use('/products', productRoutes);

export default apiRouter;

