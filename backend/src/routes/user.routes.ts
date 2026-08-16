import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';

const userRouter = Router();

// All user management routes require valid authentication and Super Admin authorization
userRouter.use(authenticate);
userRouter.use(requireRole('Super Admin'));

/**
 * @route   GET /api/users
 * @desc    List all users with optional filtering by search, role, depot, or active status
 * @access  Super Admin only
 */
userRouter.get('/', (req, res, next) => {
  userController.getUsers(req, res, next);
});

/**
 * @route   GET /api/users/:id
 * @desc    Retrieve single user details
 * @access  Super Admin only
 */
userRouter.get('/:id', (req, res, next) => {
  userController.getUserById(req, res, next);
});

/**
 * @route   POST /api/users
 * @desc    Register new employee credentials in MySQL
 * @access  Super Admin only
 */
userRouter.post('/', (req, res, next) => {
  userController.createUser(req, res, next);
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update employee credentials and profile
 * @access  Super Admin only
 */
userRouter.put('/:id', (req, res, next) => {
  userController.updateUser(req, res, next);
});

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Activate or deactivate user account
 * @access  Super Admin only
 */
userRouter.patch('/:id/status', (req, res, next) => {
  userController.updateUserStatus(req, res, next);
});

export default userRouter;
