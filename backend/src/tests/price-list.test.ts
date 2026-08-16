/**
 * BINDU LIVE SALE APPLICATION — PHASE 4D: PRICE LIST MASTER TEST SUITE
 * Validates database-backed CRUD, unique price list codes, transactional item creation,
 * decimal monetary precision, validity date ranges, audit logging, and Super Admin authorization.
 */
import { priceListController } from '../controllers/priceList.controller.js';
import { priceListService, PriceListServiceError } from '../services/priceList.service.js';
import { requireRoles } from '../middleware/authorize.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';

async function runPriceListMasterTests() {
  console.log('================================================================');
  console.log('BINDU PHASE 4D: PRICE LIST MASTER TEST SUITE');
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
  console.log('--- 1. Role Authorization Checks for Price List Master ---');

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
  assert(superAdminAllowed, 'Super Admin role is granted access to Price List Master endpoints');

  let salesOfficerBlocked = false;
  const mockResSales = createMockResponse();
  requireRoles('Super Admin')(salesOfficerReq, mockResSales, () => {
    salesOfficerBlocked = false;
  });
  if (mockResSales.getStatusCode() === 403) salesOfficerBlocked = true;
  assert(salesOfficerBlocked, 'Sales Officer role is blocked with 403 Forbidden from Price List Master');

  let depotPersonBlocked = false;
  const mockResDepot = createMockResponse();
  requireRoles('Super Admin')(depotPersonReq, mockResDepot, () => {
    depotPersonBlocked = false;
  });
  if (mockResDepot.getStatusCode() === 403) depotPersonBlocked = true;
  assert(depotPersonBlocked, 'Depot Person role is blocked with 403 Forbidden from Price List Master');

  // =========================================================================
  // 2. RETRIEVAL TESTS
  // =========================================================================
  console.log('\n--- 2. Price List Retrieval Tests ---');

  const priceLists = await priceListService.getPriceLists();
  assert(Array.isArray(priceLists) && priceLists.length >= 2, 'Initial seeds return at least standard and wholesale price lists');

  const standardPl = await priceListService.getPriceListById('PL-STANDARD');
  assert(standardPl.code === 'PL-STANDARD', "Retrieved Price List by code 'PL-STANDARD'");
  assert(standardPl.items.length >= 5, `Standard price list has configured items (count=${standardPl.items.length})`);
  assert(typeof standardPl.items[0].rate === 'number', 'Item rate is formatted as numeric Decimal value');

  // Filter by active status
  const activeLists = await priceListService.getPriceLists({ isActive: true });
  assert(activeLists.every((pl) => pl.isActive === true), 'Filter by isActive=true returns only active price lists');

  // =========================================================================
  // 3. CREATION & VALIDATION TESTS
  // =========================================================================
  console.log('\n--- 3. Price List Creation & Validation Tests ---');

  const testCode = `PL-INSTITUTIONAL-${Date.now()}`;
  const createdPl = await priceListService.createPriceList(
    {
      code: testCode,
      name: 'Institutional Special Price List',
      description: 'Catering and institutional special rate matrix',
      currency: 'INR',
      validFrom: '2025-01-01',
      validTo: '2025-12-31',
      isActive: true,
      items: [
        { productId: 1, rate: 95.50, uom: 'Box' },
        { productId: 2, rate: 29.00, uom: 'Pcs' },
        { productId: 3, rate: 52.25, uom: 'Pcs' },
      ],
    },
    1
  );

  assert(createdPl.code === testCode, `Created price list with code ${testCode}`);
  assert(createdPl.itemCount === 3, 'Transactional creation populated 3 items');
  assert(createdPl.items[0].rate === 95.5, `Decimal rate precision correctly mapped (rate=${createdPl.items[0].rate})`);

  // Duplicate Code rejection
  let duplicateCodeBlocked = false;
  try {
    await priceListService.createPriceList({
      code: testCode,
      name: 'Duplicate Test',
      items: [],
    });
  } catch (err: any) {
    if (err.statusCode === 409 && err.code === 'DUPLICATE_PRICE_LIST_CODE') {
      duplicateCodeBlocked = true;
    }
  }
  assert(duplicateCodeBlocked, 'Duplicate price list code is rejected with HTTP 409 Conflict');

  // Duplicate product within same price list rejection
  let duplicateProductBlocked = false;
  try {
    await priceListService.createPriceList({
      code: `PL-DUP-PROD-${Date.now()}`,
      name: 'Duplicate Product Matrix',
      items: [
        { productId: 1, rate: 100 },
        { productId: 1, rate: 105 }, // Duplicate product 1
      ],
    });
  } catch (err: any) {
    if (err.statusCode === 409 && err.code === 'DUPLICATE_PRODUCT_IN_PRICE_LIST') {
      duplicateProductBlocked = true;
    }
  }
  assert(duplicateProductBlocked, 'Duplicate product within same price list rejected with HTTP 409');

  // Negative rate rejection
  let negativeRateBlocked = false;
  try {
    await priceListService.createPriceList({
      code: `PL-NEG-${Date.now()}`,
      name: 'Negative Rate Test',
      items: [{ productId: 1, rate: -50.0 }],
    });
  } catch (err: any) {
    if (err.statusCode === 400 && err.code === 'VALIDATION_ERROR') {
      negativeRateBlocked = true;
    }
  }
  assert(negativeRateBlocked, 'Negative item rate is rejected with HTTP 400 Validation Error');

  // Invalid date range rejection (validTo < validFrom)
  let invalidDateBlocked = false;
  try {
    await priceListService.createPriceList({
      code: `PL-DATE-${Date.now()}`,
      name: 'Invalid Date Range',
      validFrom: '2025-12-31',
      validTo: '2025-01-01', // Before validFrom
      items: [],
    });
  } catch (err: any) {
    if (err.statusCode === 400 && err.code === 'INVALID_VALIDITY_RANGE') {
      invalidDateBlocked = true;
    }
  }
  assert(invalidDateBlocked, 'Invalid date range (validTo < validFrom) rejected with HTTP 400');

  // =========================================================================
  // 4. ITEM RATE MUTATION & CONTROLLER INTEGRATION
  // =========================================================================
  console.log('\n--- 4. Item Rate Mutation & Controller Integration Tests ---');

  // Upsert single item rate
  const updatedItemPl = await priceListService.upsertItemRate(testCode, {
    productId: 1,
    rate: 98.75,
    uom: 'Box',
  }, 1);

  const modifiedItem = updatedItemPl.items.find((i) => i.productId === 1 || i.productCode === 'PROD-001');
  assert(modifiedItem?.rate === 98.75, `Single item rate successfully updated to 98.75 (rate=${modifiedItem?.rate})`);

  // Controller update status
  const mockStatusReq: AuthenticatedRequest = {
    params: { id: testCode },
    body: { isActive: false },
    user: { userId: 1, role: 'Super Admin', username: 'admin', loginId: 'admin' },
    headers: {},
  } as unknown as AuthenticatedRequest;

  const mockStatusRes = createMockResponse();
  await priceListController.updateStatus(mockStatusReq, mockStatusRes, () => {});
  assert(mockStatusRes.getStatusCode() === 200, 'Controller status update returns HTTP 200');
  const statusResBody = mockStatusRes.getBody();
  assert(statusResBody.data.isActive === false, 'Price list successfully deactivated via status endpoint');

  // Verify non-destructive status change (items still exist)
  assert(statusResBody.data.items.length === 3, 'Items remain preserved upon deactivation');

  // =========================================================================
  // 5. TEST SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`PRICE LIST MASTER TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPriceListMasterTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
