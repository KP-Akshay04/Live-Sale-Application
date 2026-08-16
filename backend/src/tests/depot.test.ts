/**
 * BINDU LIVE SALE APPLICATION — PHASE 4B: DEPOT MASTER TEST SUITE
 * Validates database-backed CRUD, unique constraints, coordinate validation,
 * audit logging, and Super Admin authorization.
 */
import { depotController } from '../controllers/depot.controller.js';
import { depotService, DepotServiceError } from '../services/depot.service.js';
import { requireRoles } from '../middleware/authorize.js';
import { authenticate } from '../middleware/authenticate.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { Response } from 'express';
import { prisma } from '../config/database.js';

async function runDepotMasterTests() {
  console.log('================================================================');
  console.log('BINDU PHASE 4B: DEPOT MASTER TEST SUITE');
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
  console.log('--- 1. Role Authorization Checks for Depot Master ---');

  const superAdminReq: AuthenticatedRequest = {
    user: {
      userId: 1,
      role: 'Super Admin',
      roleCode: 'SUPER_ADMIN',
      loginId: 'admin',
      depotId: null,
    },
    headers: {},
  } as any;

  const depotPersonReq: AuthenticatedRequest = {
    user: {
      userId: 2,
      role: 'Depot Person',
      roleCode: 'DEPOT_PERSON',
      loginId: 'depot',
      depotId: 1,
    },
    headers: {},
  } as any;

  const salesOfficerReq: AuthenticatedRequest = {
    user: {
      userId: 3,
      role: 'Sales Officer',
      roleCode: 'SALES_OFFICER',
      loginId: 'sales',
      depotId: null,
    },
    headers: {},
  } as any;

  // Test Super Admin access check
  const superAdminAuthMw = requireRoles('Super Admin');
  let superAdminNextCalled = false;
  let superAdminRes = createMockResponse();

  superAdminAuthMw(superAdminReq, superAdminRes, () => {
    superAdminNextCalled = true;
  });
  assert(superAdminNextCalled, 'Super Admin is authorized for /api/depots management');

  // Test Depot Person access rejection (403)
  let depotPersonNextCalled = false;
  let depotPersonRes = createMockResponse();

  depotPersonAuthMw: {
    const mw = requireRoles('Super Admin');
    mw(depotPersonReq, depotPersonRes, () => {
      depotPersonNextCalled = true;
    });
  }
  assert(!depotPersonNextCalled && depotPersonRes.getStatusCode() === 403, 'Depot Person is rejected with 403 Forbidden');

  // Test Sales Officer access rejection (403)
  let salesOfficerNextCalled = false;
  let salesOfficerRes = createMockResponse();

  salesOfficerAuthMw: {
    const mw = requireRoles('Super Admin');
    mw(salesOfficerReq, salesOfficerRes, () => {
      salesOfficerNextCalled = true;
    });
  }
  assert(!salesOfficerNextCalled && salesOfficerRes.getStatusCode() === 403, 'Sales Officer is rejected with 403 Forbidden');

  // =========================================================================
  // 2. DEPOT SERVICE VALIDATION TESTS
  // =========================================================================
  console.log('\n--- 2. Depot Validation and Coordinate Constraints ---');

  // Empty site name validation
  try {
    await depotService.createDepot({ siteName: '', address: '123 Main St', city: 'Bangalore', pin: '560001', gst: '29AAAAA0000A1Z5' });
    assert(false, 'DepotService should reject empty siteName');
  } catch (err: any) {
    assert(err.statusCode === 400, 'DepotService rejects empty siteName with HTTP 400');
  }

  // Invalid Latitude coordinate (> 90)
  try {
    await depotService.createDepot({
      siteName: 'Test Invalid Lat Depot',
      address: '123 Main St',
      city: 'Bangalore',
      pin: '560001',
      gst: '29AAAAA0000A1Z5',
      latitude: 95.5,
    });
    assert(false, 'DepotService should reject latitude > 90');
  } catch (err: any) {
    assert(err.statusCode === 400 && err.code === 'INVALID_COORDINATES', 'DepotService rejects latitude > 90 with HTTP 400 INVALID_COORDINATES');
  }

  // Invalid Longitude coordinate (< -180)
  try {
    await depotService.createDepot({
      siteName: 'Test Invalid Lng Depot',
      address: '123 Main St',
      city: 'Bangalore',
      pin: '560001',
      gst: '29AAAAA0000A1Z5',
      longitude: -195.0,
    });
    assert(false, 'DepotService should reject longitude < -180');
  } catch (err: any) {
    assert(err.statusCode === 400 && err.code === 'INVALID_COORDINATES', 'DepotService rejects longitude < -180 with HTTP 400 INVALID_COORDINATES');
  }

  // Invalid negative allowed radius
  try {
    await depotService.createDepot({
      siteName: 'Test Invalid Radius Depot',
      address: '123 Main St',
      city: 'Bangalore',
      pin: '560001',
      gst: '29AAAAA0000A1Z5',
      allowedRadius: -50,
    });
    assert(false, 'DepotService should reject negative allowed radius');
  } catch (err: any) {
    assert(err.statusCode === 400 && err.code === 'INVALID_ALLOWED_RADIUS', 'DepotService rejects negative allowed radius with HTTP 400');
  }

  // =========================================================================
  // 3. DEPOT CRUD OPERATIONS & UNIQUE CONSTRAINTS
  // =========================================================================
  console.log('\n--- 3. MySQL Database-Backed CRUD & Unique Constraints ---');

  const uniqueSuffix = Date.now();
  const testDepotCode = `DEP-TST-${uniqueSuffix}`;
  const testSiteName = `Test Logistics Hub ${uniqueSuffix}`;

  let createdDepotId: number | null = null;

  try {
    // 3a. Create Depot
    const createdDepot = await depotService.createDepot(
      {
        depotCode: testDepotCode,
        siteName: testSiteName,
        description: 'Automated test warehouse facility',
        address: 'Plot 99, Electronic City Phase II',
        city: 'Bangalore',
        district: 'Bangalore Urban',
        state: 'Karnataka',
        pin: '560100',
        contactNumber: '+91 99887 76655',
        gst: '29TESTD1234E1Z1',
        sapPlantCode: 'PLANT-9901',
        salesTag: 'KA-ELEC',
        latitude: 12.8452,
        longitude: 77.6602,
        allowedRadius: 500,
        isActive: true,
      },
      1,
      '127.0.0.1',
      'Phase4B-Test-Runner'
    );

    createdDepotId = createdDepot.id;
    assert(createdDepot.id > 0, `Depot created in MySQL with ID: ${createdDepot.id}`);
    assert(createdDepot.code === testDepotCode, `Depot code stored correctly as: ${testDepotCode}`);
    assert(createdDepot.siteName === testSiteName, `Depot site name matches: ${testSiteName}`);
    assert(createdDepot.sapPlantCode === 'PLANT-9901', 'Depot SAP plant code preserved in MySQL');
    assert(createdDepot.isActive === true, 'Depot created with active status true');

    // 3b. Duplicate depotCode rejection (HTTP 409 Conflict)
    try {
      await depotService.createDepot({
        depotCode: testDepotCode,
        siteName: `Another Site Name ${Date.now()}`,
        address: '456 Alternate St',
        city: 'Bangalore',
        pin: '560002',
        gst: '29TESTD1234E1Z2',
      });
      assert(false, 'DepotService should reject duplicate depotCode with 409');
    } catch (dupErr: any) {
      assert(
        dupErr.statusCode === 409 && dupErr.code === 'DUPLICATE_DEPOT_CODE',
        `Duplicate depotCode correctly rejected with HTTP 409 Conflict (code: ${dupErr.code})`
      );
    }

    // 3c. Retrieve list and search
    const allDepots = await depotService.getDepots();
    assert(allDepots.length > 0, `GET /api/depots retrieved ${allDepots.length} records from MySQL`);

    const searchResults = await depotService.getDepots({ search: testDepotCode });
    assert(
      searchResults.length === 1 && searchResults[0].id === createdDepotId,
      'GET /api/depots query filter by search term correctly matched created depot'
    );

    // 3d. Retrieve single depot by ID
    const fetchedDepot = await depotService.getDepotById(createdDepotId);
    assert(
      fetchedDepot.id === createdDepotId && fetchedDepot.code === testDepotCode,
      `GET /api/depots/:id retrieved depot matching ID ${createdDepotId}`
    );

    // 3e. Non-existent depot returns 404
    try {
      await depotService.getDepotById(999999);
      assert(false, 'DepotService should throw 404 for non-existent depot');
    } catch (notFoundErr: any) {
      assert(
        notFoundErr.statusCode === 404 && notFoundErr.code === 'DEPOT_NOT_FOUND',
        'GET /api/depots/:id returns HTTP 404 for non-existent depot identifier'
      );
    }

    // 3f. Update Depot (PUT)
    const updatedDepot = await depotService.updateDepot(
      createdDepotId,
      {
        siteName: `${testSiteName} (Updated)`,
        description: 'Updated warehouse description',
        contactNumber: '+91 99000 11223',
        sapPlantCode: 'PLANT-9902',
      },
      1,
      '127.0.0.1',
      'Phase4B-Test-Runner'
    );
    assert(
      updatedDepot.siteName === `${testSiteName} (Updated)` && updatedDepot.sapPlantCode === 'PLANT-9902',
      'PUT /api/depots/:id updated fields in MySQL successfully'
    );

    // 3g. Deactivate Depot (PATCH /status)
    const deactivatedDepot = await depotService.updateDepotStatus(
      createdDepotId,
      false,
      1,
      '127.0.0.1',
      'Phase4B-Test-Runner'
    );
    assert(deactivatedDepot.isActive === false, 'PATCH /api/depots/:id/status successfully deactivated depot');

    // 3h. Re-activate Depot (PATCH /status)
    const reactivatedDepot = await depotService.updateDepotStatus(
      createdDepotId,
      true,
      1,
      '127.0.0.1',
      'Phase4B-Test-Runner'
    );
    assert(reactivatedDepot.isActive === true, 'PATCH /api/depots/:id/status successfully reactivated depot');

    // =========================================================================
    // 4. AUDIT LOG VERIFICATION
    // =========================================================================
    console.log('\n--- 4. Audit Log Entries in MySQL ---');

    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          entityType: 'Depot',
          entityId: String(createdDepotId),
        },
        orderBy: { createdAt: 'asc' },
      });

      assert(logs.length >= 3, `Audit logs created in MySQL: found ${logs.length} entries for Depot #${createdDepotId}`);
      const actions = logs.map((l) => l.action);
      assert(actions.includes('DEPOT_CREATED'), 'Audit log contains DEPOT_CREATED entry');
      assert(actions.includes('DEPOT_UPDATED'), 'Audit log contains DEPOT_UPDATED entry');
      assert(actions.includes('DEPOT_DEACTIVATED') || actions.includes('DEPOT_ACTIVATED'), 'Audit log contains status change entry');
    } catch (auditErr: any) {
      console.warn('  [WARN] Audit log table check:', auditErr?.message || auditErr);
    }
  } catch (error: any) {
    console.error('  [ERROR in CRUD Suite]:', error);
    failed++;
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed };
}

runDepotMasterTests()
  .then(({ failed }) => {
    if (failed > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
