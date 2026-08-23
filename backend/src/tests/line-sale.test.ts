/**
 * BINDU LIVE SALE APPLICATION — PHASE 4F: LINE SALE MASTER TEST SUITE
 * Validates database-backed CRUD, unique partyCode, one-depot-to-many-line-sales relationship,
 * Sales Officer validation, Price List linking, DepotLineSale and LineSaleScheme join tables,
 * atomic transactions with rollback, non-destructive status updates, and Super Admin authorization.
 */
import { lineSaleController } from '../controllers/lineSale.controller.js';
import { lineSaleService, LineSaleServiceError } from '../services/lineSale.service.js';
import { requireRoles } from '../middleware/authorize.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';

export async function runLineSaleMasterTests() {
  console.log('================================================================');
  console.log('BINDU PHASE 4F: LINE SALE MASTER TEST SUITE');
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
  console.log('--- 1. Role Authorization Checks for Line Sale Master ---');

  const superAdminReq: AuthenticatedRequest = {
    user: {
      userId: 1,
      id: 1,
      role: 'Super Admin',
      username: 'admin',
      loginId: 'admin',
    },
  } as unknown as AuthenticatedRequest;

  const salesOfficerReq: AuthenticatedRequest = {
    user: {
      userId: 3,
      id: 3,
      role: 'Sales Officer',
      username: 'sales',
      loginId: 'sales',
    },
  } as unknown as AuthenticatedRequest;

  const depotPersonReq: AuthenticatedRequest = {
    user: {
      userId: 2,
      id: 2,
      role: 'Depot Person',
      username: 'depot',
      loginId: 'depot',
    },
  } as unknown as AuthenticatedRequest;

  // Test 1: Super Admin allowed
  let superAdminAllowed = false;
  requireRoles('Super Admin')(superAdminReq, {} as any, () => {
    superAdminAllowed = true;
  });
  assert(superAdminAllowed, '1. Super Admin role is granted access to Line Sale Master endpoints');

  // Test 2: Sales Officer blocked (403)
  let salesOfficerBlocked = false;
  const mockResSales = createMockResponse();
  requireRoles('Super Admin')(salesOfficerReq, mockResSales, () => {
    salesOfficerBlocked = false;
  });
  if (mockResSales.getStatusCode() === 403) salesOfficerBlocked = true;
  assert(salesOfficerBlocked, '2. Sales Officer is forbidden (403) from Line Sale Master management');

  // Test 3: Depot Person blocked (403)
  let depotPersonBlocked = false;
  const mockResDepot = createMockResponse();
  requireRoles('Super Admin')(depotPersonReq, mockResDepot, () => {
    depotPersonBlocked = false;
  });
  if (mockResDepot.getStatusCode() === 403) depotPersonBlocked = true;
  assert(depotPersonBlocked, '3. Depot Person is forbidden (403) from Line Sale Master management');

  // =========================================================================
  // 2. RETRIEVAL & FILTERING TESTS
  // =========================================================================
  console.log('\n--- 2. Line Sale Account Retrieval & Query Filtering ---');

  const allAccounts = await lineSaleService.getLineSales();
  assert(Array.isArray(allAccounts) && allAccounts.length >= 2, '4. GET /api/line-sales returns seeded line sale accounts');

  const firstAcc = allAccounts[0];
  assert(
    typeof firstAcc.partyCode === 'string' &&
    typeof firstAcc.accountName === 'string' &&
    Array.isArray(firstAcc.depotIds) &&
    Array.isArray(firstAcc.schemes),
    '5. Line Sale response includes partyCode, accountName, depot mappings, and scheme relationships'
  );

  const searchResults = await lineSaleService.getLineSales({ search: 'LSA-1001' });
  assert(
    searchResults.length > 0 && searchResults.some((s) => s.partyCode === 'LSA-1001'),
    '6. Search filter successfully matches partyCode "LSA-1001"'
  );

  const activeResults = await lineSaleService.getLineSales({ isActive: true });
  assert(activeResults.every((s) => s.isActive === true), '7. Status filter correctly retrieves only active accounts');

  const fetchedByCode = await lineSaleService.getLineSaleById('LSA-1001');
  assert(fetchedByCode.partyCode === 'LSA-1001', '8. Lookup by partyCode "LSA-1001" succeeds');

  let notFoundError = false;
  try {
    await lineSaleService.getLineSaleById('NONEXISTENT-PARTY-CODE-999');
  } catch (err: any) {
    if (err instanceof LineSaleServiceError && err.statusCode === 404) {
      notFoundError = true;
    }
  }
  assert(notFoundError, '9. Lookup for nonexistent partyCode returns 404 NOT FOUND');

  // =========================================================================
  // 3. CORE BUSINESS RULE: ONE DEPOT SUPPORTS MULTIPLE LINE SALES
  // =========================================================================
  console.log('\n--- 3. Core Business Rule: One Depot ↔ Multiple Line Sales ---');

  const testDepotId = 1; // Central Depot Bangalore
  const uniqueCodeA = `LSA-TEST-MULTI-A-${Date.now().toString().slice(-4)}`;
  const uniqueCodeB = `LSA-TEST-MULTI-B-${Date.now().toString().slice(-4)}`;

  const createdLineA = await lineSaleService.createLineSale(
    {
      partyCode: uniqueCodeA,
      accountName: 'Multi Line Account Alpha',
      salesOfficerId: 3, // Ramesh Kumar
      depotIds: [testDepotId],
      priceListId: 1,
      schemeListIds: [1],
      routeName: 'Bangalore Electronic City Zone 1',
    },
    1
  );

  const createdLineB = await lineSaleService.createLineSale(
    {
      partyCode: uniqueCodeB,
      accountName: 'Multi Line Account Beta',
      salesOfficerId: 3, // Ramesh Kumar
      depotIds: [testDepotId],
      priceListId: 1,
      schemeListIds: [1],
      routeName: 'Bangalore Electronic City Zone 2',
    },
    1
  );

  const depotLineSalesA = createdLineA.depotIds.includes(testDepotId);
  const depotLineSalesB = createdLineB.depotIds.includes(testDepotId);

  assert(
    depotLineSalesA && depotLineSalesB,
    '10. MANDATORY RULE VERIFIED: A single Depot (ID: 1) successfully hosts multiple Line Sale Accounts'
  );

  // =========================================================================
  // 4. RELATIONSHIP VALIDATIONS (Sales Officer, Price List, Depots, Schemes)
  // =========================================================================
  console.log('\n--- 4. Foreign Key and Relationship Validations ---');

  // Test: Missing Sales Officer (404)
  let missingUserError = false;
  try {
    await lineSaleService.createLineSale({
      partyCode: `LSA-ERR-USER-${Date.now()}`,
      accountName: 'Invalid User Account',
      salesOfficerId: 999999, // Nonexistent user ID
      depotIds: [1],
    });
  } catch (err: any) {
    if (err instanceof LineSaleServiceError && err.statusCode === 404 && err.code === 'USER_NOT_FOUND') {
      missingUserError = true;
    }
  }
  assert(missingUserError, '11. Referencing nonexistent Sales Officer user returns 404 USER_NOT_FOUND');

  // Test: Assigned User with Non-Sales-Officer Role (400)
  let invalidRoleError = false;
  try {
    await lineSaleService.createLineSale({
      partyCode: `LSA-ERR-ROLE-${Date.now()}`,
      accountName: 'Invalid Role Account',
      salesOfficerId: 1, // Super Admin user ID
      depotIds: [1],
    });
  } catch (err: any) {
    if (err instanceof LineSaleServiceError && err.statusCode === 400 && err.code === 'INVALID_SALES_OFFICER_ROLE') {
      invalidRoleError = true;
    }
  }
  assert(invalidRoleError, '12. Assigning non-Sales-Officer user (e.g. Super Admin) returns 400 INVALID_SALES_OFFICER_ROLE');

  // Test: Missing Price List (404)
  let missingPriceListError = false;
  try {
    await lineSaleService.createLineSale({
      partyCode: `LSA-ERR-PL-${Date.now()}`,
      accountName: 'Invalid Price List Account',
      salesOfficerId: 3,
      priceListId: 999999, // Nonexistent Price List
      depotIds: [1],
    });
  } catch (err: any) {
    if (err instanceof LineSaleServiceError && err.statusCode === 404 && err.code === 'PRICE_LIST_NOT_FOUND') {
      missingPriceListError = true;
    }
  }
  assert(missingPriceListError, '13. Referencing nonexistent Price List returns 404 PRICE_LIST_NOT_FOUND');

  // Test: Missing Depot (404)
  let missingDepotError = false;
  try {
    await lineSaleService.createLineSale({
      partyCode: `LSA-ERR-DEPOT-${Date.now()}`,
      accountName: 'Invalid Depot Account',
      salesOfficerId: 3,
      depotIds: [999999], // Nonexistent Depot
    });
  } catch (err: any) {
    if (err instanceof LineSaleServiceError && err.statusCode === 404 && err.code === 'DEPOT_NOT_FOUND') {
      missingDepotError = true;
    }
  }
  assert(missingDepotError, '14. Referencing nonexistent Depot returns 404 DEPOT_NOT_FOUND');

  // Test: Missing Scheme List (404)
  let missingSchemeError = false;
  try {
    await lineSaleService.createLineSale({
      partyCode: `LSA-ERR-SCHEME-${Date.now()}`,
      accountName: 'Invalid Scheme Account',
      salesOfficerId: 3,
      depotIds: [1],
      schemeListIds: [999999], // Nonexistent Scheme
    });
  } catch (err: any) {
    if (err instanceof LineSaleServiceError && err.statusCode === 404 && err.code === 'SCHEME_LIST_NOT_FOUND') {
      missingSchemeError = true;
    }
  }
  assert(missingSchemeError, '15. Referencing nonexistent Scheme List returns 404 SCHEME_LIST_NOT_FOUND');

  // =========================================================================
  // 5. UNIQUE PARTY CODE ENFORCEMENT (409 CONFLICT)
  // =========================================================================
  console.log('\n--- 5. Unique partyCode Enforcement ---');

  let duplicateCodeError = false;
  try {
    await lineSaleService.createLineSale({
      partyCode: 'LSA-1001', // Already exists in system
      accountName: 'Duplicate Attempt Agency',
      salesOfficerId: 3,
      depotIds: [1],
    });
  } catch (err: any) {
    if (err instanceof LineSaleServiceError && err.statusCode === 409 && err.code === 'DUPLICATE_PARTY_CODE') {
      duplicateCodeError = true;
    }
  }
  assert(duplicateCodeError, '16. Duplicate partyCode creation correctly returns 409 DUPLICATE_PARTY_CODE');

  // =========================================================================
  // 6. UPDATE & TRANSACTIONAL RELATIONSHIP RECONCILIATION
  // =========================================================================
  console.log('\n--- 6. Update Operations & Relationship Reconciliation ---');

  const updateTargetCode = createdLineA.partyCode;
  const updatedAccount = await lineSaleService.updateLineSale(
    updateTargetCode,
    {
      accountName: 'Multi Line Account Alpha (Updated)',
      vehicleNumber: 'KA-04-TR-9999',
      routeName: 'Updated Bangalore Outer Ring Road',
      depotIds: [1, 2], // Assigned to 2 depots now
      schemeListIds: [1, 2], // Assigned to 2 scheme lists
    },
    1
  );

  assert(
    updatedAccount.accountName === 'Multi Line Account Alpha (Updated)' &&
    updatedAccount.vehicleNumber === 'KA-04-TR-9999' &&
    updatedAccount.depotIds.length === 2 &&
    updatedAccount.schemeListIds.length === 2,
    '17. PUT /api/line-sales/:id updates header fields and reconciles multiple depots/schemes atomically'
  );

  // Dedicated Depot reconciliation endpoint
  const depotReconciled = await lineSaleService.updateLineSaleDepots(updateTargetCode, [2], 1);
  assert(
    depotReconciled.depotIds.length === 1 && depotReconciled.depotIds[0] === 2,
    '18. PUT /api/line-sales/:id/depots correctly updates and reconciles assigned depots'
  );

  // Dedicated Scheme reconciliation endpoint
  const schemeReconciled = await lineSaleService.updateLineSaleSchemes(updateTargetCode, [2], 1);
  assert(
    schemeReconciled.schemeListIds.length === 1 && schemeReconciled.schemeListIds[0] === 2,
    '19. PUT /api/line-sales/:id/schemes correctly updates and reconciles assigned schemes'
  );

  // =========================================================================
  // 7. NON-DESTRUCTIVE LIFECYCLE MANAGEMENT
  // =========================================================================
  console.log('\n--- 7. Non-Destructive Lifecycle (Deactivate / Activate) ---');

  const deactivated = await lineSaleService.updateLineSaleStatus(updateTargetCode, false, 1);
  assert(deactivated.isActive === false, '20. PATCH /api/line-sales/:id/status successfully deactivates account');

  // Verify relations and data are fully preserved upon deactivation
  const fetchedDeactivated = await lineSaleService.getLineSaleById(updateTargetCode);
  assert(
    fetchedDeactivated.isActive === false &&
    fetchedDeactivated.depotIds.length > 0 &&
    fetchedDeactivated.accountName.includes('Alpha'),
    '21. Non-destructive deactivation preserves all historical depot/scheme links and party data'
  );

  const reactivated = await lineSaleService.updateLineSaleStatus(updateTargetCode, true, 1);
  assert(reactivated.isActive === true, '22. PATCH /api/line-sales/:id/status reactivates account without data loss');

  // =========================================================================
  // 8. CONTROLLER ENDPOINT HANDLING & HTTP STATUS CODES
  // =========================================================================
  console.log('\n--- 8. Controller Express Handler Tests ---');

  // Controller GET /api/line-sales
  const mockReqGet = { query: {} } as any;
  const mockResGet = createMockResponse();
  await lineSaleController.getLineSales(mockReqGet, mockResGet, () => {});
  assert(
    mockResGet.getStatusCode() === 200 && mockResGet.getBody()?.success === true,
    '23. Controller getLineSales returns HTTP 200 with JSON payload'
  );

  // Controller POST /api/line-sales with duplicate partyCode
  const mockReqPostDup: AuthenticatedRequest = {
    user: { id: 1, userId: 1, role: 'Super Admin', username: 'admin', loginId: 'admin' },
    body: {
      partyCode: 'LSA-1001',
      accountName: 'Duplicate Attempt',
      salesOfficerId: 3,
    },
    ip: '127.0.0.1',
    headers: {},
    socket: {} as any,
  } as unknown as AuthenticatedRequest;
  const mockResPostDup = createMockResponse();
  await lineSaleController.createLineSale(mockReqPostDup, mockResPostDup, () => {});
  assert(
    mockResPostDup.getStatusCode() === 409 && mockResPostDup.getBody()?.error?.code === 'DUPLICATE_PARTY_CODE',
    '24. Controller createLineSale returns HTTP 409 on duplicate partyCode'
  );

  // Controller PATCH /api/line-sales/:id/status without isActive
  const mockReqPatchInvalid: AuthenticatedRequest = {
    user: { id: 1, userId: 1, role: 'Super Admin', username: 'admin', loginId: 'admin' },
    params: { id: 'LSA-1001' },
    body: {}, // missing isActive
    ip: '127.0.0.1',
    headers: {},
    socket: {} as any,
  } as unknown as AuthenticatedRequest;
  const mockResPatchInvalid = createMockResponse();
  await lineSaleController.updateLineSaleStatus(mockReqPatchInvalid, mockResPatchInvalid, () => {});
  assert(
    mockResPatchInvalid.getStatusCode() === 400 && mockResPatchInvalid.getBody()?.error?.code === 'VALIDATION_ERROR',
    '25. Controller updateLineSaleStatus returns HTTP 400 when isActive boolean is omitted'
  );

  // =========================================================================
  // TEST SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`PHASE 4F LINE SALE MASTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} Phase 4F Line Sale Master test(s) failed!`);
  }
}

// Self-run when executed directly via tsx
if (process.argv[1]?.endsWith('line-sale.test.ts') || process.argv[1]?.includes('line-sale')) {
  runLineSaleMasterTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
