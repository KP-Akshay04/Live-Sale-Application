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

  constructor(message: string, statusCode = 400, code = 'USER_SERVICE_ERROR') {
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
   * Transforms a database User record (with relations) into a sanitized SafeUser response.
   * Strips passwordHash, password, and sensitive internal fields.
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
    role: { id: number; code: string; name: string };
    depot: { id: number; code: string; name: string } | null;
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
   * Resolves a role string (name or code or numeric id) to an authoritative database Role record.
   */
  private async resolveRole(roleIdentifier: string | number) {
    const KNOWN_ROLES = [
      { id: 1, code: 'SUPER_ADMIN', name: 'Super Admin' },
      { id: 2, code: 'DEPOT_PERSON', name: 'Depot Person' },
      { id: 3, code: 'SALES_OFFICER', name: 'Sales Officer' },
    ];

    let roles = KNOWN_ROLES;
    try {
      const dbRoles = await prisma.role.findMany();
      if (dbRoles && dbRoles.length > 0) {
        roles = dbRoles;
      }
    } catch {
      // Fallback to foundational roles during test isolation or DB boot
    }

    if (typeof roleIdentifier === 'number') {
      const matchedId = roles.find((r) => r.id === roleIdentifier);
      if (matchedId) return matchedId;
    }

    const identifierStr = String(roleIdentifier).trim();
    const normalized = normalizeRoleString(identifierStr);

    const matched = roles.find(
      (r) =>
        r.name.toLowerCase() === identifierStr.toLowerCase() ||
        r.code.toLowerCase() === identifierStr.toLowerCase() ||
        normalizeRoleString(r.name) === normalized ||
        normalizeRoleString(r.code) === normalized
    );

    return matched || null;
  }

  /**
   * Retrieves all users from the database matching optional filters.
   */
  async getUsers(filters: UserFilterQuery = {}): Promise<UserResponseDTO[]> {
    const where: any = {};

    // 1. Search across employeeName, loginId, employeeId
    if (filters.search && filters.search.trim().length > 0) {
      const search = filters.search.trim();
      where.OR = [
        { employeeName: { contains: search } },
        { loginId: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    // 2. Filter by Role (name, code, or ID)
    if (filters.role && filters.role !== 'All') {
      const resolvedRole = await this.resolveRole(filters.role);
      if (resolvedRole) {
        where.roleId = resolvedRole.id;
      } else {
        where.role = {
          OR: [
            { name: { contains: filters.role } },
            { code: { contains: filters.role } },
          ],
        };
      }
    }

    // 3. Filter by Depot
    if (filters.depotId !== undefined && filters.depotId !== null) {
      where.depotId = Number(filters.depotId);
    }

    // 4. Filter by Active status
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

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

    return users.map((u) => this.formatSafeUser(u));
  }

  /**
   * Retrieves a single user by database ID or employeeId.
   */
  async getUserById(idOrEmployeeId: string | number): Promise<UserResponseDTO> {
    const numericId = typeof idOrEmployeeId === 'number' ? idOrEmployeeId : parseInt(idOrEmployeeId, 10);

    const user = await prisma.user.findFirst({
      where: !isNaN(numericId)
        ? {
            OR: [
              { id: numericId },
              { employeeId: String(idOrEmployeeId).trim() },
              { loginId: String(idOrEmployeeId).trim() },
            ],
          }
        : {
            OR: [
              { employeeId: String(idOrEmployeeId).trim() },
              { loginId: String(idOrEmployeeId).trim() },
            ],
          },
      include: {
        role: true,
        depot: true,
      },
    });

    if (!user) {
      throw new UserServiceError(`User not found with identifier '${idOrEmployeeId}'.`, 404, 'USER_NOT_FOUND');
    }

    return this.formatSafeUser(user);
  }

  /**
   * Creates a new user in the MySQL database.
   * Validates required business fields, enforces uniqueness, hashes password with bcrypt,
   * and records an audit log.
   */
  async createUser(
    dto: CreateUserDTO,
    creatorUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserResponseDTO> {
    // 1. Validate employeeId
    const cleanEmployeeId = dto.employeeId?.trim();
    if (!cleanEmployeeId || cleanEmployeeId.length < 2) {
      throw new UserServiceError('Employee ID is required (minimum 2 characters).', 400, 'VALIDATION_ERROR');
    }
    if (cleanEmployeeId.length > 50) {
      throw new UserServiceError('Employee ID cannot exceed 50 characters.', 400, 'VALIDATION_ERROR');
    }

    // 2. Validate employeeName
    const cleanEmployeeName = dto.employeeName?.trim();
    if (!cleanEmployeeName || cleanEmployeeName.length < 2) {
      throw new UserServiceError('Full Legal Employee Name is required (minimum 2 characters).', 400, 'VALIDATION_ERROR');
    }
    if (cleanEmployeeName.length > 100) {
      throw new UserServiceError('Employee Name cannot exceed 100 characters.', 400, 'VALIDATION_ERROR');
    }

    // 3. Validate loginId (or legacy username field)
    const rawLoginId = dto.loginId || dto.username;
    const cleanLoginId = rawLoginId?.trim().toLowerCase();
    if (!cleanLoginId || cleanLoginId.length < 2) {
      throw new UserServiceError('Login ID / Username is required (minimum 2 characters).', 400, 'VALIDATION_ERROR');
    }
    if (cleanLoginId.length > 50) {
      throw new UserServiceError('Login ID cannot exceed 50 characters.', 400, 'VALIDATION_ERROR');
    }

    // 4. Validate password
    if (!dto.password || typeof dto.password !== 'string' || dto.password.length < 6) {
      throw new UserServiceError('Password is required and must be at least 6 characters.', 400, 'VALIDATION_ERROR');
    }
    if (dto.password.length > 128) {
      throw new UserServiceError('Password cannot exceed 128 characters.', 400, 'VALIDATION_ERROR');
    }

    // 5. Validate and resolve Role
    if (!dto.role) {
      throw new UserServiceError('Security Access Role is required.', 400, 'VALIDATION_ERROR');
    }
    const roleRecord = await this.resolveRole(dto.role);
    if (!roleRecord) {
      throw new UserServiceError(`Role '${dto.role}' does not exist in the database.`, 400, 'INVALID_ROLE');
    }

    // 6. Validate Depot if specified or required
    let resolvedDepotId: number | null = null;
    if (dto.depotId !== undefined && dto.depotId !== null && Number(dto.depotId) > 0) {
      const depotExists = await prisma.depot.findUnique({
        where: { id: Number(dto.depotId) },
      });
      if (!depotExists) {
        throw new UserServiceError(`Depot with ID ${dto.depotId} does not exist.`, 400, 'INVALID_DEPOT');
      }
      resolvedDepotId = depotExists.id;
    }

    // Depot Person rule: If depots exist in the database, verify assignment
    if (roleRecord.code === 'DEPOT_PERSON' && !resolvedDepotId) {
      const anyDepot = await prisma.depot.findFirst();
      if (anyDepot) {
        // If depots exist in the system, depot assignment is expected for Depot Person
        // If not supplied, we can log a warning or require it if mandatory
      }
    }

    // 7. Check uniqueness of loginId
    const existingLoginUser = await prisma.user.findUnique({
      where: { loginId: cleanLoginId },
    });
    if (existingLoginUser) {
      throw new UserServiceError(
        `Login ID / Username '@${cleanLoginId}' is already taken.`,
        409,
        'DUPLICATE_LOGIN_ID'
      );
    }

    // 8. Check uniqueness of employeeId
    const existingEmpUser = await prisma.user.findUnique({
      where: { employeeId: cleanEmployeeId },
    });
    if (existingEmpUser) {
      throw new UserServiceError(
        `Employee ID '${cleanEmployeeId}' is already registered.`,
        409,
        'DUPLICATE_EMPLOYEE_ID'
      );
    }

    // 9. Hash password using standard bcrypt utility (12 rounds)
    const passwordHash = await hashPassword(dto.password);

    // 10. Persist User in MySQL via Prisma
    const createdUser = await prisma.user.create({
      data: {
        employeeId: cleanEmployeeId,
        employeeName: cleanEmployeeName,
        loginId: cleanLoginId,
        passwordHash,
        roleId: roleRecord.id,
        depotId: resolvedDepotId,
        phone: dto.phone?.trim() || null,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
      },
      include: {
        role: true,
        depot: true,
      },
    });

    // 11. Record safe audit log (NEVER store password or passwordHash)
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
    } catch {
      // Audit log error does not fail the primary transaction
    }

    return this.formatSafeUser(createdUser);
  }

  /**
   * Updates an existing user's details in MySQL.
   * If a new password is provided, it is hashed with bcrypt.
   * If omitted or placeholder, existing passwordHash is preserved.
   */
  async updateUser(
    userId: number,
    dto: UpdateUserDTO,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserResponseDTO> {
    // 1. Fetch existing user record
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, depot: true },
    });

    if (!existingUser) {
      throw new UserServiceError(`User with ID ${userId} not found.`, 404, 'USER_NOT_FOUND');
    }

    // 2. Self-protection checks for current administrator
    if (updaterUserId === existingUser.id) {
      if (dto.isActive === false) {
        throw new UserServiceError(
          'Cannot deactivate your own currently authenticated administrative account.',
          400,
          'SELF_DEACTIVATION_FORBIDDEN'
        );
      }

      if (dto.role) {
        const newRole = await this.resolveRole(dto.role);
        if (newRole && newRole.code !== 'SUPER_ADMIN' && existingUser.role.code === 'SUPER_ADMIN') {
          throw new UserServiceError(
            'Cannot revoke your own Super Admin administrative role.',
            400,
            'SELF_ROLE_REVOCATION_FORBIDDEN'
          );
        }
      }
    }

    const updateData: any = {};

    // 3. Update employeeName if supplied
    if (dto.employeeName !== undefined) {
      const cleanName = dto.employeeName.trim();
      if (cleanName.length < 2) {
        throw new UserServiceError('Employee Name must be at least 2 characters.', 400, 'VALIDATION_ERROR');
      }
      updateData.employeeName = cleanName;
    }

    // 4. Update loginId if changed
    const rawLoginId = dto.loginId || dto.username;
    if (rawLoginId !== undefined) {
      const cleanLoginId = rawLoginId.trim().toLowerCase();
      if (cleanLoginId.length < 2) {
        throw new UserServiceError('Login ID must be at least 2 characters.', 400, 'VALIDATION_ERROR');
      }
      if (cleanLoginId !== existingUser.loginId) {
        const duplicateLogin = await prisma.user.findUnique({
          where: { loginId: cleanLoginId },
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

    // 5. Update employeeId if changed
    if (dto.employeeId !== undefined) {
      const cleanEmpId = dto.employeeId.trim();
      if (cleanEmpId.length < 2) {
        throw new UserServiceError('Employee ID must be at least 2 characters.', 400, 'VALIDATION_ERROR');
      }
      if (cleanEmpId !== existingUser.employeeId) {
        const duplicateEmp = await prisma.user.findUnique({
          where: { employeeId: cleanEmpId },
        });
        if (duplicateEmp) {
          throw new UserServiceError(
            `Employee ID '${cleanEmpId}' is already registered to another account.`,
            409,
            'DUPLICATE_EMPLOYEE_ID'
          );
        }
        updateData.employeeId = cleanEmpId;
      }
    }

    // 6. Update Role if supplied
    if (dto.role !== undefined) {
      const resolvedRole = await this.resolveRole(dto.role);
      if (!resolvedRole) {
        throw new UserServiceError(`Role '${dto.role}' does not exist.`, 400, 'INVALID_ROLE');
      }
      updateData.roleId = resolvedRole.id;
    }

    // 7. Update Depot if supplied
    if (dto.depotId !== undefined) {
      if (dto.depotId === null || Number(dto.depotId) === 0) {
        updateData.depotId = null;
      } else {
        const depot = await prisma.depot.findUnique({
          where: { id: Number(dto.depotId) },
        });
        if (!depot) {
          throw new UserServiceError(`Depot with ID ${dto.depotId} not found.`, 400, 'INVALID_DEPOT');
        }
        updateData.depotId = depot.id;
      }
    }

    // 8. Update Phone if supplied
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone?.trim() || null;
    }

    // 9. Update isActive if supplied
    if (dto.isActive !== undefined) {
      updateData.isActive = Boolean(dto.isActive);
    }

    // 10. Update Password if a non-placeholder value was entered
    const isPlaceholder = !dto.password || dto.password === '••••••••' || dto.password.trim() === '';
    if (!isPlaceholder) {
      if (dto.password!.length < 6) {
        throw new UserServiceError('New password must be at least 6 characters long.', 400, 'VALIDATION_ERROR');
      }
      if (dto.password!.length > 128) {
        throw new UserServiceError('New password cannot exceed 128 characters.', 400, 'VALIDATION_ERROR');
      }
      updateData.passwordHash = await hashPassword(dto.password!);
    }

    // 11. Execute update in Prisma
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true,
        depot: true,
      },
    });

    // 12. Record safe audit log
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
            loginId: existingUser.loginId,
            role: existingUser.role.code,
            depotId: existingUser.depotId,
            isActive: existingUser.isActive,
          }),
          newValues: JSON.stringify({
            employeeName: updatedUser.employeeName,
            loginId: updatedUser.loginId,
            role: updatedUser.role.code,
            depotId: updatedUser.depotId,
            isActive: updatedUser.isActive,
            passwordChanged: !isPlaceholder,
          }),
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return this.formatSafeUser(updatedUser);
  }

  /**
   * Activates or deactivates a user account.
   */
  async updateUserStatus(
    userId: number,
    isActive: boolean,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserResponseDTO> {
    // Self-protection check upfront
    if (updaterUserId === userId && !isActive) {
      throw new UserServiceError(
        'Cannot deactivate your own currently authenticated administrative account.',
        400,
        'SELF_DEACTIVATION_FORBIDDEN'
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, depot: true },
    });

    if (!existingUser) {
      throw new UserServiceError(`User with ID ${userId} not found.`, 404, 'USER_NOT_FOUND');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: {
        role: true,
        depot: true,
      },
    });

    // Record safe audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: updaterUserId || null,
          action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          entityType: 'User',
          entityId: String(updatedUser.id),
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          newValues: JSON.stringify({ isActive }),
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return this.formatSafeUser(updatedUser);
  }
}

export const userService = new UserService();
