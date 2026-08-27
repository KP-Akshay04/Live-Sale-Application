/**
 * BINDU LIVE SALE APPLICATION — PHASE 6: GOODS RETURN / RECONCILIATION TEST SUITE
 *
 * Validates:
 * - Authentication / role authorization
 * - Goods Issue → Goods Return relational integrity
 * - Sales Officer ownership restriction
 * - Quantity reconciliation rules
 * - Duplicate Goods Return protection
 * - Transactional persistence
 * - Decimal quantity/rate precision
 * - Document ID generation
 * - Database retrieval
 * - Filtering
 * - Header and item updates
 * - Status lifecycle
 * - Audit logging
 * - Source Goods Issue completion
 * - HTTP controller integration
 *
 * IMPORTANT:
 * This test suite creates its own clean Goods Issue fixture through the
 * real GoodsIssueService. It does not depend on pre-existing Goods Issue
 * records, making the suite repeatable across test runs.
 */

import { goodsReturnController } from '../controllers/goodsReturn.controller.js';
import {
  goodsReturnService,
  GoodsReturnServiceError,
} from '../services/goodsReturn.service.js';
import {
  goodsIssueService,
  GoodsIssueServiceError,
} from '../services/goodsIssue.service.js';
import { requireRoles } from '../middleware/authorize.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';
import { prisma } from '../config/database.js';

export async function runGoodsReturnTests() {
  console.log('================================================================');
  console.log('BINDU PHASE 6: GOODS RETURN / RECONCILIATION TEST SUITE');
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
    } as unknown as Response & {
      getStatusCode: () => number;
      getBody: () => any;
    };

    return res;
  }

  // =========================================================================
  // TEST USERS
  // =========================================================================

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

  const anonymousReq: AuthenticatedRequest =
    {} as unknown as AuthenticatedRequest;

  // =========================================================================
  // 1. AUTHORIZATION
  // =========================================================================

  console.log('--- 1. Role Authorization Checks for Goods Return ---');

  {
    const res = createMockResponse();
    let nextCalled = false;

    const authMw = requireRoles(
      'Super Admin',
      'Depot Person',
      'Sales Officer'
    );

    authMw(superAdminReq, res, () => {
      nextCalled = true;
    });

    assert(
      nextCalled,
      'Super Admin is authorized for Goods Return operations'
    );
  }

  {
    const res = createMockResponse();
    let nextCalled = false;

    const authMw = requireRoles(
      'Super Admin',
      'Depot Person',
      'Sales Officer'
    );

    authMw(depotPersonReq, res, () => {
      nextCalled = true;
    });

    assert(
      nextCalled,
      'Depot Person is authorized for Goods Return operations'
    );
  }

  {
    const res = createMockResponse();
    let nextCalled = false;

    const authMw = requireRoles(
      'Super Admin',
      'Depot Person',
      'Sales Officer'
    );

    authMw(salesOfficerReq, res, () => {
      nextCalled = true;
    });

    assert(
      nextCalled,
      'Sales Officer is authorized at authenticated route layer'
    );
  }

  {
    const res = createMockResponse();
    let nextCalled = false;

    const authMw = requireRoles(
      'Super Admin',
      'Depot Person',
      'Sales Officer'
    );

    authMw(anonymousReq, res, () => {
      nextCalled = true;
    });

    assert(
      !nextCalled && res.getStatusCode() === 401,
      'Unauthenticated Goods Return request is rejected with 401'
    );
  }

  // =========================================================================
  // 2. CREATE CLEAN SOURCE GOODS ISSUE FIXTURE
  // =========================================================================

  console.log('\n--- 2. Clean Goods Issue Fixture Creation ---');

  let createdGoodsIssueId: number | null = null;
  let createdGoodsIssueDocumentId: string | null = null;
  let sourceIssue: any = null;
  let issueItem: any = null;

  const fixtureDocumentId = `GI-PHASE6-${Date.now()}`;

  let fixture;

  try {
    fixture = await goodsIssueService.createGoodsIssue(
      {
        documentId: fixtureDocumentId,
        depotId: 1,
        lineSaleId: 1,
        vehicleNumber: 'PHASE6-TEST-VEHICLE',
        driverName: 'PHASE 6 TEST DRIVER',
        startingMeterReading: 1200.25,
        status: 'ISSUED',
        remarks: 'PHASE 6 AUTOMATED TEST FIXTURE',
        items: [
          {
            productId: 1,
            quantity: 20,
            uom: 'Box',
            rate: 110,
          },
        ],
      },
      superAdminReq.user,
      '127.0.0.1',
      'Phase6Fixture'
    );
  } catch (err: any) {
    if (err instanceof GoodsIssueServiceError) {
      throw new Error(
        `Unable to create Phase 6 Goods Issue fixture: ${err.code} - ${err.message}`
      );
    }
    throw err;
  }

  createdGoodsIssueId = fixture.goodsIssueId;
  createdGoodsIssueDocumentId = fixture.documentId;

  sourceIssue = await prisma.goodsIssue.findUnique({
    where: { id: fixture.goodsIssueId },
    include: {
      items: true,
      lineSale: {
        include: {
          salesOfficer: {
            include: { role: true },
          },
        },
      },
      depot: true,
    },
  });

  assert(
    !!sourceIssue,
    `Created clean Goods Issue ${fixture.documentId}`
  );

  if (!sourceIssue) {
    throw new Error('Phase 6 fixture Goods Issue could not be retrieved.');
  }

  issueItem = sourceIssue.items.find(
    (item: any) => Number(item.quantity) > 0
  );

  assert(
    sourceIssue.items.length === 1,
    `Fixture Goods Issue contains ${sourceIssue.items.length} item(s)`
  );

  assert(
    !!issueItem,
    'Fixture Goods Issue contains a positive-quantity item'
  );

  if (!issueItem) {
    throw new Error('Phase 6 fixture Goods Issue has no usable item.');
  }

  assert(
    Number(issueItem.quantity) === 20,
    'Fixture Goods Issue item quantity is 20'
  );

  assert(
    Number(issueItem.rate) === 110,
    'Fixture Goods Issue item rate is 110.00'
  );

  console.log(`  [INFO] Using clean Goods Issue ${sourceIssue.documentId}`);
  console.log(`  [INFO] Source Sales Officer ID: ${sourceIssue.lineSale.salesOfficerId}`);
  console.log(`  [INFO] Test Goods Issue Item ID: ${issueItem.id}`);

  // =========================================================================
  // COMMON TEST VALUES
  // =========================================================================

  const issuedQuantity = Number(issueItem.quantity);
  const testRate = Number(issueItem.rate);

  let createdGoodsReturnId: number | null = null;
  let createdGoodsReturnDocumentId: string | null = null;

  async function cleanupTestData() {
    try {
      if (createdGoodsReturnId) {
        await prisma.auditLog.deleteMany({
          where: {
            entityType: 'GoodsReturn',
            entityId: createdGoodsReturnDocumentId || undefined,
          },
        });

        await prisma.goodsReturnItem.deleteMany({
          where: { goodsReturnId: createdGoodsReturnId },
        });

        await prisma.goodsReturn.delete({
          where: { id: createdGoodsReturnId },
        });

        console.log(
          `  [CLEANUP] Removed test Goods Return ${createdGoodsReturnDocumentId}`
        );
      }
    } catch (cleanupError) {
      console.error(
        '  [CLEANUP WARNING] Failed to remove test Goods Return:',
        cleanupError
      );
    }

    try {
      if (createdGoodsIssueId) {
        await prisma.auditLog.deleteMany({
          where: {
            entityType: 'GOODS_ISSUE',
            entityId: String(createdGoodsIssueId),
          },
        });

        // Explicit child deletion avoids FK failures when the schema does
        // not cascade GoodsIssueItem -> GoodsIssue.
        await prisma.goodsIssueItem.deleteMany({
          where: { goodsIssueId: createdGoodsIssueId },
        });

        await prisma.goodsIssue.delete({
          where: { id: createdGoodsIssueId },
        });

        console.log(
          `  [CLEANUP] Removed test Goods Issue ${createdGoodsIssueDocumentId}`
        );
      }
    } catch (cleanupError) {
      console.error(
        '  [CLEANUP WARNING] Failed to remove test Goods Issue:',
        cleanupError
      );
    }
  }

  // =========================================================================
  // 3. BUSINESS VALIDATION & RELATIONAL INTEGRITY
  // =========================================================================

  console.log(
    '\n--- 3. Business Validation & Relational Integrity Tests ---'
  );

  {
    let errorCaught = false;

    try {
      await goodsReturnService.createGoodsReturn(
        {
          goodsIssueId: 999999,

          items: [
            {
              goodsIssueItemId: 1,
              productId: issueItem.productId,
              issuedQty: 10,
              soldQty: 5,
              returnQty: 5,
              damagedQty: 0,
              uom: issueItem.uom,
              rate: testRate,
            },
          ],
        },

        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 404 &&
          err.code === 'GOODS_ISSUE_NOT_FOUND',
        'Rejects non-existent Goods Issue with 404'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject non-existent Goods Issue'
      );
    }
  }

  {
    let errorCaught = false;

    try {
      await goodsReturnService.createGoodsReturn(
        {
          goodsIssueId: sourceIssue.id,

          items: [
            {
              goodsIssueItemId: 999999,
              productId: issueItem.productId,
              issuedQty: issuedQuantity,
              soldQty: 0,
              returnQty: 1,
              damagedQty: 0,
              uom: issueItem.uom,
              rate: testRate,
            },
          ],
        },

        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 400 &&
          err.code === 'INVALID_GOODS_ISSUE_ITEM',
        'Rejects Goods Issue Item not belonging to source Goods Issue'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject invalid Goods Issue Item'
      );
    }
  }

  {
    let errorCaught = false;

    try {
      await goodsReturnService.createGoodsReturn(
        {
          goodsIssueId: sourceIssue.id,
          items: [],
        },

        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 400 &&
          err.code === 'EMPTY_ITEMS',
        'Rejects empty Goods Return items array'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject empty Goods Return'
      );
    }
  }

  /*
   * Use the actual issued quantity dynamically.
   *
   * returnQty = issuedQty
   * damagedQty = 1
   *
   * Therefore:
   *
   * returnQty + damagedQty > issuedQty
   *
   * This works regardless of whether the issued quantity is
   * 1, 10, 20, 50, etc.
   */
  {
    let errorCaught = false;

    try {
      await goodsReturnService.createGoodsReturn(
        {
          goodsIssueId: sourceIssue.id,

          items: [
            {
              goodsIssueItemId: issueItem.id,
              productId: issueItem.productId,

              issuedQty: issuedQuantity,

              soldQty: 0,

              returnQty: issuedQuantity,

              damagedQty: 1,

              uom: issueItem.uom,

              rate: testRate,
            },
          ],
        },

        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 400 &&
          err.code === 'QUANTITY_EXCEEDS_ISSUED',
        'Rejects return quantity plus damaged quantity exceeding issued quantity'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject return + damaged quantity exceeding issued quantity'
      );
    }
  }

  {
    let errorCaught = false;

    try {
      await goodsReturnService.createGoodsReturn(
        {
          goodsIssueId: sourceIssue.id,

          items: [
            {
              goodsIssueItemId: issueItem.id,
              productId: issueItem.productId,

              issuedQty: issuedQuantity,

              soldQty: issuedQuantity + 1,

              returnQty: 0,

              damagedQty: 0,

              uom: issueItem.uom,

              rate: testRate,
            },
          ],
        },

        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 400 &&
          err.code === 'SOLD_QTY_EXCEEDS_ISSUED',
        'Rejects sold quantity exceeding issued quantity'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject sold quantity exceeding issued quantity'
      );
    }
  }

    // =========================================================================
  // 4. SALES OFFICER OWNERSHIP
  // =========================================================================

  console.log(
    '\n--- 4. Sales Officer Ownership Checks ---'
  );

  {
    const sourceSalesOfficerId =
      Number(
        sourceIssue.lineSale.salesOfficerId
      );

    /*
     * Find a real Sales Officer from the database whose ID
     * differs from the Sales Officer assigned to the source
     * Goods Issue.
     *
     * This is important because GoodsReturnService writes
     * audit information using currentUser.id, which must
     * satisfy the users.user_id foreign key.
     */
    const unauthorizedSalesOfficer =
      await prisma.user.findFirst({
        where: {
          id: {
            not: sourceSalesOfficerId,
          },

          role: {
            name: 'Sales Officer',
          },
        },

        select: {
          id: true,
          loginId: true,
          employeeName: true,
        },
      });

    if (!unauthorizedSalesOfficer) {
      console.log(
        '  [INFO] No second Sales Officer exists in database; ownership-negative test skipped'
      );
    } else {
      let errorCaught = false;

      try {
        await goodsReturnService.createGoodsReturn(
          {
            goodsIssueId:
              sourceIssue.id,

            items: [
              {
                goodsIssueItemId:
                  issueItem.id,

                productId:
                  issueItem.productId,

                issuedQty:
                  issuedQuantity,

                soldQty:
                  0,

                returnQty:
                  0,

                damagedQty:
                  0,

                uom:
                  issueItem.uom,

                rate:
                  testRate,
              },
            ],
          },

          {
            userId:
              unauthorizedSalesOfficer.id,

            id:
              unauthorizedSalesOfficer.id,

            role:
              'Sales Officer',

            username:
              unauthorizedSalesOfficer.loginId,

            loginId:
              unauthorizedSalesOfficer.loginId,
          }
        );
      } catch (err: any) {
        errorCaught = true;

        assert(
          err.statusCode === 403 &&
            err.code === 'FORBIDDEN',
          'Rejects Sales Officer attempting Goods Return for another officer'
        );
      }

      if (!errorCaught) {
        assert(
          false,
          'Should reject unauthorized Sales Officer ownership'
        );
      }
    }
  }

  // =========================================================================
  // 5. TRANSACTIONAL CREATION
  // =========================================================================

  console.log(
    '\n--- 5. Transactional Creation & Precision Tests ---'
  );

  const returnedQuantity =
    Number(
      (issuedQuantity / 4).toFixed(3)
    );

  const soldQuantity =
    Number(
      (issuedQuantity - returnedQuantity).toFixed(3)
    );

  const totalSoldAmount =
    Number(
      (
        soldQuantity *
        testRate
      ).toFixed(2)
    );

  const created =
    await goodsReturnService.createGoodsReturn(
      {
        goodsIssueId:
          sourceIssue.id,

        closingMeterReading:
          1250.75,

        totalSoldAmount,

        totalCollectionCash:
          1000.25,

        totalCollectionUpi:
          500.50,

        shortageAmount:
          0.25,

        remarks:
          'PHASE 6 GOODS RETURN TEST',

        items: [
          {
            goodsIssueItemId:
              issueItem.id,

            productId:
              issueItem.productId,

            issuedQty:
              issuedQuantity,

            soldQty:
              soldQuantity,

            returnQty:
              returnedQuantity,

            damagedQty:
              0,

            uom:
              issueItem.uom,

            rate:
              testRate,
          },
        ],
      },

      superAdminReq.user,

      '127.0.0.1',

      'Phase6Test'
    );

  createdGoodsReturnId = created.goodsReturnId;
  createdGoodsReturnDocumentId = created.returnDocumentId;

  assert(
    !!created.goodsReturnId,
    'Goods Return created with generated numeric ID'
  );

  assert(
    /^GR-\d{5}$/.test(
      created.returnDocumentId
    ),
    'Goods Return document ID uses GR-xxxxx format'
  );

  assert(
    created.goodsIssueId ===
      sourceIssue.id,
    'Created Goods Return references source Goods Issue'
  );

  assert(
    created.itemCount === 1,
    'Created Goods Return contains expected item count'
  );

  assert(
    created.items[0].goodsIssueItemId ===
      issueItem.id,
    'Created item references source Goods Issue Item'
  );

  assert(
    created.items[0].productId ===
      issueItem.productId,
    'Created item preserves Product relationship'
  );

  assert(
    Number(
      created.items[0].returnQty
    ) === returnedQuantity,
    'Return quantity persisted accurately'
  );

  assert(
    Number(
      created.items[0].soldQty
    ) === soldQuantity,
    'Sold quantity persisted accurately'
  );

  assert(
    Number(
      created.items[0].rate
    ) === testRate,
    'Historical item rate persisted accurately'
  );

  assert(
    Number(
      created.totalCollectionCash
    ) === 1000.25,
    'Cash collection Decimal precision preserved'
  );

  assert(
    Number(
      created.totalCollectionUpi
    ) === 500.50,
    'UPI collection Decimal precision preserved'
  );

  assert(
    Number(
      created.shortageAmount
    ) === 0.25,
    'Shortage amount Decimal precision preserved'
  );

  // =========================================================================
  // 6. DATABASE PERSISTENCE
  // =========================================================================

  console.log(
    '\n--- 6. Database Persistence & Retrieval Tests ---'
  );

  const persisted =
    await prisma.goodsReturn.findUnique({
      where: {
        id: created.goodsReturnId,
      },

      include: {
        items: true,
      },
    });

  assert(
    !!persisted,
    'Goods Return exists in database after creation'
  );

  assert(
    persisted?.returnDocumentId ===
      created.returnDocumentId,
    'Return document ID persisted in database'
  );

  assert(
    persisted?.items.length === 1,
    'Goods Return item persisted in database'
  );

  assert(
    Number(
      persisted?.items[0].returnQty
    ) === returnedQuantity,
    'Return quantity persisted with Decimal precision'
  );

  assert(
    Number(
      persisted?.items[0].rate
    ) === testRate,
    'Item rate persisted with Decimal precision'
  );

  // =========================================================================
  // 7. RETRIEVAL & FILTERING
  // =========================================================================

  console.log(
    '\n--- 7. Retrieval & Filtering Tests ---'
  );

  const fetchedById =
    await goodsReturnService.getGoodsReturnById(
      created.goodsReturnId
    );

  assert(
    fetchedById.returnDocumentId ===
      created.returnDocumentId,
    'Retrieved Goods Return by numeric ID'
  );

  const fetchedByDocument =
    await goodsReturnService.getGoodsReturnById(
      created.returnDocumentId
    );

  assert(
    fetchedByDocument.goodsReturnId ===
      created.goodsReturnId,
    'Retrieved Goods Return by document ID'
  );

  const allReturns =
    await goodsReturnService.getGoodsReturns();

  assert(
    allReturns.some(
      (item) =>
        item.goodsReturnId ===
        created.goodsReturnId
    ),
    'Goods Return appears in database-backed list'
  );

  const issueFiltered =
    await goodsReturnService.getGoodsReturns({
      goodsIssueId:
        String(sourceIssue.id),
    });

  assert(
    issueFiltered.some(
      (item) =>
        item.goodsReturnId ===
        created.goodsReturnId
    ),
    'Goods Issue filter returns matching Goods Return'
  );

  const documentSearch =
    await goodsReturnService.getGoodsReturns({
      search:
        created.returnDocumentId,
    });

  assert(
    documentSearch.some(
      (item) =>
        item.returnDocumentId ===
        created.returnDocumentId
    ),
    'Search filter finds Goods Return by document ID'
  );

  // =========================================================================
  // 8. SOURCE GOODS ISSUE COMPLETION
  // =========================================================================

  console.log(
    '\n--- 8. Source Goods Issue Reconciliation Tests ---'
  );

  const updatedSourceIssue =
    await prisma.goodsIssue.findUnique({
      where: {
        id: sourceIssue.id,
      },

      select: {
        status: true,
        closingMeterReading: true,
      },
    });

  assert(
    updatedSourceIssue?.status ===
      'COMPLETED',
    'Source Goods Issue transitioned to COMPLETED after reconciliation'
  );

  assert(
    Number(
      updatedSourceIssue?.closingMeterReading
    ) === 1250.75,
    'Closing meter reading propagated to source Goods Issue'
  );

  // =========================================================================
  // 9. HEADER UPDATE
  // =========================================================================

  console.log(
    '\n--- 9. Goods Return Update Tests ---'
  );

  const updated =
    await goodsReturnService.updateGoodsReturn(
      created.returnDocumentId,

      {
        closingMeterReading:
          1300.50,

        totalSoldAmount:
          totalSoldAmount + 100,

        totalCollectionCash:
          1100.75,

        totalCollectionUpi:
          600.25,

        shortageAmount:
          1.25,

        remarks:
          'PHASE 6 UPDATED',
      },

      superAdminReq.user,

      '127.0.0.1',

      'Phase6UpdateTest'
    );

  assert(
    updated.closingMeterReading ===
      1300.50,
    'Updated closing meter reading persisted'
  );

  assert(
    updated.totalCollectionCash ===
      1100.75,
    'Updated cash collection persisted'
  );

  assert(
    updated.totalCollectionUpi ===
      600.25,
    'Updated UPI collection persisted'
  );

  assert(
    updated.shortageAmount ===
      1.25,
    'Updated shortage amount persisted'
  );

  assert(
    updated.remarks ===
      'PHASE 6 UPDATED',
    'Updated remarks persisted'
  );

  // =========================================================================
  // 10. ITEM REPLACEMENT UPDATE
  // =========================================================================

  console.log(
    '\n--- 10. Goods Return Item Update Tests ---'
  );

  const updatedReturnQuantity =
    Number(
      Math.min(
        5,
        issuedQuantity
      ).toFixed(3)
    );

  const updatedSoldQuantity =
    Number(
      (
        issuedQuantity -
        updatedReturnQuantity
      ).toFixed(3)
    );

  const updatedItem =
    await goodsReturnService.updateGoodsReturn(
      created.returnDocumentId,

      {
        items: [
          {
            goodsIssueItemId:
              issueItem.id,

            productId:
              issueItem.productId,

            issuedQty:
              issuedQuantity,

            soldQty:
              updatedSoldQuantity,

            returnQty:
              updatedReturnQuantity,

            damagedQty:
              0,

            uom:
              issueItem.uom,

            rate:
              98.75,
          },
        ],
      },

      superAdminReq.user,

      '127.0.0.1',

      'Phase6ItemUpdateTest'
    );

  assert(
    updatedItem.items.length === 1,
    'Goods Return item rows replaced atomically'
  );

  assert(
    updatedItem.items[0].rate ===
      98.75,
    'Updated Goods Return item rate persisted'
  );

  // =========================================================================
  // 11. UPDATE VALIDATION
  // =========================================================================

  console.log(
    '\n--- 11. Update Validation Tests ---'
  );

  {
    let errorCaught = false;

    try {
      await goodsReturnService.updateGoodsReturn(
        created.returnDocumentId,

        {
          closingMeterReading: -1,
        },

        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 400 &&
          err.code === 'INVALID_METER_READING',
        'Rejects negative closing meter reading during update'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject negative closing meter reading'
      );
    }
  }

  {
    let errorCaught = false;

    try {
      await goodsReturnService.updateGoodsReturn(
        created.returnDocumentId,

        {
          items: [],
        },

        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 400 &&
          err.code === 'EMPTY_ITEMS',
        'Rejects empty item array during update'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject empty item update'
      );
    }
  }

  // =========================================================================
  // 12. STATUS LIFECYCLE
  // =========================================================================

  console.log(
    '\n--- 12. Status Lifecycle Tests ---'
  );

  {
    let errorCaught = false;

    try {
      await goodsReturnService.updateGoodsReturnStatus(
        created.returnDocumentId,
        'INVALID_STATUS',
        superAdminReq.user
      );
    } catch (err: any) {
      errorCaught = true;

      assert(
        err.statusCode === 400 &&
          err.code === 'INVALID_STATUS',
        'Rejects invalid Goods Return status'
      );
    }

    if (!errorCaught) {
      assert(
        false,
        'Should reject invalid Goods Return status'
      );
    }
  }

  const pending =
    await goodsReturnService.updateGoodsReturnStatus(
      created.returnDocumentId,
      'PENDING',
      superAdminReq.user,
      '127.0.0.1',
      'Phase6StatusTest'
    );

  assert(
    pending.status === 'PENDING',
    'Goods Return transitioned to PENDING'
  );

  const completed =
    await goodsReturnService.updateGoodsReturnStatus(
      created.returnDocumentId,
      'COMPLETED',
      superAdminReq.user,
      '127.0.0.1',
      'Phase6StatusTest'
    );

  assert(
    completed.status === 'COMPLETED',
    'Goods Return transitioned back to COMPLETED'
  );

  // =========================================================================
  // 13. AUDIT LOGGING
  // =========================================================================

  console.log(
    '\n--- 13. Audit Logging Tests ---'
  );

  const auditLogs =
    await prisma.auditLog.findMany({
      where: {
        entityType: 'GoodsReturn',

        entityId:
          created.returnDocumentId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

  assert(
    auditLogs.length >= 3,
    'Goods Return create/update/status operations generated audit logs'
  );

  assert(
    auditLogs.some(
      (log) => log.action === 'CREATE'
    ),
    'CREATE audit log exists for Goods Return'
  );

  assert(
    auditLogs.some(
      (log) => log.action === 'UPDATE'
    ),
    'UPDATE audit log exists for Goods Return'
  );

  assert(
    auditLogs.some(
      (log) =>
        log.action === 'STATUS_CHANGE'
    ),
    'STATUS_CHANGE audit log exists for Goods Return'
  );

  // =========================================================================
  // 14. HTTP CONTROLLER INTEGRATION
  // =========================================================================

  console.log(
    '\n--- 14. HTTP Controller Endpoint Integration Tests ---'
  );

  {
    const res =
      createMockResponse();

    const req = {
      user:
        superAdminReq.user,

      body: {
        goodsIssueId:
          sourceIssue.id,

        items: [
          {
            goodsIssueItemId:
              issueItem.id,

            productId:
              issueItem.productId,

            issuedQty:
              issuedQuantity,

            soldQty:
              issuedQuantity,

            returnQty:
              0,

            damagedQty:
              0,

            uom:
              issueItem.uom,

            rate:
              testRate,
          },
        ],
      },

      ip:
        '127.0.0.1',

      socket: {
        remoteAddress:
          '127.0.0.1',
      },

      headers: {
        'user-agent':
          'Phase6ControllerTest',
      },
    } as unknown as AuthenticatedRequest;

    let nextCalled = false;

    await goodsReturnController.createGoodsReturn(
      req,
      res,
      () => {
        nextCalled = true;
      }
    );

    assert(
      !nextCalled &&
        res.getStatusCode() === 409,

      'POST /api/goods-returns rejects duplicate Goods Return with HTTP 409'
    );
  }

  {
    const res =
      createMockResponse();

    const req = {
      user:
        superAdminReq.user,

      params: {
        id:
          created.returnDocumentId,
      },

      query: {},
    } as unknown as AuthenticatedRequest;

    let nextCalled = false;

    await goodsReturnController.getGoodsReturnById(
      req,
      res,
      () => {
        nextCalled = true;
      }
    );

    const body =
      res.getBody();

    assert(
      !nextCalled &&
        res.getStatusCode() === 200,

      'GET /api/goods-returns/:id returns HTTP 200'
    );

    assert(
      body?.success === true &&
        body?.data?.returnDocumentId ===
          created.returnDocumentId,

      'GET controller returns persisted Goods Return data'
    );
  }

  {
    const res =
      createMockResponse();

    const req = {
      user:
        superAdminReq.user,

      query: {},
    } as unknown as AuthenticatedRequest;

    let nextCalled = false;

    await goodsReturnController.getGoodsReturns(
      req,
      res,
      () => {
        nextCalled = true;
      }
    );

    const body =
      res.getBody();

    assert(
      !nextCalled &&
        res.getStatusCode() === 200,

      'GET /api/goods-returns returns HTTP 200'
    );

    assert(
      body?.success === true &&
        Array.isArray(body?.data),

      'GET controller returns Goods Return list'
    );
  }

  {
    const res =
      createMockResponse();

    const req = {
      user:
        superAdminReq.user,

      params: {
        id:
          created.returnDocumentId,
      },

      body: {
        remarks:
          'PHASE 6 HTTP UPDATE',
      },

      ip:
        '127.0.0.1',

      socket: {
        remoteAddress:
          '127.0.0.1',
      },

      headers: {
        'user-agent':
          'Phase6ControllerUpdateTest',
      },
    } as unknown as AuthenticatedRequest;

    let nextCalled = false;

    await goodsReturnController.updateGoodsReturn(
      req,
      res,
      () => {
        nextCalled = true;
      }
    );

    assert(
      !nextCalled &&
        res.getStatusCode() === 200,

      'PUT /api/goods-returns/:id returns HTTP 200'
    );
  }

  {
    const res =
      createMockResponse();

    const req = {
      user:
        superAdminReq.user,

      params: {
        id:
          created.returnDocumentId,
      },

      body: {
        status:
          'PENDING',
      },

      ip:
        '127.0.0.1',

      socket: {
        remoteAddress:
          '127.0.0.1',
      },

      headers: {
        'user-agent':
          'Phase6ControllerStatusTest',
      },
    } as unknown as AuthenticatedRequest;

    let nextCalled = false;

    await goodsReturnController.updateGoodsReturnStatus(
      req,
      res,
      () => {
        nextCalled = true;
      }
    );

    assert(
      !nextCalled &&
        res.getStatusCode() === 200,

      'PATCH /api/goods-returns/:id/status returns HTTP 200'
    );
  }

  // =========================================================================
  // RESTORE FINAL STATUS
  // =========================================================================

  await goodsReturnService.updateGoodsReturnStatus(
    created.returnDocumentId,
    'COMPLETED',
    superAdminReq.user
  );

  // =========================================================================
  // FINAL RESULT
  // =========================================================================

  console.log(
    '\n================================================================'
  );

  console.log(
    `PHASE 6 GOODS RETURN TEST RESULTS: ${passed} PASSED, ${failed} FAILED`
  );

  console.log(
    '================================================================'
  );

  await cleanupTestData();

  await prisma.$disconnect();

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runGoodsReturnTests().catch(
  async (err) => {
    console.error(
      '\nFATAL GOODS RETURN TEST ERROR'
    );

    console.error(err);

    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors.
    }

    process.exitCode = 1;
  }
);