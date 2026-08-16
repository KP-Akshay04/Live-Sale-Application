import { Router } from 'express';
import { schemeListController } from '../controllers/schemeList.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';

const schemeListRouter = Router();

// All Scheme List management routes require valid authentication and Super Admin authorization
schemeListRouter.use(authenticate);
schemeListRouter.use(requireRole('Super Admin'));

/**
 * @route   GET /api/scheme-lists
 * @desc    List all scheme lists with items and query filtering (search, isActive, schemeType, code)
 * @access  Super Admin only
 */
schemeListRouter.get('/', (req, res, next) => {
  schemeListController.getSchemeLists(req, res, next);
});

/**
 * @route   GET /api/scheme-lists/:id
 * @desc    Retrieve single scheme list details and items
 * @access  Super Admin only
 */
schemeListRouter.get('/:id', (req, res, next) => {
  schemeListController.getSchemeListById(req, res, next);
});

/**
 * @route   POST /api/scheme-lists
 * @desc    Create new scheme list with items transactionally in MySQL
 * @access  Super Admin only
 */
schemeListRouter.post('/', (req, res, next) => {
  schemeListController.createSchemeList(req, res, next);
});

/**
 * @route   PUT /api/scheme-lists/:id
 * @desc    Update scheme list metadata and optionally reconcile items
 * @access  Super Admin only
 */
schemeListRouter.put('/:id', (req, res, next) => {
  schemeListController.updateSchemeList(req, res, next);
});

/**
 * @route   PATCH /api/scheme-lists/:id/status
 * @desc    Activate or deactivate scheme list
 * @access  Super Admin only
 */
schemeListRouter.patch('/:id/status', (req, res, next) => {
  schemeListController.updateSchemeListStatus(req, res, next);
});

/**
 * @route   PUT /api/scheme-lists/:id/items
 * @desc    Upsert a single scheme list item deal configuration
 * @access  Super Admin only
 */
schemeListRouter.put('/:id/items', (req, res, next) => {
  schemeListController.upsertSchemeListItem(req, res, next);
});

/**
 * @route   DELETE /api/scheme-lists/:id
 * @desc    Delete scheme list and cascade delete items
 * @access  Super Admin only
 */
schemeListRouter.delete('/:id', (req, res, next) => {
  schemeListController.deleteSchemeList(req, res, next);
});

export default schemeListRouter;
