/**
 * BINDU LIVE SALE APPLICATION — PHASE 5: GOODS ISSUE / VAN LOADING TEST SUITE
 * Validates database-backed transactional Goods Issue creation, Depot-LineSale mapping,
 * historical rate resolution from Price Lists, Decimal arithmetic, duplicate item prevention,
 * audit logging, non-destructive lifecycle status transitions, and role-based access control.
 */
import { goodsIssueController } from '../controllers/goodsIssue.controller.js';
import { goodsIssueService, GoodsIssueServiceError } from '../services/goodsIssue.service.js';
import { requireRoles } from '../middleware/authorize.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';

export async function runGoodsIssueTests() {
  console.log('================================================================');
  console.log('BINDU PHASE 5: GOODS ISSUE / VAN LOADING TEST SUITE');
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
  console.log('--- 1. Role Authorization Checks for Goods Issue ---');

  const superAdminReq: AuthenticatedRequest = {
    user: {
      userId: 1,
      id: 1,
      role: 'Super Admin',
      username: 'admin',
      loginId: 'admin',
    },
  } as unknown as AuthenticatedRequest;

  const depotPersonReq: AuthenticatedRequest = {
    user: {
      userId: 2,
      id: 2,
      role: 'Depot Person',
      username: 'depot',
      loginId: 'depot',
      depotId: 1,
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

  const anonymousReq: AuthenticatedRequest = {} as unknown as AuthenticatedRequest;

  // Test: Super Admin can create Goods Issue
  {
    const res = createMockResponse();
    let nextCalled = false;
    const authMw = requireRoles('Super Admin', 'Depot Person');
    authMw(superAdminReq, res, () => {
      nextCalled = true;
    });
    assert(nextCalled, 'Super Admin is authorized for Goods Issue creation');
  }

  // Test: Depot Person can create Goods Issue
  {
    const res = createMockResponse();
    let nextCalled = false;
    const authMw = requireRoles('Super Admin', 'Depot Person');
    authMw(depotPersonReq, res, () => {
      nextCalled = true;
    });
    assert(nextCalled, 'Depot Person is authorized for Goods Issue creation');
  }

  // Test: Sales Officer cannot create Goods Issue (Forbidden)
  {
    const res = createMockResponse();
    let nextCalled = false;
    const authMw = requireRoles('Super Admin', 'Depot Person');
    authMw(salesOfficerReq, res, () => {
      nextCalled = true;
    });
    assert(!nextCalled && res.getStatusCode() === 403, 'Sales Officer is forbidden (403) from Goods Issue creation');
  }

  // Test: Sales Officer can read Goods Issue
  {
    const res = createMockResponse();
    let nextCalled = false;
    const readMw = requireRoles('Super Admin', 'Depot Person', 'Sales Officer');
    readMw(salesOfficerReq, res, () => {
      nextCalled = true;
    });
    assert(nextCalled, 'Sales Officer is authorized to read Goods Issue vouchers');
  }

  // Test: Anonymous request is rejected
  {
    const res = createMockResponse();
    let nextCalled = false;
    const authMw = requireRoles('Super Admin', 'Depot Person');
    authMw(anonymousReq, res, () => {
      nextCalled = true;
    });
    assert(!nextCalled && res.getStatusCode() === 401, 'Unauthenticated request is rejected with 401');
  }

  // =========================================================================
  // 2. VALIDATION & INTEGRITY TESTS
  // =========================================================================
  console.log('\n--- 2. Business Validation & Relational Integrity Tests ---');

  // Test: Reject creation when Depot does not exist (404)
  {
    let errorCaught = false;
    try {
      await goodsIssueService.createGoodsIssue({
        depotId: 99999,
        lineSaleId: 1,
        items: [{ productId: 1, quantity: 10 }],
      }, superAdminReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(err.statusCode === 404 && err.code === 'DEPOT_NOT_FOUND', 'Rejects non-existent Depot with 404 DEPOT_NOT_FOUND');
    }
    if (!errorCaught) assert(false, 'Should reject non-existent Depot');
  }

  // Test: Reject creation when Line Sale does not exist (404)
  {
    let errorCaught = false;
    try {
      await goodsIssueService.createGoodsIssue({
        depotId: 1,
        lineSaleId: 99999,
        items: [{ productId: 1, quantity: 10 }],
      }, superAdminReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(err.statusCode === 404 && err.code === 'LINE_SALE_NOT_FOUND', 'Rejects non-existent Line Sale with 404 LINE_SALE_NOT_FOUND');
    }
    if (!errorCaught) assert(false, 'Should reject non-existent Line Sale');
  }

  // Test: CRITICAL: Reject Line Sale NOT mapped to selected Depot (400)
  {
    let errorCaught = false;
    try {
      // LineSale 2 is mapped to Depot 2, NOT Depot 1
      await goodsIssueService.createGoodsIssue({
        depotId: 1,
        lineSaleId: 2,
        items: [{ productId: 1, quantity: 10 }],
      }, superAdminReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(
        err.statusCode === 400 && err.code === 'LINE_SALE_NOT_MAPPED_TO_DEPOT',
        'Rejects unmapped Depot-LineSale pair with 400 LINE_SALE_NOT_MAPPED_TO_DEPOT'
      );
    }
    if (!errorCaught) assert(false, 'Should enforce Depot <-> Line Sale mapping validation');
  }

  // Test: Reject creation with empty items array
  {
    let errorCaught = false;
    try {
      await goodsIssueService.createGoodsIssue({
        depotId: 1,
        lineSaleId: 1,
        items: [],
      }, superAdminReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(err.statusCode === 400 && err.code === 'EMPTY_ITEMS', 'Rejects Goods Issue with empty items array (400)');
    }
    if (!errorCaught) assert(false, 'Should reject empty items');
  }

  // Test: Reject duplicate products in the same Goods Issue payload
  {
    let errorCaught = false;
    try {
      await goodsIssueService.createGoodsIssue({
        depotId: 1,
        lineSaleId: 1,
        items: [
          { productId: 1, quantity: 10 },
          { productId: 1, quantity: 5 }, // Duplicate product 1
        ],
      }, superAdminReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(
        err.statusCode === 400 && err.code === 'DUPLICATE_PRODUCT_ITEM',
        'Rejects duplicate product in items list with 400 DUPLICATE_PRODUCT_ITEM'
      );
    }
    if (!errorCaught) assert(false, 'Should prevent duplicate products in same issue');
  }

  // Test: Reject zero or negative quantity
  {
    let errorCaught = false;
    try {
      await goodsIssueService.createGoodsIssue({
        depotId: 1,
        lineSaleId: 1,
        items: [{ productId: 1, quantity: -5 }],
      }, superAdminReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(err.statusCode === 400 && err.code === 'INVALID_QUANTITY', 'Rejects negative quantity with 400 INVALID_QUANTITY');
    }
    if (!errorCaught) assert(false, 'Should reject negative quantity');
  }

  // Test: Reject negative starting meter reading
  {
    let errorCaught = false;
    try {
      await goodsIssueService.createGoodsIssue({
        depotId: 1,
        lineSaleId: 1,
        startingMeterReading: -100,
        items: [{ productId: 1, quantity: 10 }],
      }, superAdminReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(err.statusCode === 400 && err.code === 'INVALID_METER_READING', 'Rejects negative meter reading with 400 INVALID_METER_READING');
    }
    if (!errorCaught) assert(false, 'Should reject negative meter reading');
  }

  // =========================================================================
  // 3. TRANSACTIONAL CREATION & HISTORICAL RATE CAPTURE TESTS
  // =========================================================================
  console.log('\n--- 3. Transactional Creation & Historical Rate Resolution Tests ---');

  let createdIssueDocId = '';
  let createdIssueNumericId = 0;

  {
    const payload = {
      depotId: 1,
      lineSaleId: 1,
      vehicleNumber: 'KA-01-EV-4090',
      driverName: 'Ramesh Kumar',
      startingMeterReading: 13000.50,
      remarks: 'Morning route dispatch for South Bangalore',
      items: [
        { productId: 1, quantity: 20 }, // Price list rate = 110.00 -> Amount = 2200.00
        { productId: 2, quantity: 50 }, // Price list rate = 36.00 -> Amount = 1800.00
      ],
    };

    const created = await goodsIssueService.createGoodsIssue(payload, depotPersonReq.user);

    assert(created.id > 0, 'Goods Issue created with generated numeric ID');
    assert(Boolean(created.documentId && created.documentId.startsWith('GI-')), 'Document ID formatted with GI- prefix');
    assert(created.itemCount === 2, 'Item count equals 2');
    assert(created.totalQuantity === 70, 'Total quantity calculated accurately (20 + 50 = 70)');
    assert(created.totalAmount === 4000.00, 'Total amount accurately calculated with Decimal precision (2200 + 1800 = 4000)');

    // Historical Rate Verification
    const item1 = created.items.find((i) => i.productId === 1);
    const item2 = created.items.find((i) => i.productId === 2);

    assert(item1 !== undefined && item1.rate === 110.00, 'Item 1 captured historical Price List rate (110.00)');
    assert(item1 !== undefined && item1.amount === 2200.00, 'Item 1 amount accurately calculated (20 * 110 = 2200.00)');
    assert(item2 !== undefined && item2.rate === 36.00, 'Item 2 captured historical Price List rate (36.00)');
    assert(item2 !== undefined && item2.amount === 1800.00, 'Item 2 amount accurately calculated (50 * 36 = 1800.00)');
    assert(created.status === 'ISSUED', 'Default transaction status set to ISSUED');

    createdIssueDocId = created.documentId;
    createdIssueNumericId = created.id;
  }

  // =========================================================================
  // 4. RETRIEVAL & FILTERING TESTS
  // =========================================================================
  console.log('\n--- 4. Retrieval and Filter Tests ---');

  // Test: Get by document ID
  {
    const fetched = await goodsIssueService.getGoodsIssueById(createdIssueDocId);
    assert(fetched.documentId === createdIssueDocId, 'Successfully retrieved Goods Issue by document ID');
    assert(fetched.depot !== null && fetched.depot.code === 'DEPOT-BLR-01', 'Depot relation included in response');
    assert(fetched.lineSale !== null && fetched.lineSale.partyCode === 'LSA-1001', 'Line Sale relation included in response');
    assert(fetched.lineSale?.salesOfficer?.employeeName === 'Ramesh Kumar', 'Sales Officer details included in response');
  }

  // Test: List all Goods Issues
  {
    const list = await goodsIssueService.getGoodsIssues({});
    assert(list.length >= 3, `List returns all goods issues (count: ${list.length})`);
  }

  // Test: Filter by status
  {
    const issuedList = await goodsIssueService.getGoodsIssues({ status: 'ISSUED' });
    const allIssued = issuedList.every((gi) => gi.status === 'ISSUED');
    assert(allIssued && issuedList.length > 0, 'Status filter correctly returns only ISSUED records');
  }

  // Test: Filter by Depot ID
  {
    const depotList = await goodsIssueService.getGoodsIssues({ depotId: 1 });
    const allDepot1 = depotList.every((gi) => gi.depotId === 1);
    assert(allDepot1, 'Depot filter returns only records for Depot 1');
  }

  // =========================================================================
  // 5. UPDATE METADATA & STATUS LIFECYCLE TESTS
  // =========================================================================
  console.log('\n--- 5. Lifecycle Transitions and Finalized Protection ---');

  // Test: Update remarks and meter readings on unfinalized record
  {
    const updated = await goodsIssueService.updateGoodsIssue(createdIssueNumericId, {
      remarks: 'Updated dispatch notes with route confirmation',
      startingMeterReading: 13005.00,
    }, depotPersonReq.user);

    assert(updated.remarks === 'Updated dispatch notes with route confirmation', 'Remarks updated successfully');
    assert(updated.startingMeterReading === 13005.00, 'Starting meter reading updated successfully');
  }

  // Test: Update status to COMPLETED
  {
    const statusUpdated = await goodsIssueService.updateGoodsIssueStatus(
      createdIssueNumericId,
      'COMPLETED',
      depotPersonReq.user
    );

    assert(statusUpdated.status === 'COMPLETED', 'Status transitioned to COMPLETED successfully');
  }

  // Test: Protected finalized record cannot be arbitrarily mutated
  {
    let errorCaught = false;
    try {
      await goodsIssueService.updateGoodsIssue(createdIssueNumericId, {
        vehicleNumber: 'KA-05-9999',
      }, depotPersonReq.user);
    } catch (err: any) {
      errorCaught = true;
      assert(
        err.statusCode === 400 && err.code === 'CANNOT_MODIFY_FINALIZED_GOODS_ISSUE',
        'Modifying finalized (COMPLETED) Goods Issue rejected with 400 CANNOT_MODIFY_FINALIZED_GOODS_ISSUE'
      );
    }
    if (!errorCaught) assert(false, 'Should prevent modification of finalized records');
  }

  // =========================================================================
  // 6. CONTROLLER / HTTP ENDPOINT INTEGRATION TESTS
  // =========================================================================
  console.log('\n--- 6. HTTP Controller Endpoint Integration Tests ---');

  // Test: POST /api/goods-issues via Controller
  {
    const req = {
      body: {
        depotId: 1,
        lineSaleId: 1,
        vehicleNumber: 'KA-01-EV-4090',
        driverName: 'Ramesh Kumar',
        startingMeterReading: 13100,
        items: [{ productId: 1, quantity: 15 }],
      },
      user: depotPersonReq.user,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'TestRunner' },
    } as unknown as AuthenticatedRequest;

    const res = createMockResponse();
    let nextCalled = false;

    await goodsIssueController.createGoodsIssue(req, res, () => {
      nextCalled = true;
    });

    assert(res.getStatusCode() === 201, 'POST /api/goods-issues returns 201 Created');
    const body = res.getBody();
    assert(body && body.success === true && body.data.id > 0, 'Controller response contains created Goods Issue data');
  }

  // Test: GET /api/goods-issues via Controller
  {
    const req = {
      query: { depotId: '1' },
      user: superAdminReq.user,
    } as unknown as AuthenticatedRequest;

    const res = createMockResponse();
    await goodsIssueController.getGoodsIssues(req, res, () => {});

    assert(res.getStatusCode() === 200, 'GET /api/goods-issues returns 200 OK');
    const body = res.getBody();
    assert(body && body.success === true && Array.isArray(body.data), 'Controller returns list of Goods Issues');
  }

  // =========================================================================
  // TEST SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`GOODS ISSUE TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Execute tests if invoked directly
runGoodsIssueTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
