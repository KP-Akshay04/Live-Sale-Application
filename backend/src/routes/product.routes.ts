import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';

const productRouter = Router();

// All product management routes require valid authentication and Super Admin authorization
productRouter.use(authenticate);
productRouter.use(requireRole('Super Admin'));

/**
 * @route   GET /api/products
 * @desc    List all products with optional query filtering (search, isActive, category)
 * @access  Super Admin only
 */
productRouter.get('/', (req, res, next) => {
  productController.getProducts(req, res, next);
});

/**
 * @route   GET /api/products/:id
 * @desc    Retrieve single product details
 * @access  Super Admin only
 */
productRouter.get('/:id', (req, res, next) => {
  productController.getProductById(req, res, next);
});

/**
 * @route   POST /api/products
 * @desc    Create new product in MySQL
 * @access  Super Admin only
 */
productRouter.post('/', (req, res, next) => {
  productController.createProduct(req, res, next);
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update product configuration
 * @access  Super Admin only
 */
productRouter.put('/:id', (req, res, next) => {
  productController.updateProduct(req, res, next);
});

/**
 * @route   PATCH /api/products/:id/status
 * @desc    Activate or deactivate product
 * @access  Super Admin only
 */
productRouter.patch('/:id/status', (req, res, next) => {
  productController.updateProductStatus(req, res, next);
});

export default productRouter;
