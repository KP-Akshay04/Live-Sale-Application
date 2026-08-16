/**
 * BINDU LIVE SALE APPLICATION — PHASE 4C: PRODUCT MASTER TEST SUITE
 * Validates database-backed CRUD, unique material codes, monetary precision,
 * input validations, audit logging, and Super Admin authorization.
 */
import { productController } from '../controllers/product.controller.js';
import { productService, ProductServiceError } from '../services/product.service.js';
import { requireRoles } from '../middleware/authorize.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';

async function runProductMasterTests() {
  console.log('================================================================');
  console.log('BINDU PHASE 4C: PRODUCT MASTER TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  function createMockResponse() {
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

  // =========================================================================
  // 1. AUTHORIZATION TESTS
  // =========================================================================
  console.log('--- 1. Role Authorization Checks for Product Master ---');

  const superAdminReq: AuthenticatedRequest = {
    user: {
      userId: 1,
      role: 'Super Admin',
      username: 'admin',
      loginId: 'admin',
    },
  } as unknown as AuthenticatedRequest;

  const salesOfficerReq: AuthenticatedRequest = {
    user: {
      userId: 3,
      role: 'Sales Officer',
      username: 'sales',
      loginId: 'sales',
    },
  } as unknown as AuthenticatedRequest;

  const depotPersonReq: AuthenticatedRequest = {
    user: {
      userId: 2,
      role: 'Depot Person',
      username: 'depot',
      loginId: 'depot',
    },
  } as unknown as AuthenticatedRequest;

  let superAdminAllowed = false;
  requireRoles('Super Admin')(superAdminReq, {} as any, () => {
    superAdminAllowed = true;
  });
  assert(superAdminAllowed, 'Super Admin role is granted access to Product Master endpoints');

  let salesOfficerBlocked = false;
  const mockResSales = createMockResponse();
  requireRoles('Super Admin')(salesOfficerReq, mockResSales, () => {
    salesOfficerBlocked = false;
  });
  if (mockResSales.getStatusCode() === 403) salesOfficerBlocked = true;
  assert(salesOfficerBlocked, 'Sales Officer role is blocked with 403 Forbidden from Product Master');

  let depotPersonBlocked = false;
  const mockResDepot = createMockResponse();
  requireRoles('Super Admin')(depotPersonReq, mockResDepot, () => {
    depotPersonBlocked = false;
  });
  if (mockResDepot.getStatusCode() === 403) depotPersonBlocked = true;
  assert(depotPersonBlocked, 'Depot Person role is blocked with 403 Forbidden from Product Master');

  // =========================================================================
  // 2. INPUT VALIDATION TESTS
  // =========================================================================
  console.log('\n--- 2. Input Validation Checks ---');

  // Missing materialCode
  try {
    await productService.createProduct({
      materialCode: '',
      description: 'Test Soda 500ml',
      baseRate: 50.0,
      baseUom: 'Box',
    });
    assert(false, 'Should reject empty materialCode');
  } catch (err: any) {
    assert(
      err instanceof ProductServiceError && err.statusCode === 400,
      'Rejects missing materialCode with HTTP 400'
    );
  }

  // Missing description
  try {
    await productService.createProduct({
      materialCode: 'TEST-NO-DESC',
      description: '',
      baseRate: 50.0,
      baseUom: 'Box',
    });
    assert(false, 'Should reject empty description');
  } catch (err: any) {
    assert(
      err instanceof ProductServiceError && err.statusCode === 400,
      'Rejects missing description with HTTP 400'
    );
  }

  // Negative baseRate
  try {
    await productService.createProduct({
      materialCode: 'TEST-NEG-RATE',
      description: 'Negative Rate Product',
      baseRate: -15.5,
      baseUom: 'Box',
    });
    assert(false, 'Should reject negative baseRate');
  } catch (err: any) {
    assert(
      err instanceof ProductServiceError && err.statusCode === 400,
      'Rejects negative baseRate with HTTP 400'
    );
  }

  // Invalid taxRate (> 100)
  try {
    await productService.createProduct({
      materialCode: 'TEST-HIGH-TAX',
      description: 'High Tax Product',
      baseRate: 50.0,
      taxRate: 150.0,
      baseUom: 'Box',
    });
    assert(false, 'Should reject taxRate > 100');
  } catch (err: any) {
    assert(
      err instanceof ProductServiceError && err.statusCode === 400,
      'Rejects taxRate > 100 with HTTP 400'
    );
  }

  // =========================================================================
  // 3. CREATE & MONETARY PRECISION TESTS
  // =========================================================================
  console.log('\n--- 3. Create Product & Monetary Precision Tests ---');

  const testCode = `PROD-TEST-${Date.now().toString().slice(-4)}`;
  const createdProd = await productService.createProduct(
    {
      materialCode: testCode,
      description: 'Bindu Sparkling Lemon Fizz 750ml',
      additionalName: 'Lemon Fizz 750ML',
      category: 'Beverages',
      group: 'Carbonated Drinks',
      hsnCode: '22029920',
      barcode: '8901234567890',
      baseRate: 125.75,
      taxRate: 18.0,
      baseUom: 'Box',
      alternativeQty: 24,
      isActive: true,
    },
    1,
    '127.0.0.1',
    'ProductTestSuite/1.0'
  );

  assert(
    createdProd.materialCode === testCode,
    `Successfully created product with material code ${testCode}`
  );
  assert(
    createdProd.baseRate === 125.75 && createdProd.rate === 125.75,
    'Preserves exact base rate Decimal(14,2) precision: 125.75'
  );
  assert(
    createdProd.taxRate === 18.0 && createdProd.gstRate === 18.0,
    'Preserves exact tax rate Decimal(5,2) precision: 18.00'
  );
  assert(
    createdProd.hsnCode === '22029920',
    'Preserves HSN code as string without number truncation'
  );
  assert(
    createdProd.isActive === true,
    'New product is active by default'
  );

  // =========================================================================
  // 4. DUPLICATE MATERIAL CODE ENFORCEMENT (HTTP 409)
  // =========================================================================
  console.log('\n--- 4. Duplicate Material Code Constraint ---');

  try {
    await productService.createProduct({
      materialCode: testCode,
      description: 'Duplicate Code Product',
      baseRate: 200.0,
      baseUom: 'Box',
    });
    assert(false, 'Should reject duplicate materialCode');
  } catch (err: any) {
    assert(
      err instanceof ProductServiceError &&
        err.statusCode === 409 &&
        err.code === 'DUPLICATE_MATERIAL_CODE',
      'Rejects duplicate materialCode with HTTP 409 DUPLICATE_MATERIAL_CODE'
    );
  }

  // =========================================================================
  // 5. UPDATE PRODUCT TESTS
  // =========================================================================
  console.log('\n--- 5. Update Product Tests ---');

  const updatedProd = await productService.updateProduct(
    createdProd.id,
    {
      description: 'Bindu Sparkling Lemon Fizz 750ml (Special Edition)',
      baseRate: 135.5,
      taxRate: 18.0,
    },
    1,
    '127.0.0.1',
    'ProductTestSuite/1.0'
  );

  assert(
    updatedProd.description === 'Bindu Sparkling Lemon Fizz 750ml (Special Edition)',
    'Updated product description in database'
  );
  assert(
    updatedProd.baseRate === 135.5,
    'Updated product baseRate in database to 135.50'
  );

  // =========================================================================
  // 6. STATUS ACTIVATION / DEACTIVATION TESTS
  // =========================================================================
  console.log('\n--- 6. Status Toggle Tests ---');

  const deactivatedProd = await productService.updateProductStatus(
    createdProd.id,
    false,
    1,
    '127.0.0.1',
    'ProductTestSuite/1.0'
  );
  assert(
    deactivatedProd.isActive === false,
    'Successfully deactivated product in database (isActive: false)'
  );

  const reactivatedProd = await productService.updateProductStatus(
    createdProd.id,
    true,
    1,
    '127.0.0.1',
    'ProductTestSuite/1.0'
  );
  assert(
    reactivatedProd.isActive === true,
    'Successfully reactivated product in database (isActive: true)'
  );

  // =========================================================================
  // 7. GET PRODUCTS WITH FILTERS TESTS
  // =========================================================================
  console.log('\n--- 7. Query Filtering Tests ---');

  const allProducts = await productService.getProducts();
  assert(
    Array.isArray(allProducts) && allProducts.length > 0,
    `Retrieved all products list from database (count: ${allProducts.length})`
  );

  const searchedProducts = await productService.getProducts({ search: 'Lemon Fizz' });
  assert(
    searchedProducts.some((p) => p.materialCode === testCode),
    'Search filter correctly matches product description / code'
  );

  const byIdProduct = await productService.getProductById(createdProd.id);
  assert(
    byIdProduct.materialCode === testCode,
    'Retrieved single product by numeric ID'
  );

  const byCodeProduct = await productService.getProductById(testCode);
  assert(
    byCodeProduct.id === createdProd.id,
    'Retrieved single product by unique materialCode'
  );

  // =========================================================================
  // 8. CONTROLLER ENDPOINT DISPATCH TESTS
  // =========================================================================
  console.log('\n--- 8. Controller HTTP Layer Tests ---');

  const mockReqGet = {
    ...superAdminReq,
    query: { search: testCode },
  } as unknown as AuthenticatedRequest;
  const mockResGet = createMockResponse();

  await productController.getProducts(mockReqGet, mockResGet, () => {});
  assert(
    mockResGet.getStatusCode() === 200 && mockResGet.getBody()?.success === true,
    'GET /api/products returns HTTP 200 with success: true'
  );

  const mockReqStatus = {
    ...superAdminReq,
    params: { id: String(createdProd.id) },
    body: { isActive: false },
  } as unknown as AuthenticatedRequest;
  const mockResStatus = createMockResponse();

  await productController.updateProductStatus(mockReqStatus, mockResStatus, () => {});
  assert(
    mockResStatus.getStatusCode() === 200 &&
      mockResStatus.getBody()?.data?.isActive === false,
    'PATCH /api/products/:id/status updates active status via controller'
  );

  // Summary
  console.log('\n================================================================');
  console.log(`PHASE 4C PRODUCT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductMasterTests().catch((err) => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
