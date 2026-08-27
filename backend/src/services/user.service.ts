import { prisma } from '../config/database.js';
import { hashPassword } from '../utils/security.js';
import { SafeUser } from '../types/auth.types.js';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserFilterQuery,
  UserResponseDTO,
} from '../types/user.types.js';

export class UserServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = 'USER_SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'UserServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeRoleString(role: string): string {
  return role.toLowerCase().replace(/[\s_-]+/g, '');
}

export class UserService {
  /**
   * Convert a Prisma User record into the safe API representation.
   *
   * Password hashes and other sensitive fields are never returned.
   */
  private formatSafeUser(user: {
    id: number;
    employeeId: string;
    employeeName: string;
    loginId: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    roleId: number;
    depotId: number | null;
    role: {
      id: number;
      code: string;
      name: string;
    };
    depot: {
      id: number;
      code: string;
      name: string;
    } | null;
  }): UserResponseDTO {
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Resolve a role from:
   * - numeric database ID
   * - role name
   * - role code
   *
   * The database is authoritative.
   */
  private async resolveRole(roleIdentifier: string | number) {
    if (
      roleIdentifier === undefined ||
      roleIdentifier === null ||
      String(roleIdentifier).trim() === ''
    ) {
      return null;
    }

    const roles = await prisma.role.findMany();

    if (typeof roleIdentifier === 'number') {
      return roles.find((role) => role.id === roleIdentifier) || null;
    }

    const identifier = String(roleIdentifier).trim();
    const normalized = normalizeRoleString(identifier);

    return (
      roles.find(
        (role) =>
          role.name.toLowerCase() === identifier.toLowerCase() ||
          role.code.toLowerCase() === identifier.toLowerCase() ||
          normalizeRoleString(role.name) === normalized ||
          normalizeRoleString(role.code) === normalized
      ) || null
    );
  }

  /**
   * Retrieve users from MySQL.
   *
   * IMPORTANT:
   * There is deliberately no in-memory fallback.
   * The database is the single source of truth.
   */
  async getUsers(filters: UserFilterQuery = {}): Promise<UserResponseDTO[]> {
    const where: any = {};

    if (filters.search?.trim()) {
      const search = filters.search.trim();

      where.OR = [
        {
          employeeName: {
            contains: search,
          },
        },
        {
          loginId: {
            contains: search,
          },
        },
        {
          employeeId: {
            contains: search,
          },
        },
      ];
    }

    if (filters.role && filters.role !== 'All') {
      const resolvedRole = await this.resolveRole(filters.role);

      if (!resolvedRole) {
        throw new UserServiceError(
          `Role '${filters.role}' does not exist.`,
          400,
          'INVALID_ROLE'
        );
      }

      where.roleId = resolvedRole.id;
    }

    if (filters.depotId !== undefined && filters.depotId !== null) {
      const depotId = Number(filters.depotId);

      if (!Number.isInteger(depotId) || depotId <= 0) {
        throw new UserServiceError(
          'Depot ID must be a valid positive integer.',
          400,
          'INVALID_DEPOT_ID'
        );
      }

      where.depotId = depotId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    try {
      const users = await prisma.user.findMany({
        where,
        include: {
          role: true,
          depot: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users.map((user) => this.formatSafeUser(user));
    } catch (error) {
      console.error('[UserService] Failed to retrieve users:', error);

      throw new UserServiceError(
        'Unable to retrieve users from the database.',
        500,
        'DATABASE_READ_ERROR'
      );
    }
  }

  /**
   * Retrieve one user by:
   * - database ID
   * - employee ID
   * - login ID
   */
  async getUserById(
    idOrEmployeeId: string | number
  ): Promise<UserResponseDTO> {
    const identifier = String(idOrEmployeeId).trim();

    if (!identifier) {
      throw new UserServiceError(
        'User identifier is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const numericId = Number(identifier);

    const where = Number.isInteger(numericId)
      ? {
          OR: [
            {
              id: numericId,
            },
            {
              employeeId: identifier,
            },
            {
              loginId: identifier.toLowerCase(),
            },
          ],
        }
      : {
          OR: [
            {
              employeeId: identifier,
            },
            {
              loginId: identifier.toLowerCase(),
            },
          ],
        };

    try {
      const user = await prisma.user.findFirst({
        where,
        include: {
          role: true,
          depot: true,
        },
      });

      if (!user) {
        throw new UserServiceError(
          `User not found with identifier '${identifier}'.`,
          404,
          'USER_NOT_FOUND'
        );
      }

      return this.formatSafeUser(user);
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }

      console.error('[UserService] Failed to retrieve user:', error);

      throw new UserServiceError(
        'Unable to retrieve the requested user from the database.',
        500,
        'DATABASE_READ_ERROR'
      );
    }
  }

  /**
   * Create a new user.
   */
  async createUser(
    dto: CreateUserDTO,
    creatorUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserResponseDTO> {
    const cleanEmployeeId = dto.employeeId?.trim();

    if (!cleanEmployeeId || cleanEmployeeId.length < 2) {
      throw new UserServiceError(
        'Employee ID is required (minimum 2 characters).',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (cleanEmployeeId.length > 50) {
      throw new UserServiceError(
        'Employee ID cannot exceed 50 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const cleanEmployeeName = dto.employeeName?.trim();

    if (!cleanEmployeeName || cleanEmployeeName.length < 2) {
      throw new UserServiceError(
        'Full Legal Employee Name is required (minimum 2 characters).',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (cleanEmployeeName.length > 100) {
      throw new UserServiceError(
        'Employee Name cannot exceed 100 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const rawLoginId = dto.loginId || dto.username;
    const cleanLoginId = rawLoginId?.trim().toLowerCase();

    if (!cleanLoginId || cleanLoginId.length < 2) {
      throw new UserServiceError(
        'Login ID / Username is required (minimum 2 characters).',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (cleanLoginId.length > 50) {
      throw new UserServiceError(
        'Login ID cannot exceed 50 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      !dto.password ||
      typeof dto.password !== 'string' ||
      dto.password.length < 6
    ) {
      throw new UserServiceError(
        'Password is required and must be at least 6 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (dto.password.length > 128) {
      throw new UserServiceError(
        'Password cannot exceed 128 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!dto.role) {
      throw new UserServiceError(
        'Security Access Role is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const roleRecord = await this.resolveRole(dto.role);

    if (!roleRecord) {
      throw new UserServiceError(
        `Role '${dto.role}' does not exist in the database.`,
        400,
        'INVALID_ROLE'
      );
    }

    let resolvedDepotId: number | null = null;

    if (
      dto.depotId !== undefined &&
      dto.depotId !== null
    ) {
      const depotId = Number(dto.depotId);

      if (!Number.isInteger(depotId) || depotId <= 0) {
        throw new UserServiceError(
          'Depot ID must be a valid positive integer.',
          400,
          'INVALID_DEPOT_ID'
        );
      }

      const depotExists = await prisma.depot.findUnique({
        where: {
          id: depotId,
        },
      });

      if (!depotExists) {
        throw new UserServiceError(
          `Depot with ID ${depotId} does not exist.`,
          400,
          'INVALID_DEPOT'
        );
      }

      resolvedDepotId = depotExists.id;
    }

    /**
     * Operational roles require a depot assignment.
     *
     * Super Admin is the only role that may operate without a depot.
     */
    if (
      roleRecord.code !== 'SUPER_ADMIN' &&
      resolvedDepotId === null
    ) {
      throw new UserServiceError(
        `${roleRecord.name} must be assigned to a depot.`,
        400,
        'DEPOT_REQUIRED'
      );
    }

    /**
     * Super Admin should not be assigned to an operational depot.
     */
    if (
      roleRecord.code === 'SUPER_ADMIN' &&
      resolvedDepotId !== null
    ) {
      throw new UserServiceError(
        'Super Admin accounts cannot be assigned to a depot.',
        400,
        'INVALID_DEPOT_ASSIGNMENT'
      );
    }

    const existingLoginUser = await prisma.user.findUnique({
      where: {
        loginId: cleanLoginId,
      },
    });

    if (existingLoginUser) {
      throw new UserServiceError(
        `Login ID / Username '@${cleanLoginId}' is already taken.`,
        409,
        'DUPLICATE_LOGIN_ID'
      );
    }

    const existingEmpUser = await prisma.user.findUnique({
      where: {
        employeeId: cleanEmployeeId,
      },
    });

    if (existingEmpUser) {
      throw new UserServiceError(
        `Employee ID '${cleanEmployeeId}' is already registered.`,
        409,
        'DUPLICATE_EMPLOYEE_ID'
      );
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      const createdUser = await prisma.user.create({
        data: {
          employeeId: cleanEmployeeId,
          employeeName: cleanEmployeeName,
          loginId: cleanLoginId,
          passwordHash,
          roleId: roleRecord.id,
          depotId: resolvedDepotId,
          phone: dto.phone?.trim() || null,
          isActive:
            dto.isActive !== undefined
              ? Boolean(dto.isActive)
              : true,
        },
        include: {
          role: true,
          depot: true,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            userId: creatorUserId || null,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: String(createdUser.id),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            newValues: JSON.stringify({
              userId: createdUser.id,
              employeeId: createdUser.employeeId,
              employeeName: createdUser.employeeName,
              loginId: createdUser.loginId,
              role: createdUser.role.code,
              depotId: createdUser.depotId,
              isActive: createdUser.isActive,
            }),
          },
        });
      } catch (auditError) {
        console.error(
          '[UserService] Audit log failed for USER_CREATED:',
          auditError
        );
      }

      return this.formatSafeUser(createdUser);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new UserServiceError(
          'A user with the supplied unique information already exists.',
          409,
          'DUPLICATE_USER'
        );
      }

      console.error('[UserService] Failed to create user:', error);

      throw new UserServiceError(
        'Unable to create the user in the database.',
        500,
        'DATABASE_WRITE_ERROR'
      );
    }
  }

  /**
   * Update an existing user.
   */
  async updateUser(
    userId: number,
    dto: UpdateUserDTO,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserResponseDTO> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UserServiceError(
        'User ID must be a valid positive integer.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
        depot: true,
      },
    });

    if (!existingUser) {
      throw new UserServiceError(
        `User with ID ${userId} not found.`,
        404,
        'USER_NOT_FOUND'
      );
    }

    if (updaterUserId === existingUser.id) {
      if (dto.isActive === false) {
        throw new UserServiceError(
          'Cannot deactivate your own currently authenticated administrative account.',
          400,
          'SELF_DEACTIVATION_FORBIDDEN'
        );
      }

      if (dto.role !== undefined) {
        const newRole = await this.resolveRole(dto.role);

        if (
          newRole &&
          existingUser.role.code === 'SUPER_ADMIN' &&
          newRole.code !== 'SUPER_ADMIN'
        ) {
          throw new UserServiceError(
            'Cannot revoke your own Super Admin administrative role.',
            400,
            'SELF_ROLE_REVOCATION_FORBIDDEN'
          );
        }
      }
    }

    const updateData: any = {};

    if (dto.employeeName !== undefined) {
      const cleanName = dto.employeeName.trim();

      if (cleanName.length < 2) {
        throw new UserServiceError(
          'Employee Name must be at least 2 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (cleanName.length > 100) {
        throw new UserServiceError(
          'Employee Name cannot exceed 100 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      updateData.employeeName = cleanName;
    }

    const rawLoginId = dto.loginId || dto.username;

    if (rawLoginId !== undefined) {
      const cleanLoginId = rawLoginId.trim().toLowerCase();

      if (cleanLoginId.length < 2) {
        throw new UserServiceError(
          'Login ID must be at least 2 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (cleanLoginId.length > 50) {
        throw new UserServiceError(
          'Login ID cannot exceed 50 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (cleanLoginId !== existingUser.loginId) {
        const duplicateLogin = await prisma.user.findUnique({
          where: {
            loginId: cleanLoginId,
          },
        });

        if (duplicateLogin) {
          throw new UserServiceError(
            `Login ID / Username '@${cleanLoginId}' is already taken by another account.`,
            409,
            'DUPLICATE_LOGIN_ID'
          );
        }

        updateData.loginId = cleanLoginId;
      }
    }

    if (dto.employeeId !== undefined) {
      const cleanEmployeeId = dto.employeeId.trim();

      if (cleanEmployeeId.length < 2) {
        throw new UserServiceError(
          'Employee ID must be at least 2 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (cleanEmployeeId.length > 50) {
        throw new UserServiceError(
          'Employee ID cannot exceed 50 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (cleanEmployeeId !== existingUser.employeeId) {
        const duplicateEmployee = await prisma.user.findUnique({
          where: {
            employeeId: cleanEmployeeId,
          },
        });

        if (duplicateEmployee) {
          throw new UserServiceError(
            `Employee ID '${cleanEmployeeId}' is already registered to another account.`,
            409,
            'DUPLICATE_EMPLOYEE_ID'
          );
        }

        updateData.employeeId = cleanEmployeeId;
      }
    }

    let resolvedRole = existingUser.role;

    if (dto.role !== undefined) {
      const roleRecord = await this.resolveRole(dto.role);

      if (!roleRecord) {
        throw new UserServiceError(
          `Role '${dto.role}' does not exist.`,
          400,
          'INVALID_ROLE'
        );
      }

      resolvedRole = roleRecord;
      updateData.roleId = roleRecord.id;
    }

    let resolvedDepotId = existingUser.depotId;

    if (dto.depotId !== undefined) {
      if (
        dto.depotId === null ||
        Number(dto.depotId) === 0
      ) {
        resolvedDepotId = null;
      } else {
        const depotId = Number(dto.depotId);

        if (!Number.isInteger(depotId) || depotId <= 0) {
          throw new UserServiceError(
            'Depot ID must be a valid positive integer.',
            400,
            'INVALID_DEPOT_ID'
          );
        }

        const depot = await prisma.depot.findUnique({
          where: {
            id: depotId,
          },
        });

        if (!depot) {
          throw new UserServiceError(
            `Depot with ID ${depotId} not found.`,
            400,
            'INVALID_DEPOT'
          );
        }

        resolvedDepotId = depot.id;
      }

      updateData.depotId = resolvedDepotId;
    }

    /**
     * Validate final role/depot combination.
     */
    if (
      resolvedRole.code !== 'SUPER_ADMIN' &&
      resolvedDepotId === null
    ) {
      throw new UserServiceError(
        `${resolvedRole.name} must be assigned to a depot.`,
        400,
        'DEPOT_REQUIRED'
      );
    }

    if (
      resolvedRole.code === 'SUPER_ADMIN' &&
      resolvedDepotId !== null
    ) {
      throw new UserServiceError(
        'Super Admin accounts cannot be assigned to a depot.',
        400,
        'INVALID_DEPOT_ASSIGNMENT'
      );
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone?.trim() || null;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = Boolean(dto.isActive);
    }

    const isPlaceholder =
      !dto.password ||
      dto.password === '••••••••' ||
      dto.password.trim() === '';

    if (!isPlaceholder) {
      if (dto.password!.length < 6) {
        throw new UserServiceError(
          'New password must be at least 6 characters long.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (dto.password!.length > 128) {
        throw new UserServiceError(
          'New password cannot exceed 128 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      updateData.passwordHash = await hashPassword(dto.password!);
    }

    try {
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: updateData,
        include: {
          role: true,
          depot: true,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            userId: updaterUserId || null,
            action: 'USER_UPDATED',
            entityType: 'User',
            entityId: String(updatedUser.id),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            oldValues: JSON.stringify({
              employeeName: existingUser.employeeName,
              employeeId: existingUser.employeeId,
              loginId: existingUser.loginId,
              role: existingUser.role.code,
              depotId: existingUser.depotId,
              isActive: existingUser.isActive,
            }),
            newValues: JSON.stringify({
              employeeName: updatedUser.employeeName,
              employeeId: updatedUser.employeeId,
              loginId: updatedUser.loginId,
              role: updatedUser.role.code,
              depotId: updatedUser.depotId,
              isActive: updatedUser.isActive,
              passwordChanged: !isPlaceholder,
            }),
          },
        });
      } catch (auditError) {
        console.error(
          '[UserService] Audit log failed for USER_UPDATED:',
          auditError
        );
      }

      return this.formatSafeUser(updatedUser);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new UserServiceError(
          'A user with the supplied unique information already exists.',
          409,
          'DUPLICATE_USER'
        );
      }

      console.error('[UserService] Failed to update user:', error);

      throw new UserServiceError(
        'Unable to update the user in the database.',
        500,
        'DATABASE_WRITE_ERROR'
      );
    }
  }

  /**
   * Activate/deactivate a user.
   */
  async updateUserStatus(
    userId: number,
    isActive: boolean,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserResponseDTO> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UserServiceError(
        'User ID must be a valid positive integer.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      updaterUserId === userId &&
      !isActive
    ) {
      throw new UserServiceError(
        'Cannot deactivate your own currently authenticated administrative account.',
        400,
        'SELF_DEACTIVATION_FORBIDDEN'
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
        depot: true,
      },
    });

    if (!existingUser) {
      throw new UserServiceError(
        `User with ID ${userId} not found.`,
        404,
        'USER_NOT_FOUND'
      );
    }

    try {
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          isActive,
        },
        include: {
          role: true,
          depot: true,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            userId: updaterUserId || null,
            action: isActive
              ? 'USER_ACTIVATED'
              : 'USER_DEACTIVATED',
            entityType: 'User',
            entityId: String(updatedUser.id),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            oldValues: JSON.stringify({
              isActive: existingUser.isActive,
            }),
            newValues: JSON.stringify({
              isActive: updatedUser.isActive,
            }),
          },
        });
      } catch (auditError) {
        console.error(
          '[UserService] Audit log failed for USER_STATUS_UPDATE:',
          auditError
        );
      }

      return this.formatSafeUser(updatedUser);
    } catch (error) {
      console.error(
        '[UserService] Failed to update user status:',
        error
      );

      throw new UserServiceError(
        'Unable to update the user account status in the database.',
        500,
        'DATABASE_WRITE_ERROR'
      );
    }
  }
}

export const userService = new UserService();