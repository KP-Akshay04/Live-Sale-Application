import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles, requireRole } from '../middleware/authorize.js';

const userRouter = Router();

/*
 * All user routes require authentication.
 */
userRouter.use(authenticate);

/*
 * --------------------------------------------------------------------------
 * READ OPERATIONS
 * --------------------------------------------------------------------------
 *
 * Super Admin:
 *   Can read all users.
 *
 * Depot Person:
 *   Can read users belonging to their assigned depot.
 *
 * Sales Officer:
 *   Can read users belonging to their assigned depot.
 *
 * The controller applies the depot scope for non-Super-Admin users.
 */
userRouter.get(
  '/',
  requireRoles('Super Admin', 'Depot Person', 'Sales Officer'),
  (req, res, next) => {
    userController.getUsers(req, res, next);
  }
);

userRouter.get(
  '/:id',
  requireRoles('Super Admin', 'Depot Person', 'Sales Officer'),
  (req, res, next) => {
    userController.getUserById(req, res, next);
  }
);

/*
 * --------------------------------------------------------------------------
 * USER MANAGEMENT
 * --------------------------------------------------------------------------
 *
 * Only Super Admin can create, update, activate or deactivate users.
 */
userRouter.post(
  '/',
  requireRole('Super Admin'),
  (req, res, next) => {
    userController.createUser(req, res, next);
  }
);

userRouter.put(
  '/:id',
  requireRole('Super Admin'),
  (req, res, next) => {
    userController.updateUser(req, res, next);
  }
);

userRouter.patch(
  '/:id/status',
  requireRole('Super Admin'),
  (req, res, next) => {
    userController.updateUserStatus(req, res, next);
  }
);

export default userRouter;