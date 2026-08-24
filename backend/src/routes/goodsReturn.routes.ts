import { Router } from 'express';
import { goodsReturnController } from '../controllers/goodsReturn.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const goodsReturnRouter = Router();

// All Goods Return endpoints require authentication.
goodsReturnRouter.use(authenticate);

/**
 * @route   GET /api/goods-returns
 * @desc    List Goods Returns
 */
goodsReturnRouter.get(
  '/',
  (req, res, next) => {
    goodsReturnController.getGoodsReturns(req, res, next);
  }
);

/**
 * @route   GET /api/goods-returns/:id
 * @desc    Get Goods Return by ID or document ID
 */
goodsReturnRouter.get(
  '/:id',
  (req, res, next) => {
    goodsReturnController.getGoodsReturnById(req, res, next);
  }
);

/**
 * @route   POST /api/goods-returns
 * @desc    Create Goods Return
 */
goodsReturnRouter.post(
  '/',
  (req, res, next) => {
    goodsReturnController.createGoodsReturn(req, res, next);
  }
);

/**
 * @route   PUT /api/goods-returns/:id
 * @desc    Update Goods Return
 */
goodsReturnRouter.put(
  '/:id',
  (req, res, next) => {
    goodsReturnController.updateGoodsReturn(req, res, next);
  }
);

/**
 * @route   PATCH /api/goods-returns/:id/status
 * @desc    Update Goods Return status
 */
goodsReturnRouter.patch(
  '/:id/status',
  (req, res, next) => {
    goodsReturnController.updateGoodsReturnStatus(
      req,
      res,
      next
    );
  }
);

export default goodsReturnRouter;