import { Router } from 'express';
import { priceListController } from '../controllers/priceList.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';

const priceListRouter = Router();

// All Price List management routes require valid authentication and Super Admin authorization
priceListRouter.use(authenticate);
priceListRouter.use(requireRole('Super Admin'));

/**
 * @route   GET /api/price-lists
 * @desc    List all price lists with items and query filtering (search, isActive, currency, code)
 * @access  Super Admin only
 */
priceListRouter.get('/', (req, res, next) => {
  priceListController.getPriceLists(req, res, next);
});

/**
 * @route   GET /api/price-lists/:id
 * @desc    Retrieve single price list details and items
 * @access  Super Admin only
 */
priceListRouter.get('/:id', (req, res, next) => {
  priceListController.getPriceListById(req, res, next);
});

/**
 * @route   POST /api/price-lists
 * @desc    Create new price list with items transactionally in MySQL
 * @access  Super Admin only
 */
priceListRouter.post('/', (req, res, next) => {
  priceListController.createPriceList(req, res, next);
});

/**
 * @route   PUT /api/price-lists/:id
 * @desc    Update price list metadata and optionally reconcile items
 * @access  Super Admin only
 */
priceListRouter.put('/:id', (req, res, next) => {
  priceListController.updatePriceList(req, res, next);
});

/**
 * @route   PATCH /api/price-lists/:id/status
 * @desc    Activate or deactivate price list
 * @access  Super Admin only
 */
priceListRouter.patch('/:id/status', (req, res, next) => {
  priceListController.updateStatus(req, res, next);
});

/**
 * @route   PUT /api/price-lists/:id/items
 * @desc    Upsert a single price list item rate
 * @access  Super Admin only
 */
priceListRouter.put('/:id/items', (req, res, next) => {
  priceListController.upsertItem(req, res, next);
});

export default priceListRouter;
