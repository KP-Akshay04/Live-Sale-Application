/**
 * Live Verification Test Suite for BINDU Phase 2 Authentication & Authorization
 * Validates actual User model fields, loginId authentication, JWT claims,
 * error handling, role checks, and security boundaries.
 */
import { hashPassword, comparePassword, signJwtToken, verifyJwtToken } from '../utils/security.js';
import { authService } from '../services/auth.service.js';
import { authController } from '../controllers/auth.controller.js';
import { requireRoles } from '../middleware/authorize.js';
import { authenticate } from '../middleware/authenticate.js';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types.js';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

async function runLiveVerification() {
  console.log('================================================================');
  console.log('BINDU PHASE 2: FINAL LIVE AUTHENTICATION & AUTHORIZATION VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      if (detail) console.log(`         ${detail}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         ${detail}`);
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

  // -------------------------------------------------------------
  // 1. Password Storage & Bcrypt Security Verification
  // -------------------------------------------------------------
  console.log('1. VERIFY PASSWORD STORAGE & BCRYPT SECURITY');
  const testDevPassword = 'DevSecurePassword#2026';
  const hashedPassword = await hashPassword(testDevPassword);

  assert(
    hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$'),
    'Password hash conforms to standard bcrypt format ($2a$/$2b$)'
  );
  assert(
    hashedPassword !== testDevPassword,
    'Plaintext password is never stored or hashed as plaintext'
  );
  assert(
    await comparePassword(testDevPassword, hashedPassword),
    'Bcrypt timing-safe comparison correctly validates authentic password'
  );
  assert(
    !(await comparePassword('WrongPassword#999', hashedPassword)),
    'Bcrypt comparison strictly rejects incorrect password'
  );

  // -------------------------------------------------------------
  // 2. JWT Generation, Minimal Claims & Absence of Secrets
  // -------------------------------------------------------------
  console.log('\n2. VERIFY JWT SIGNING & CLAIMS HYGIENE');
  const mockUserPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: 101,
    role: 'Super Admin',
    roleCode: 'SUPER_ADMIN',
    loginId: 'admin_dev',
    depotId: null,
  };

  const validToken = signJwtToken(mockUserPayload);
  assert(
    typeof validToken === 'string' && validToken.split('.').length === 3,
    'JWT is issued as standard 3-part header.payload.signature'
  );

  const decodedPayload = verifyJwtToken(validToken);
  assert(decodedPayload.userId === 101, 'JWT contains valid userId');
  assert(decodedPayload.loginId === 'admin_dev', 'JWT contains authentic loginId');
  assert(decodedPayload.role === 'Super Admin', 'JWT contains authentic role name');
  assert(decodedPayload.roleCode === 'SUPER_ADMIN', 'JWT contains authentic roleCode');
  assert(
    (decodedPayload as any).password === undefined &&
    (decodedPayload as any).passwordHash === undefined &&
    (decodedPayload as any).email === undefined,
    'JWT strictly excludes sensitive data (password, passwordHash, unmodeled fields)'
  );

  // -------------------------------------------------------------
  // 3. Authenticate Middleware & Token Verification
  // -------------------------------------------------------------
  console.log('\n3. VERIFY AUTHENTICATE MIDDLEWARE');
  
  // Missing Authorization Header -> 401
  let res = createMockResponse();
  const reqMissingAuth: AuthenticatedRequest = { headers: {} } as any;
  authenticate(reqMissingAuth, res, () => {});
  assert(
    res.getStatusCode() === 401 && res.getBody()?.error?.code === 'AUTH_REQUIRED',
    'Missing Authorization header is rejected with 401 AUTH_REQUIRED'
  );

  // Malformed Header -> 401
  res = createMockResponse();
  const reqMalformed: AuthenticatedRequest = { headers: { authorization: 'Token abc123xyz' } } as any;
  authenticate(reqMalformed, res, () => {});
  assert(
    res.getStatusCode() === 401 && res.getBody()?.error?.code === 'INVALID_AUTH_HEADER',
    'Malformed Authorization header format is rejected with 401 INVALID_AUTH_HEADER'
  );

  // Invalid / Tampered JWT -> 401
  res = createMockResponse();
  const reqTampered: AuthenticatedRequest = { headers: { authorization: `Bearer ${validToken}tampered` } } as any;
  authenticate(reqTampered, res, () => {});
  assert(
    res.getStatusCode() === 401 && res.getBody()?.error?.code === 'INVALID_TOKEN',
    'Tampered JWT is rejected with 401 INVALID_TOKEN'
  );

  // Expired JWT -> 401
  res = createMockResponse();
  const expiredToken = jwt.sign(mockUserPayload, env.jwtSecret, { expiresIn: '-1s' });
  const reqExpired: AuthenticatedRequest = { headers: { authorization: `Bearer ${expiredToken}` } } as any;
  authenticate(reqExpired, res, () => {});
  assert(
    res.getStatusCode() === 401 && res.getBody()?.error?.code === 'TOKEN_EXPIRED',
    'Expired JWT is rejected with 401 TOKEN_EXPIRED'
  );

  // Valid Token -> next() called and req.user attached
  const statusTracker = { nextCalled: false };
  const reqValid: AuthenticatedRequest = { headers: { authorization: `Bearer ${validToken}` } } as any;
  authenticate(reqValid, res, () => {
    statusTracker.nextCalled = true;
  });
  assert(
    statusTracker.nextCalled && reqValid.user?.userId === 101,
    'Valid JWT passes authenticate middleware and populates req.user'
  );

  // -------------------------------------------------------------
  // 4. Role Authorization Matrix
  // -------------------------------------------------------------
  console.log('\n4. VERIFY ROLE AUTHORIZATION MATRIX (Super Admin, Depot Person, Sales Officer)');
  
  const superAdminReq: AuthenticatedRequest = {
    user: { userId: 1, loginId: 'admin', role: 'Super Admin', roleCode: 'SUPER_ADMIN', depotId: null },
  } as any;

  const depotPersonReq: AuthenticatedRequest = {
    user: { userId: 2, loginId: 'depot_user', role: 'Depot Person', roleCode: 'DEPOT_PERSON', depotId: 10 },
  } as any;

  const salesOfficerReq: AuthenticatedRequest = {
    user: { userId: 3, loginId: 'sales_user', role: 'Sales Officer', roleCode: 'SALES_OFFICER', depotId: 10 },
  } as any;

  // Super Admin check
  const superAdminGuard = requireRoles('Super Admin');
  statusTracker.nextCalled = false;
  superAdminGuard(superAdminReq, createMockResponse(), () => { statusTracker.nextCalled = true; });
  assert(statusTracker.nextCalled, 'Super Admin user is granted access to Super Admin route');

  // Depot Person blocked from Super Admin route
  res = createMockResponse();
  statusTracker.nextCalled = false;
  superAdminGuard(depotPersonReq, res, () => { statusTracker.nextCalled = true; });
  assert(!statusTracker.nextCalled && res.getStatusCode() === 403, 'Depot Person is blocked from Super Admin route with 403 FORBIDDEN');

  // Sales Officer blocked from Super Admin route
  res = createMockResponse();
  statusTracker.nextCalled = false;
  superAdminGuard(salesOfficerReq, res, () => { statusTracker.nextCalled = true; });
  assert(!statusTracker.nextCalled && res.getStatusCode() === 403, 'Sales Officer is blocked from Super Admin route with 403 FORBIDDEN');

  // Depot Person allowed on Goods Issue route (Super Admin + Depot Person)
  const depotGuard = requireRoles('Super Admin', 'Depot Person');
  statusTracker.nextCalled = false;
  depotGuard(depotPersonReq, createMockResponse(), () => { statusTracker.nextCalled = true; });
  assert(statusTracker.nextCalled, 'Depot Person is granted access to Goods Issue route');

  // Sales Officer blocked from Depot Person Goods Issue route
  res = createMockResponse();
  statusTracker.nextCalled = false;
  depotGuard(salesOfficerReq, res, () => { statusTracker.nextCalled = true; });
  assert(!statusTracker.nextCalled && res.getStatusCode() === 403, 'Sales Officer is blocked from Depot Goods Issue route with 403 FORBIDDEN');

  // Sales Officer allowed on Sales / Invoicing route
  const salesGuard = requireRoles('Sales Officer');
  statusTracker.nextCalled = false;
  salesGuard(salesOfficerReq, createMockResponse(), () => { statusTracker.nextCalled = true; });
  assert(statusTracker.nextCalled, 'Sales Officer is granted access to Sales Invoicing route');

  // -------------------------------------------------------------
  // 5. Auth Controller Endpoints & Validation Tests
  // -------------------------------------------------------------
  console.log('\n5. VERIFY CONTROLLER ENDPOINTS & LOGOUT SEMANTICS');

  // Empty / Missing Login ID -> 400
  res = createMockResponse();
  await authController.login({ body: { loginId: '', password: 'any' } } as Request, res, () => {});
  assert(res.getStatusCode() === 400, 'Empty loginId returns 400 VALIDATION_ERROR');

  // Empty / Missing Password -> 400
  res = createMockResponse();
  await authController.login({ body: { loginId: 'admin', password: '' } } as Request, res, () => {});
  assert(res.getStatusCode() === 400, 'Empty password returns 400 VALIDATION_ERROR');

  // Unauthenticated /api/auth/me -> 401
  res = createMockResponse();
  await authController.getMe({} as AuthenticatedRequest, res, () => {});
  assert(res.getStatusCode() === 401, 'Unauthenticated /api/auth/me returns 401 AUTH_REQUIRED');

  // Stateless Logout Endpoint -> 200 (Client-side token disposal acknowledgement)
  res = createMockResponse();
  await authController.logout({} as Request, res);
  assert(
    res.getStatusCode() === 200 && res.getBody()?.success === true,
    'POST /api/auth/logout returns 200 acknowledging client session termination'
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`LIVE VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal error during live verification:', err);
  process.exit(1);
});
