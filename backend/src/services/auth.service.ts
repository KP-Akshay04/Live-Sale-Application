import { prisma } from '../config/database.js';
import { hashPassword, comparePassword, signJwtToken } from '../utils/security.js';
import { SafeUser, LoginResponseData } from '../types/auth.types.js';

// Pre-computed constant hash to mitigate timing side-channel attacks during invalid login attempts
const DUMMY_HASH = '$2a$12$e8h1nU.mOaR2c4o2v2jG3uXzMv2oZzMv2oZzMv2oZzMv2oZzMv2oZ';

export class AuthenticationError extends Error {
  statusCode: number;
  code: string;

  constructor(message = 'Invalid login credentials', statusCode = 401, code = 'AUTH_FAILED') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class AuthService {
  /**
   * Authenticates a user by authoritative login identifier (loginId or employeeId) and password.
   * Uses timing-safe verification and returns a safe profile and signed JWT.
   */
  async login(
    loginId: string,
    plainPassword: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<LoginResponseData> {
    const cleanLoginId = loginId.trim();

    // Query user with relational role and depot using actual model fields
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: cleanLoginId },
          { employeeId: cleanLoginId },
        ],
      },
      include: {
        role: true,
        depot: true,
      },
    });

    // Timing-attack mitigation: if user not found, perform dummy hash compare
    if (!user) {
      await comparePassword(plainPassword, DUMMY_HASH);
      throw new AuthenticationError('Invalid login credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check account active status
    if (!user.isActive) {
      await comparePassword(plainPassword, DUMMY_HASH);
      throw new AuthenticationError('Account is inactive. Please contact administrator.', 403, 'ACCOUNT_INACTIVE');
    }

    // Compare supplied password with stored bcrypt hash
    const isPasswordValid = await comparePassword(plainPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid login credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Build safe user profile without password or hash
    const safeUser: SafeUser = {
      userId: user.id,
      employeeId: user.employeeId,
      employeeName: user.employeeName,
      loginId: user.loginId,
      phone: user.phone,
      role: user.role.name,
      roleCode: user.role.code,
      depotId: user.depotId,
      depotName: user.depot?.name || null,
      isActive: user.isActive,
    };

    // Generate signed JWT
    const token = signJwtToken({
      userId: user.id,
      role: user.role.name,
      roleCode: user.role.code,
      loginId: user.loginId,
      depotId: user.depotId,
    });

    // Record audit log asynchronously without blocking response
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: String(user.id),
          ipAddress: clientIp || null,
          userAgent: userAgent || null,
          newValues: JSON.stringify({ loginId: user.loginId, role: user.role.code }),
        },
      });
    } catch {
      // Audit log failures should not prevent legitimate login
    }

    return {
      user: safeUser,
      token,
    };
  }

  /**
   * Retrieves the current authenticated user's authoritative profile from the database.
   */
  async getCurrentUser(userId: number): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        depot: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is inactive', 403, 'ACCOUNT_INACTIVE');
    }

    return {
      userId: user.id,
      employeeId: user.employeeId,
      employeeName: user.employeeName,
      loginId: user.loginId,
      phone: user.phone,
      role: user.role.name,
      roleCode: user.role.code,
      depotId: user.depotId,
      depotName: user.depot?.name || null,
      isActive: user.isActive,
    };
  }
}

export const authService = new AuthService();
