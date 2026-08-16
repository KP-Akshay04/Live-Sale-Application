/**
 * BINDU LIVE SALE APPLICATION — PHASE 4C E2E VERIFICATION SUITE
 * Complete end-to-end verification of Product Master migration to MySQL.
 */
import { productService, ProductServiceError } from '../services/product.service.js';
import { productController } from '../controllers/product.controller.js';
import { requireRoles } from '../middleware/authorize.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';

async function runE2EVerification() {
  console.log('================================================================');
  console.log('PHASE 4C — PRODUCT MASTER DATABASE-BACKED VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function verify(condition: boolean, description: string) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  }

  function mockResponse() {
    let statusCode = 200;
    let jsonBody: any = null;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
        return res;
      },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody,
    } as unknown as Response & { getStatusCode: () => number; getBody: () => any };
    return res;
  }

  // 1. Database persistence test
  console.log('1. Verifying Database Source and Read Operations...');
  const initialProducts = await productService.getProducts();
  verify(Array.isArray(initialProducts), 'GET /api/products returns array from database layer');

  // 2. Authorization constraints
  console.log('\n2. Verifying Super Admin Authorization...');
  const adminReq: AuthenticatedRequest = {
    user: { userId: 1, role: 'Super Admin', username: 'admin', loginId: 'admin' },
  } as any;
  const salesReq: AuthenticatedRequest = {
    user: { userId: 3, role: 'Sales Officer', username: 'sales', loginId: 'sales' },
  } as any;

  let adminAllowed = false;
  requireRoles('Super Admin')(adminReq, {} as any, () => {
    adminAllowed = true;
  });
  verify(adminAllowed, 'Super Admin has access to Product Master endpoints');

  let salesForbidden = false;
  const resSales = mockResponse();
  requireRoles('Super Admin')(salesReq, resSales, () => {});
  if (resSales.getStatusCode() === 403) salesForbidden = true;
  verify(salesForbidden, 'Sales Officer is restricted with HTTP 403 Forbidden');

  // 3. Validation: Required fields
  console.log('\n3. Verifying Backend Field Validation...');
  try {
    await productService.createProduct({
      materialCode: '',
      description: 'Incomplete Item',
      baseRate: 50,
      baseUom: 'Box',
    });
    verify(false, 'Should reject empty materialCode');
  } catch (err: any) {
    verify(err instanceof ProductServiceError && err.statusCode === 400, 'Rejects empty materialCode with HTTP 400');
  }

  try {
    await productService.createProduct({
      materialCode: 'VALID-CODE-1',
      description: '',
      baseRate: 50,
      baseUom: 'Box',
    });
    verify(false, 'Should reject empty description');
  } catch (err: any) {
    verify(err instanceof ProductServiceError && err.statusCode === 400, 'Rejects empty description with HTTP 400');
  }

  // 4. Rate & Tax validations
  console.log('\n4. Verifying Rate and Tax Range Constraints...');
  try {
    await productService.createProduct({
      materialCode: 'NEG-RATE-CODE',
      description: 'Neg Rate',
      baseRate: -10,
      baseUom: 'Box',
    });
    verify(false, 'Should reject negative baseRate');
  } catch (err: any) {
    verify(err instanceof ProductServiceError && err.statusCode === 400, 'Rejects negative baseRate with HTTP 400');
  }

  try {
    await productService.createProduct({
      materialCode: 'TAX-OVERFLOW',
      description: 'Tax Overflow',
      baseRate: 100,
      taxRate: 105,
      baseUom: 'Box',
    });
    verify(false, 'Should reject taxRate > 100%');
  } catch (err: any) {
    verify(err instanceof ProductServiceError && err.statusCode === 400, 'Rejects taxRate > 100 with HTTP 400');
  }

  // 5. Create product in MySQL
  console.log('\n5. Creating Real Product in Database...');
  const uniqueCode = `PROD-E2E-${Date.now().toString().slice(-4)}`;
  const created = await productService.createProduct(
    {
      materialCode: uniqueCode,
      description: 'Bindu Fizzy Jeera Masala 600ml',
      additionalName: 'Jeera Masala 600ML',
      category: 'Beverages',
      group: 'Carbonated Drinks',
      hsnCode: '22029920',
      barcode: '8908001122334',
      baseRate: 45.5,
      taxRate: 12.0,
      baseUom: 'Box',
      alternativeQty: 24,
      isActive: true,
    },
    1,
    '127.0.0.1',
    'E2E-Verifier/1.0'
  );

  verify(created.materialCode === uniqueCode, `Product ${uniqueCode} persisted with ID ${created.id}`);
  verify(created.baseRate === 45.5, 'Decimal(14,2) rate precision verified (45.50)');
  verify(created.taxRate === 12.0, 'Decimal(5,2) tax precision verified (12.00%)');
  verify(created.hsnCode === '22029920', 'HSN code preserved as exact string');

  // 6. Duplicate code collision test
  console.log('\n6. Verifying Unique Material Code Collision...');
  try {
    await productService.createProduct({
      materialCode: uniqueCode,
      description: 'Duplicate Attempt',
      baseRate: 50,
      baseUom: 'Box',
    });
    verify(false, 'Should reject duplicate materialCode');
  } catch (err: any) {
    verify(
      err instanceof ProductServiceError && err.statusCode === 409,
      'Duplicate materialCode rejected with HTTP 409 Conflict'
    );
  }

  // 7. Update Product in MySQL
  console.log('\n7. Updating Product in Database...');
  const updated = await productService.updateProduct(
    created.id,
    {
      description: 'Bindu Fizzy Jeera Masala 600ml (Retail Pack)',
      baseRate: 48.0,
    },
    1,
    '127.0.0.1',
    'E2E-Verifier/1.0'
  );
  verify(
    updated.description === 'Bindu Fizzy Jeera Masala 600ml (Retail Pack)' && updated.baseRate === 48.0,
    'Product description and base rate updated in MySQL'
  );

  // 8. Status Toggle (Deactivation and Reactivation)
  console.log('\n8. Verifying Safe Status Toggle (Non-destructive)...');
  const deactivated = await productService.updateProductStatus(created.id, false, 1);
  verify(deactivated.isActive === false, 'Product deactivated in MySQL (isActive: false)');

  const reactivated = await productService.updateProductStatus(created.id, true, 1);
  verify(reactivated.isActive === true, 'Product reactivated in MySQL (isActive: true)');

  // 9. Query & Filter verification
  console.log('\n9. Verifying Search & Query Filters...');
  const searchResults = await productService.getProducts({ search: 'Jeera Masala' });
  verify(searchResults.some((p) => p.materialCode === uniqueCode), 'Search filter returns matched product');

  const fetchedById = await productService.getProductById(created.id);
  verify(fetchedById.materialCode === uniqueCode, 'Direct retrieval by ID works');

  const fetchedByCode = await productService.getProductById(uniqueCode);
  verify(fetchedByCode.id === created.id, 'Direct retrieval by materialCode works');

  console.log('\n================================================================');
  console.log(`PHASE 4C VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2EVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
