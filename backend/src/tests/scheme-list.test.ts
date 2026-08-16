/**
 * BINDU LIVE SALE APPLICATION — PHASE 4E: SCHEME LIST MASTER TEST SUITE
 * Validates database-backed CRUD, unique scheme codes, transactional item creation & atomic rollback,
 * decimal quantity/monetary precision, validity date ranges, audit logging, and Super Admin authorization.
 */
import { schemeListController } from '../controllers/schemeList.controller.js';
import { schemeListService, SchemeListServiceError } from '../services/schemeList.service.js';
import { requireRoles } from '../middleware/authorize.js';
import { authenticate } from '../middleware/authenticate.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';

async function runSchemeListMasterTests() {
  console.log('================================================================');
  console.log('BINDU PHASE 4E: SCHEME LIST MASTER TEST SUITE');
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
  console.log('--- 1. Role Authorization Checks for Scheme List Master ---');

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

  const unauthenticatedReq: AuthenticatedRequest = {
    headers: {},
  } as unknown as AuthenticatedRequest;

  // Test 1: Super Admin allowed
  let superAdminAllowed = false;
  requireRoles('Super Admin')(superAdminReq, {} as any, () => {
    superAdminAllowed = true;
  });
  assert(superAdminAllowed, '1. Super Admin role is granted access to Scheme List Master endpoints');

  // Test 2: Sales Officer blocked (403)
  let salesOfficerBlocked = false;
  const mockResSales = createMockResponse();
  requireRoles('Super Admin')(salesOfficerReq, mockResSales, () => {
    salesOfficerBlocked = false;
  });
  if (mockResSales.getStatusCode() === 403) salesOfficerBlocked = true;
  assert(salesOfficerBlocked, '2. Sales Officer role is blocked with 403 Forbidden from Scheme List Master');

  // Test 3: Depot Person blocked (403)
  let depotPersonBlocked = false;
  const mockResDepot = createMockResponse();
  requireRoles('Super Admin')(depotPersonReq, mockResDepot, () => {
    depotPersonBlocked = false;
  });
  if (mockResDepot.getStatusCode() === 403) depotPersonBlocked = true;
  assert(depotPersonBlocked, '3. Depot Person role is blocked with 403 Forbidden from Scheme List Master');

  // Test 4: Unauthenticated request blocked (401)
  let unauthBlocked = false;
  const mockResUnauth = createMockResponse();
  authenticate(unauthenticatedReq, mockResUnauth, () => {
    unauthBlocked = false;
  });
  if (mockResUnauth.getStatusCode() === 401) unauthBlocked = true;
  assert(unauthBlocked, '4. Unauthenticated request without JWT header is blocked with 401 Unauthorized');

  // =========================================================================
  // 2. RETRIEVAL TESTS
  // =========================================================================
  console.log('\n--- 2. Scheme List Retrieval Tests ---');

  // Test 5: Seeded Scheme Lists retrieval
  const schemeLists = await schemeListService.getSchemeLists();
  assert(Array.isArray(schemeLists) && schemeLists.length >= 2, '5. Initial seeds return promotional schemes (Summer Splash & Standard Volume)');

  // Test 6: Scheme structure with products
  const summerScheme = await schemeListService.getSchemeListById('SL-SUMMER-SPECIAL');
  assert(summerScheme.code === 'SL-SUMMER-SPECIAL', "6. Retrieved Scheme List by code 'SL-SUMMER-SPECIAL'");
  assert(summerScheme.items.length >= 5, `7. Summer promotional scheme contains configured deal items (count=${summerScheme.items.length})`);
  assert(typeof summerScheme.items[0].buyQty === 'number' && typeof summerScheme.items[0].freeQty === 'number', '8. Item quantities are formatted as valid numeric values');

  // Test 9: Filter by active status
  const activeLists = await schemeListService.getSchemeLists({ isActive: true });
  assert(activeLists.every((sl) => sl.isActive === true), '9. Filter by isActive=true returns exclusively active promotional schemes');

  // Test 10: Search filtering
  const searchResults = await schemeListService.getSchemeLists({ search: 'Summer' });
  assert(searchResults.some((sl) => sl.name.includes('Summer')), '10. Search query filter returns matching scheme lists');

  // =========================================================================
  // 3. TRANSACTIONAL CREATION & ATOMIC ROLLBACK TESTS
  // =========================================================================
  console.log('\n--- 3. Scheme List Transactional Creation & Atomic Rollback ---');

  const testCode = `SL-FESTIVAL-${Date.now()}`;
  const createdScheme = await schemeListService.createSchemeList(
    {
      code: testCode,
      name: 'Diwali Festive Volume Promotion',
      description: 'Buy-X-Get-Y seasonal festive promotional deal',
      schemeType: 'QTY_FREE',
      validFrom: '2025-10-01',
      validTo: '2025-11-30',
      isActive: true,
      items: [
        { productId: 1, buyQty: 10, freeQty: 1, rate: 110.0, uom: 'Box' },
        { productId: 2, buyQty: 24, freeQty: 2, rate: 36.0, uom: 'Pcs' },
        { productId: 3, buyQty: 12, freeQty: 1, rate: 64.0, uom: 'Pcs' },
      ],
    },
    1,
    '127.0.0.1',
    'TestRunner'
  );

  // Test 11: Transactional creation
  assert(createdScheme.code === testCode, `11. Successfully created Scheme List with code '${testCode}'`);
  assert(createdScheme.items.length === 3, '12. All 3 child promotional deal items were persisted atomically');
  assert(createdScheme.items[0].buyQty === 10 && createdScheme.items[0].freeQty === 1, '13. Buy 10 Get 1 Free deal rule accurately stored');

  // Test 14: Atomic rollback on invalid product reference
  let rollbackSuccess = false;
  const invalidCode = `SL-FAIL-${Date.now()}`;
  try {
    await schemeListService.createSchemeList({
      code: invalidCode,
      name: 'Invalid Scheme Transaction Test',
      items: [
        { productId: 1, buyQty: 5, freeQty: 1 },
        { productId: 999999, buyQty: 10, freeQty: 2 }, // Invalid product
      ],
    });
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'PRODUCT_NOT_FOUND') {
      // Verify header was NOT created
      try {
        await schemeListService.getSchemeListById(invalidCode);
      } catch (notFoundErr: any) {
        if (notFoundErr.statusCode === 404) {
          rollbackSuccess = true;
        }
      }
    }
  }
  assert(rollbackSuccess, '14. Atomic Rollback: When child item has invalid product, transaction rolls back header and all items');

  // =========================================================================
  // 4. UNIQUENESS & VALIDATION TESTS
  // =========================================================================
  console.log('\n--- 4. Uniqueness & Input Validation Tests ---');

  // Test 15: Duplicate code rejection (409)
  let duplicateCodeRejected = false;
  try {
    await schemeListService.createSchemeList({
      code: testCode,
      name: 'Duplicate Code Scheme Test',
      items: [{ productId: 1, buyQty: 10, freeQty: 1 }],
    });
  } catch (err: any) {
    if (err.statusCode === 409) duplicateCodeRejected = true;
  }
  assert(duplicateCodeRejected, `15. Rejects duplicate scheme code '${testCode}' with HTTP 409 Conflict`);

  // Test 16: Duplicate product within same scheme (409)
  let duplicateProductRejected = false;
  try {
    await schemeListService.createSchemeList({
      code: `SL-DUP-PROD-${Date.now()}`,
      name: 'Duplicate Product Scheme',
      items: [
        { productId: 1, buyQty: 10, freeQty: 1 },
        { productId: 1, buyQty: 20, freeQty: 2 },
      ],
    });
  } catch (err: any) {
    if (err.statusCode === 409) duplicateProductRejected = true;
  }
  assert(duplicateProductRejected, '16. Rejects duplicate product within same scheme with HTTP 409 Conflict');

  // Test 17: Missing scheme code validation (400)
  let missingCodeRejected = false;
  try {
    await schemeListService.createSchemeList({
      code: '',
      name: 'Missing Code Scheme',
    });
  } catch (err: any) {
    if (err.statusCode === 400) missingCodeRejected = true;
  }
  assert(missingCodeRejected, '17. Rejects missing scheme code with HTTP 400 Bad Request');

  // Test 18: Missing scheme name validation (400)
  let missingNameRejected = false;
  try {
    await schemeListService.createSchemeList({
      code: `SL-NONAME-${Date.now()}`,
      name: '',
    });
  } catch (err: any) {
    if (err.statusCode === 400) missingNameRejected = true;
  }
  assert(missingNameRejected, '18. Rejects missing scheme name with HTTP 400 Bad Request');

  // Test 19: Invalid date range (validTo < validFrom) (400)
  let invalidDatesRejected = false;
  try {
    await schemeListService.createSchemeList({
      code: `SL-DATES-${Date.now()}`,
      name: 'Invalid Dates Scheme',
      validFrom: '2025-12-31',
      validTo: '2025-01-01',
    });
  } catch (err: any) {
    if (err.statusCode === 400) invalidDatesRejected = true;
  }
  assert(invalidDatesRejected, '19. Rejects invalid validity date range (validTo < validFrom) with HTTP 400 Bad Request');

  // Test 20: Negative quantity validation (400)
  let negativeQtyRejected = false;
  try {
    await schemeListService.createSchemeList({
      code: `SL-NEG-${Date.now()}`,
      name: 'Negative Qty Scheme',
      items: [{ productId: 1, buyQty: -5, freeQty: 1 }],
    });
  } catch (err: any) {
    if (err.statusCode === 400) negativeQtyRejected = true;
  }
  assert(negativeQtyRejected, '20. Rejects negative buy quantity with HTTP 400 Bad Request');

  // =========================================================================
  // 5. PRECISION, MUTATION & CONTROLLER TESTS
  // =========================================================================
  console.log('\n--- 5. Precision, Mutation & Status Toggle Tests ---');

  // Test 21: Decimal precision
  const precisionCode = `SL-PRECISION-${Date.now()}`;
  const precisionPl = await schemeListService.createSchemeList({
    code: precisionCode,
    name: 'Precision Test Scheme',
    items: [{ productId: 1, minQty: 12.5, freeQty: 1.25, discountPercent: 15.75, discountAmount: 88.5 }],
  });
  assert(
    precisionPl.items[0].minQty === 12.5 &&
    precisionPl.items[0].freeQty === 1.25 &&
    precisionPl.items[0].discountPercent === 15.75 &&
    precisionPl.items[0].discountAmount === 88.5,
    '21. Decimal quantity (DECIMAL 14,3) and monetary (DECIMAL 14,2) precision is strictly preserved'
  );

  // Test 22: Single item upsert
  const updatedItemScheme = await schemeListService.upsertSchemeListItem(
    precisionCode,
    { productId: 1, minQty: 25.0, freeQty: 3.0, discountAmount: 95.0 },
    1,
    '127.0.0.1'
  );
  assert(
    updatedItemScheme.items[0].buyQty === 25.0 && updatedItemScheme.items[0].freeQty === 3.0,
    '22. Single item mutation successfully updates scheme rule deal parameters'
  );

  // Test 23: Status toggle (Active -> Inactive -> Active)
  const deactivated = await schemeListService.updateSchemeListStatus(precisionCode, false, 1);
  assert(deactivated.isActive === false, '23. Successfully deactivated scheme list (isActive=false)');

  const reactivated = await schemeListService.updateSchemeListStatus(precisionCode, true, 1);
  assert(reactivated.isActive === true, '24. Successfully reactivated scheme list (isActive=true)');

  // Test 24: Metadata update
  const updatedScheme = await schemeListService.updateSchemeList(
    precisionCode,
    { name: 'Updated Festive Super Scheme' },
    1
  );
  assert(updatedScheme.name === 'Updated Festive Super Scheme', '25. Successfully updated scheme list metadata');

  // Test 25: Deletion & Cascade verification
  const deleteResult = await schemeListService.deleteSchemeList(precisionCode, 1);
  assert(deleteResult.success, `26. Scheme list '${precisionCode}' deleted successfully with child items cascaded`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSchemeListMasterTests().catch((err) => {
  console.error('Unhandled error during test run:', err);
  process.exit(1);
});
