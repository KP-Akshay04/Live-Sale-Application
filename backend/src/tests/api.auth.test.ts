/**
 * Integration Test for Auth API Endpoints
 */
import { authController } from '../controllers/auth.controller.js';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';

async function runApiTests() {
  console.log('=== BINDU PHASE 2: AUTH CONTROLLER INTEGRATION TESTS ===\n');
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

  // 1. Validation - Missing loginId
  console.log('--- 1. Request Body Validation ---');
  let res = createMockResponse();
  await authController.login({ body: { password: 'somepassword' } } as Request, res, () => {});
  assert(res.getStatusCode() === 400 && res.getBody()?.error?.code === 'VALIDATION_ERROR', 'Missing loginId returns 400 VALIDATION_ERROR');

  // 2. Validation - Empty loginId
  res = createMockResponse();
  await authController.login({ body: { loginId: '   ', password: 'somepassword' } } as Request, res, () => {});
  assert(res.getStatusCode() === 400, 'Empty loginId returns 400 VALIDATION_ERROR');

  // 3. Validation - Missing password
  res = createMockResponse();
  await authController.login({ body: { loginId: 'admin' } } as Request, res, () => {});
  assert(res.getStatusCode() === 400, 'Missing password returns 400 VALIDATION_ERROR');

  // 4. Validation - Exceeding max length
  res = createMockResponse();
  await authController.login({ body: { loginId: 'a'.repeat(101), password: 'somepassword' } } as Request, res, () => {});
  assert(res.getStatusCode() === 400, 'Overly long loginId returns 400 VALIDATION_ERROR');

  // 5. Logout endpoint
  console.log('\n--- 2. Logout Endpoint ---');
  res = createMockResponse();
  await authController.logout({} as Request, res);
  assert(res.getStatusCode() === 200 && res.getBody()?.success === true, 'POST /api/auth/logout returns 200 success');

  // 6. getMe unauthenticated
  console.log('\n--- 3. /api/auth/me Endpoint ---');
  res = createMockResponse();
  await authController.getMe({} as AuthenticatedRequest, res, () => {});
  assert(res.getStatusCode() === 401, 'Unauthenticated getMe returns 401 AUTH_REQUIRED');

  console.log(`\n=== API RESULTS: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runApiTests().catch((e) => {
  console.error('API Test error:', e);
  process.exit(1);
});
