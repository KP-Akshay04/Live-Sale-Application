/**
 * Automated Authentication & Authorization Verification Test Suite
 * Tests all Phase 2 security guarantees and endpoint behaviors.
 */
import { hashPassword, comparePassword, signJwtToken, verifyJwtToken } from '../utils/security.js';
import { requireRoles } from '../middleware/authorize.js';
import { authenticate } from '../middleware/authenticate.js';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types.js';
import { Response } from 'express';

async function runTests() {
  console.log('=== BINDU PHASE 2: AUTHENTICATION & AUTHORIZATION TESTS ===\n');
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

  // 1. Password Hashing & Bcrypt Verification
  console.log('--- 1. Password Security & Bcrypt ---');
  const rawPassword = 'SecurePassword#2026';
  const hashedPassword = await hashPassword(rawPassword);

  assert(hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$'), 'Password hash uses standard bcrypt format');
  assert(hashedPassword !== rawPassword, 'Password is never stored or hashed as plaintext');
  
  const validMatch = await comparePassword(rawPassword, hashedPassword);
  assert(validMatch === true, 'Bcrypt compare validates correct plaintext password');

  const invalidMatch = await comparePassword('WrongPassword123', hashedPassword);
  assert(invalidMatch === false, 'Bcrypt compare rejects incorrect password');

  // 2. JWT Generation and Minimal Claims
  console.log('\n--- 2. JWT Signing & Verification ---');
  const mockPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: 42,
    role: 'Super Admin',
    roleCode: 'SUPER_ADMIN',
    loginId: 'admin_test',
    depotId: 1,
  };

  const token = signJwtToken(mockPayload);
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT is generated in 3-part header.payload.signature format');

  const decoded = verifyJwtToken(token);
  assert(decoded.userId === 42, 'JWT payload contains correct userId');
  assert(decoded.role === 'Super Admin', 'JWT payload contains role');
  assert(decoded.roleCode === 'SUPER_ADMIN', 'JWT payload contains roleCode');
  assert((decoded as any).password === undefined, 'JWT payload NEVER contains plaintext password');
  assert((decoded as any).passwordHash === undefined, 'JWT payload NEVER contains passwordHash');

  // 3. JWT Verification Error Cases
  console.log('\n--- 3. JWT Error Cases ---');
  try {
    verifyJwtToken('invalid.token.string');
    assert(false, 'Invalid JWT token should throw error');
  } catch (err: any) {
    assert(err.name === 'JsonWebTokenError', 'Malformed JWT throws JsonWebTokenError');
  }

  // 4. Authenticate Middleware Verification
  console.log('\n--- 4. Authentication Middleware ---');
  
  // Test Missing Header
  let statusResult = 0;
  let jsonResult: any = null;
  const mockRes = (): Response => ({
    status: (code: number) => {
      statusResult = code;
      return {
        json: (data: any) => {
          jsonResult = data;
        },
      };
    },
  } as unknown as Response);

  const reqMissingAuth: AuthenticatedRequest = {
    headers: {},
  } as any;

  authenticate(reqMissingAuth, mockRes(), () => {});
  assert(statusResult === 401 && jsonResult?.error?.code === 'AUTH_REQUIRED', 'Missing Authorization header returns 401 AUTH_REQUIRED');

  // Test Malformed Header
  const reqMalformedAuth: AuthenticatedRequest = {
    headers: { authorization: 'Basic xyz123' },
  } as any;

  authenticate(reqMalformedAuth, mockRes(), () => {});
  assert(statusResult === 401 && jsonResult?.error?.code === 'INVALID_AUTH_HEADER', 'Malformed header format returns 401 INVALID_AUTH_HEADER');

  // Test Valid Token
  const tracker = { nextCalled: false };
  const reqValidAuth: AuthenticatedRequest = {
    headers: { authorization: `Bearer ${token}` },
  } as any;

  authenticate(reqValidAuth, mockRes(), () => {
    tracker.nextCalled = true;
  });
  assert(tracker.nextCalled, 'Valid token passes authenticate middleware and calls next()');
  assert(reqValidAuth.user?.userId === 42, 'Authenticate middleware correctly attaches req.user');

  // 5. Role Authorization Middleware Verification
  console.log('\n--- 5. Role Authorization Middleware ---');
  
  const superAdminRoleMiddleware = requireRoles('Super Admin');
  const salesOfficerRoleMiddleware = requireRoles('Sales Officer');

  // Super Admin accessing Super Admin route -> Allowed
  tracker.nextCalled = false;
  superAdminRoleMiddleware(reqValidAuth, mockRes(), () => {
    tracker.nextCalled = true;
  });
  assert(tracker.nextCalled, 'Super Admin user is permitted to access Super Admin route');

  // Super Admin accessing Sales Officer only route -> Forbidden
  tracker.nextCalled = false;
  statusResult = 0;
  salesOfficerRoleMiddleware(reqValidAuth, mockRes(), () => {
    tracker.nextCalled = true;
  });
  assert(!tracker.nextCalled && statusResult === 403, 'Role mismatch is rejected with HTTP 403 Forbidden');

  // Multi-role check
  const multiRoleMiddleware = requireRoles('Depot Person', 'Super Admin');
  tracker.nextCalled = false;
  multiRoleMiddleware(reqValidAuth, mockRes(), () => {
    tracker.nextCalled = true;
  });
  assert(tracker.nextCalled, 'Multi-role requirement permits user with matching role');

  // Case & Underscore Insensitivity check
  const codeRoleMiddleware = requireRoles('SUPER_ADMIN');
  tracker.nextCalled = false;
  codeRoleMiddleware(reqValidAuth, mockRes(), () => {
    tracker.nextCalled = true;
  });
  assert(tracker.nextCalled, 'Role middleware supports role codes (e.g. SUPER_ADMIN) and names');

  // Unauthenticated user hitting role middleware
  const reqUnauth: AuthenticatedRequest = { headers: {} } as any;
  statusResult = 0;
  superAdminRoleMiddleware(reqUnauth, mockRes(), () => {});
  assert(statusResult === 401, 'Unauthenticated user rejected by role middleware with 401');

  // Final Summary
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
