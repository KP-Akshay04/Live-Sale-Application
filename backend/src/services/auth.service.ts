import { prisma } from '../config/database.js';
import {
  hashPassword,
  comparePassword,
  signJwtToken,
} from '../utils/security.js';
import {
  SafeUser,
  LoginResponseData,
} from '../types/auth.types.js';

// Pre-computed constant hash to mitigate timing side-channel attacks
// during invalid login attempts.
const DUMMY_HASH =
  '$2a$12$e8h1nU.mOaR2c4o2v2jG3uXzMv2oZzMv2oZ';

export class AuthenticationError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message = 'Invalid login credentials',
    statusCode = 401,
    code = 'AUTH_FAILED'
  ) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class AuthService {
  /**
   * Authenticates a user by authoritative login identifier
   * (loginId or employeeId) and password.
   */
  async login(
    loginId: string,
    plainPassword: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<LoginResponseData> {
    const cleanLoginId = loginId.trim();

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

    // Timing-attack mitigation when user is not found.
    if (!user) {
      await comparePassword(
        plainPassword,
        DUMMY_HASH
      );

      throw new AuthenticationError(
        'Invalid login credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Check account active status.
    if (!user.isActive) {
      await comparePassword(
        plainPassword,
        DUMMY_HASH
      );

      throw new AuthenticationError(
        'Account is inactive. Please contact administrator.',
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    // Compare supplied password with stored bcrypt hash.
    const isPasswordValid =
      await comparePassword(
        plainPassword,
        user.passwordHash
      );

    if (!isPasswordValid) {
      throw new AuthenticationError(
        'Invalid login credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Build safe user profile.
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

    // Generate signed JWT.
    const token = signJwtToken({
      userId: user.id,
      role: user.role.name,
      roleCode: user.role.code,
      loginId: user.loginId,
      depotId: user.depotId,
    });

    // Record login audit.
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: String(user.id),
          ipAddress: clientIp || null,
          userAgent: userAgent || null,
          newValues: JSON.stringify({
            loginId: user.loginId,
            role: user.role.code,
          }),
        },
      });
    } catch {
      // Audit failure must not prevent legitimate login.
    }

    return {
      user: safeUser,
      token,
    };
  }

  /**
   * Retrieves the current authenticated user's
   * authoritative profile from the database.
   */
  async getCurrentUser(
    userId: number
  ): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
        depot: true,
      },
    });

    if (!user) {
      throw new AuthenticationError(
        'User not found',
        404,
        'USER_NOT_FOUND'
      );
    }

    if (!user.isActive) {
      throw new AuthenticationError(
        'User account is inactive',
        403,
        'ACCOUNT_INACTIVE'
      );
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

  /**
   * Change password for the currently authenticated user.
   *
   * The current password is verified against the database
   * before the new password is hashed and persisted.
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<void> {
    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      throw new AuthenticationError(
        'Invalid authenticated user.',
        401,
        'AUTH_REQUIRED'
      );
    }

    if (
      !currentPassword ||
      typeof currentPassword !== 'string'
    ) {
      throw new AuthenticationError(
        'Current password is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      !newPassword ||
      typeof newPassword !== 'string'
    ) {
      throw new AuthenticationError(
        'New password is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (newPassword.length < 6) {
      throw new AuthenticationError(
        'New password must be at least 6 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (newPassword.length > 128) {
      throw new AuthenticationError(
        'New password cannot exceed 128 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new AuthenticationError(
        'Authenticated user was not found.',
        404,
        'USER_NOT_FOUND'
      );
    }

    if (!user.isActive) {
      throw new AuthenticationError(
        'User account is inactive.',
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    // Verify current password.
    const currentPasswordValid =
      await comparePassword(
        currentPassword,
        user.passwordHash
      );

    if (!currentPasswordValid) {
      throw new AuthenticationError(
        'Current password is incorrect.',
        401,
        'CURRENT_PASSWORD_INVALID'
      );
    }

    // Prevent changing to the same password.
    const samePassword =
      await comparePassword(
        newPassword,
        user.passwordHash
      );

    if (samePassword) {
      throw new AuthenticationError(
        'New password must be different from your current password.',
        400,
        'PASSWORD_UNCHANGED'
      );
    }

    // Hash the new password.
    const newPasswordHash =
      await hashPassword(newPassword);

    // Persist new password hash to MySQL.
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Record password change without storing
    // the password or password hash.
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_CHANGED',
          entityType: 'User',
          entityId: String(user.id),
          ipAddress: clientIp || null,
          userAgent: userAgent || null,
          oldValues: JSON.stringify({
            passwordChanged: true,
          }),
          newValues: JSON.stringify({
            passwordChanged: true,
          }),
        },
      });
    } catch {
      // Audit failure must not undo successful password update.
    }
  }
}

export const authService = new AuthService();