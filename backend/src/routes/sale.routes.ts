import { Router } from 'express';
import { saleController } from '../controllers/sale.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const saleRouter = Router();

// All Sales endpoints require authentication.
saleRouter.use(authenticate);

/**
 * @route   GET /api/sales
 * @desc    List sales with optional filters
 */
saleRouter.get('/', (req, res, next) => {
  saleController.getSales(req, res, next);
});

/**
 * @route   GET /api/sales/summary
 * @desc    Get sales and payment summary
 *
 * IMPORTANT:
 * This must appear before /:id so "summary" is not treated as an ID.
 */
saleRouter.get('/summary', (req, res, next) => {
  saleController.getSalesSummary(req, res, next);
});

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID or invoice number
 */
saleRouter.get('/:id', (req, res, next) => {
  saleController.getSaleById(req, res, next);
});

/**
 * @route   POST /api/sales
 * @desc    Create a new sale
 */
saleRouter.post('/', (req, res, next) => {
  saleController.createSale(req, res, next);
});

/**
 * @route   PUT /api/sales/:id
 * @desc    Update sale
 */
saleRouter.put('/:id', (req, res, next) => {
  saleController.updateSale(req, res, next);
});

/**
 * @route   POST /api/sales/:id/payments
 * @desc    Add payment against a sale
 */
saleRouter.post('/:id/payments', (req, res, next) => {
  saleController.createPayment(req, res, next);
});

/**
 * @route   PUT /api/payments/:id
 * @desc    Update payment
 */
saleRouter.put('/payments/:id', (req, res, next) => {
  saleController.updatePayment(req, res, next);
});

/**
 * @route   GET /api/payments
 * @desc    List payments
 */
saleRouter.get('/payments', (req, res, next) => {
  saleController.getPayments(req, res, next);
});

export default saleRouter;