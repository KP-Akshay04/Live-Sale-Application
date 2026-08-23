import { Router } from 'express';
import { lineSaleController } from '../controllers/lineSale.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';

const lineSaleRouter = Router();

// All Line Sale Master routes require valid authentication and Super Admin authorization
lineSaleRouter.use(authenticate);
lineSaleRouter.use(requireRole('Super Admin'));

/**
 * @route   GET /api/line-sales
 * @desc    List all line sale accounts with relations and filtering
 * @access  Super Admin only
 */
lineSaleRouter.get('/', (req, res, next) => {
  lineSaleController.getLineSales(req, res, next);
});

/**
 * @route   GET /api/line-sales/:id
 * @desc    Retrieve single line sale account details and relations
 * @access  Super Admin only
 */
lineSaleRouter.get('/:id', (req, res, next) => {
  lineSaleController.getLineSaleById(req, res, next);
});

/**
 * @route   POST /api/line-sales
 * @desc    Create new line sale account with depot and scheme mappings transactionally
 * @access  Super Admin only
 */
lineSaleRouter.post('/', (req, res, next) => {
  lineSaleController.createLineSale(req, res, next);
});

/**
 * @route   PUT /api/line-sales/:id
 * @desc    Update line sale account metadata and relationships transactionally
 * @access  Super Admin only
 */
lineSaleRouter.put('/:id', (req, res, next) => {
  lineSaleController.updateLineSale(req, res, next);
});

/**
 * @route   PATCH /api/line-sales/:id/status
 * @desc    Activate or deactivate line sale account (non-destructive)
 * @access  Super Admin only
 */
lineSaleRouter.patch('/:id/status', (req, res, next) => {
  lineSaleController.updateLineSaleStatus(req, res, next);
});

/**
 * @route   PUT /api/line-sales/:id/depots
 * @desc    Reconcile assigned depots for line sale account
 * @access  Super Admin only
 */
lineSaleRouter.put('/:id/depots', (req, res, next) => {
  lineSaleController.updateLineSaleDepots(req, res, next);
});

/**
 * @route   PUT /api/line-sales/:id/schemes
 * @desc    Reconcile assigned schemes for line sale account
 * @access  Super Admin query
 */
lineSaleRouter.put('/:id/schemes', (req, res, next) => {
  lineSaleController.updateLineSaleSchemes(req, res, next);
});

export default lineSaleRouter;
