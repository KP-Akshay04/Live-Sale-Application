import { Router } from 'express';
import { depotController } from '../controllers/depot.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';

const depotRouter = Router();

// All depot management routes require valid authentication and Super Admin authorization
depotRouter.use(authenticate);
depotRouter.use(requireRole('Super Admin'));

/**
 * @route   GET /api/depots
 * @desc    List all depots with optional query filtering (search, isActive, city)
 * @access  Super Admin only
 */
depotRouter.get('/', (req, res, next) => {
  depotController.getDepots(req, res, next);
});

/**
 * @route   GET /api/depots/:id
 * @desc    Retrieve single depot details
 * @access  Super Admin only
 */
depotRouter.get('/:id', (req, res, next) => {
  depotController.getDepotById(req, res, next);
});

/**
 * @route   POST /api/depots
 * @desc    Register new logistics depot in MySQL
 * @access  Super Admin only
 */
depotRouter.post('/', (req, res, next) => {
  depotController.createDepot(req, res, next);
});

/**
 * @route   PUT /api/depots/:id
 * @desc    Update logistics depot configuration
 * @access  Super Admin only
 */
depotRouter.put('/:id', (req, res, next) => {
  depotController.updateDepot(req, res, next);
});

/**
 * @route   PATCH /api/depots/:id/status
 * @desc    Activate or deactivate depot
 * @access  Super Admin only
 */
depotRouter.patch('/:id/status', (req, res, next) => {
  depotController.updateDepotStatus(req, res, next);
});

export default depotRouter;
