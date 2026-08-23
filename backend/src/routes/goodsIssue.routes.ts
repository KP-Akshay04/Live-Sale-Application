import { Router } from 'express';
import { goodsIssueController } from '../controllers/goodsIssue.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';

const goodsIssueRouter = Router();

// All Goods Issue routes require valid authentication
goodsIssueRouter.use(authenticate);

/**
 * @route   GET /api/goods-issues
 * @desc    List goods issues with relations, filtering, and role scoping
 * @access  Super Admin, Depot Person, Sales Officer
 */
goodsIssueRouter.get(
  '/',
  requireRoles('Super Admin', 'Depot Person', 'Sales Officer'),
  (req, res, next) => {
    goodsIssueController.getGoodsIssues(req, res, next);
  }
);

/**
 * @route   GET /api/goods-issues/:id
 * @desc    Retrieve single goods issue with line items, product rates, and vehicle info
 * @access  Super Admin, Depot Person, Sales Officer
 */
goodsIssueRouter.get(
  '/:id',
  requireRoles('Super Admin', 'Depot Person', 'Sales Officer'),
  (req, res, next) => {
    goodsIssueController.getGoodsIssueById(req, res, next);
  }
);

/**
 * @route   POST /api/goods-issues
 * @desc    Create new Goods Issue transaction with line items and historical rates
 * @access  Super Admin, Depot Person
 */
goodsIssueRouter.post(
  '/',
  requireRoles('Super Admin', 'Depot Person'),
  (req, res, next) => {
    goodsIssueController.createGoodsIssue(req, res, next);
  }
);

/**
 * @route   PUT /api/goods-issues/:id
 * @desc    Update unfinalized goods issue metadata
 * @access  Super Admin, Depot Person
 */
goodsIssueRouter.put(
  '/:id',
  requireRoles('Super Admin', 'Depot Person'),
  (req, res, next) => {
    goodsIssueController.updateGoodsIssue(req, res, next);
  }
);

/**
 * @route   PATCH /api/goods-issues/:id/status
 * @desc    Update Goods Issue status (e.g., DRAFT, ISSUED, COMPLETED, CANCELLED)
 * @access  Super Admin, Depot Person
 */
goodsIssueRouter.patch(
  '/:id/status',
  requireRoles('Super Admin', 'Depot Person'),
  (req, res, next) => {
    goodsIssueController.updateGoodsIssueStatus(req, res, next);
  }
);

export default goodsIssueRouter;
