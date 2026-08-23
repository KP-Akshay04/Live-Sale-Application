import { prisma } from '../config/database.js';
import {
  CreateDepotDTO,
  UpdateDepotDTO,
  DepotFilterQuery,
  DepotResponseDTO,
} from '../types/depot.types.js';

export class DepotServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = 'DEPOT_SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'DepotServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface ParsedMetadata {
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
  gst?: string;
  salesTag?: string;
  assignedUser?: string;
  assignedLines?: string[];
  latitude?: number | null;
  longitude?: number | null;
  allowedRadius?: number | null;
}

interface DepotWithRelations {
  id: number;
  code: string;
  name: string;
  location: string | null;
  address: string | null;
  phone: string | null;
  sapPlantCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  users: Array<{
    id: number;
    loginId: string;
    employeeName: string;
    roleId: number;
    role?: {
      code: string;
      name: string;
    } | null;
  }>;
  depotLineSales: Array<{
    id: number;
    depotId: number;
    lineSaleId: number;
    isActive: boolean;
    lineSale: {
      id: number;
      partyCode: string;
      accountName: string;
    };
  }>;
}

export class DepotService {
  /**
   * Prisma include used consistently throughout the service.
   */
  private readonly depotInclude = {
    users: {
      include: {
        role: true,
      },
    },
    depotLineSales: {
      where: {
        isActive: true,
      },
      include: {
        lineSale: true,
      },
    },
  } as const;

  /**
   * Safely serializes structured Depot metadata into the existing
   * address/location database columns.
   *
   * IMPORTANT:
   * assignedLines is retained only as legacy metadata compatibility.
   * The authoritative Line Sale mapping is DepotLineSale.
   */
  private serializeAddressData(
    dto: CreateDepotDTO | UpdateDepotDTO,
    existingMeta?: ParsedMetadata
  ): {
    addressText: string;
    locationText: string;
  } {
    const meta: ParsedMetadata = {
      description:
        dto.description !== undefined
          ? dto.description
          : existingMeta?.description || '',

      addressLine1:
        dto.address !== undefined
          ? dto.address
          : existingMeta?.addressLine1 || '',

      addressLine2:
        dto.addressLine2 !== undefined
          ? dto.addressLine2
          : existingMeta?.addressLine2 || '',

      city:
        dto.city !== undefined
          ? dto.city
          : existingMeta?.city || '',

      district:
        dto.district !== undefined
          ? dto.district
          : existingMeta?.district || '',

      state:
        dto.state !== undefined
          ? dto.state
          : existingMeta?.state || 'Karnataka',

      pin:
        dto.pin !== undefined
          ? dto.pin
          : existingMeta?.pin || '',

      gst:
        dto.gst !== undefined
          ? dto.gst
          : existingMeta?.gst || '',

      salesTag:
        dto.salesTag !== undefined
          ? dto.salesTag
          : existingMeta?.salesTag || '',

      /*
       * assignedUser is retained for backward-compatible metadata,
       * but the actual User.depotId relation is authoritative.
       */
      assignedUser:
        dto.assignedUser !== undefined
          ? dto.assignedUser
          : existingMeta?.assignedUser || '',

      /*
       * Legacy compatibility only.
       * DepotLineSale is authoritative.
       */
      assignedLines:
        dto.assignedLines !== undefined
          ? dto.assignedLines
          : existingMeta?.assignedLines || [],

      latitude:
        dto.latitude !== undefined
          ? dto.latitude
          : existingMeta?.latitude ?? null,

      longitude:
        dto.longitude !== undefined
          ? dto.longitude
          : existingMeta?.longitude ?? null,

      allowedRadius:
        dto.allowedRadius !== undefined
          ? dto.allowedRadius
          : existingMeta?.allowedRadius ?? null,
    };

    const addressText = JSON.stringify(meta);

    const locationParts = [
      meta.city,
      meta.district,
      meta.state,
    ].filter(Boolean);

    const locationText =
      dto.location?.trim() ||
      locationParts.join(', ') ||
      'Karnataka, India';

    return {
      addressText,
      locationText,
    };
  }

  /**
   * Safely parses legacy JSON address metadata.
   */
  private parseAddressData(rawAddress: string | null): ParsedMetadata {
    if (!rawAddress) {
      return {};
    }

    try {
      if (
        rawAddress.trim().startsWith('{') &&
        rawAddress.trim().endsWith('}')
      ) {
        const parsed = JSON.parse(rawAddress);

        if (parsed && typeof parsed === 'object') {
          return parsed as ParsedMetadata;
        }
      }
    } catch {
      // Treat as legacy plain-text address.
    }

    return {
      addressLine1: rawAddress,
    };
  }

  /**
   * Converts a Prisma Depot record into the API response DTO.
   *
   * IMPORTANT:
   * assignedLines comes ONLY from DepotLineSale.
   */
  private formatDepot(
    depot: DepotWithRelations
  ): DepotResponseDTO {
    const meta = this.parseAddressData(depot.address);

    /*
     * Resolve assigned Depot Person from the real User.depotId relation.
     */
    let assignedUser = '';

    const depotPerson = depot.users.find(
      (user) =>
        user.role?.code === 'DEPOT_PERSON' ||
        user.role?.name === 'Depot Person'
    );

    if (depotPerson) {
      assignedUser = depotPerson.loginId;
    } else if (depot.users.length > 0) {
      assignedUser = depot.users[0].loginId;
    }

    /*
     * REAL DATABASE RELATIONSHIP:
     *
     * Depot
     *   -> DepotLineSale
     *      -> LineSaleAccount
     *
     * No JSON fallback.
     */
    const activeMappings = depot.depotLineSales.filter(
      (mapping) => mapping.isActive
    );

    const assignedLines = activeMappings.map(
      (mapping) => mapping.lineSale.partyCode
    );

    const primaryAddress =
      meta.addressLine1 || depot.address || '';

    const city =
      meta.city ||
      (depot.location
        ? depot.location.split(',')[0].trim()
        : '');

    const district = meta.district || city;
    const state = meta.state || 'Karnataka';

    return {
      id: depot.id,
      depotId: depot.id,

      code: depot.code,
      depotCode: depot.code,

      name: depot.name,
      siteName: depot.name,

      description: meta.description || '',

      location:
        depot.location ||
        `${city}, ${state}`,

      address: primaryAddress,

      addressLine2:
        meta.addressLine2 || '',

      city,
      district,
      state,

      pin: meta.pin || '',

      phone: depot.phone || '',
      contactNumber: depot.phone || '',

      gst: meta.gst || '',
      salesTag: meta.salesTag || '',

      sapPlantCode:
        depot.sapPlantCode || null,

      latitude:
        meta.latitude !== undefined
          ? meta.latitude
          : null,

      longitude:
        meta.longitude !== undefined
          ? meta.longitude
          : null,

      allowedRadius:
        meta.allowedRadius !== undefined
          ? meta.allowedRadius
          : null,

      isActive: depot.isActive,

      assignedUser,

      assignedLines,

      userCount: depot.users.length,

      lineSaleCount: activeMappings.length,

      createdAt: depot.createdAt,
      updatedAt: depot.updatedAt,
    };
  }

  /**
   * Validates coordinates.
   */
  private validateCoordinates(
    latitude?: number | null,
    longitude?: number | null,
    allowedRadius?: number | null
  ): void {
    if (
      latitude !== undefined &&
      latitude !== null
    ) {
      if (
        typeof latitude !== 'number' ||
        Number.isNaN(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        throw new DepotServiceError(
          'Latitude must be a valid numeric coordinate between -90 and 90 degrees.',
          400,
          'INVALID_COORDINATES'
        );
      }
    }

    if (
      longitude !== undefined &&
      longitude !== null
    ) {
      if (
        typeof longitude !== 'number' ||
        Number.isNaN(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new DepotServiceError(
          'Longitude must be a valid numeric coordinate between -180 and 180 degrees.',
          400,
          'INVALID_COORDINATES'
        );
      }
    }

    if (
      allowedRadius !== undefined &&
      allowedRadius !== null
    ) {
      if (
        typeof allowedRadius !== 'number' ||
        Number.isNaN(allowedRadius) ||
        allowedRadius < 0
      ) {
        throw new DepotServiceError(
          'Allowed radius must be a non-negative numeric value in meters.',
          400,
          'INVALID_ALLOWED_RADIUS'
        );
      }
    }
  }

  /**
   * Normalizes and validates Line Sale party codes.
   */
  private normalizeAssignedLines(
    assignedLines?: string[]
  ): string[] {
    if (!assignedLines) {
      return [];
    }

    if (!Array.isArray(assignedLines)) {
      throw new DepotServiceError(
        'assignedLines must be an array of Line Sale party codes.',
        400,
        'INVALID_LINE_SALE_MAPPING'
      );
    }

    const normalized = assignedLines
      .map((code) =>
        typeof code === 'string'
          ? code.trim()
          : ''
      )
      .filter(Boolean);

    return [...new Set(normalized)];
  }

  /**
   * Validates that all supplied Line Sale party codes exist.
   *
   * Returns the actual LineSaleAccount IDs required by DepotLineSale.
   */
  private async resolveLineSaleIds(
    tx: any,
    assignedLines: string[]
  ): Promise<number[]> {
    if (assignedLines.length === 0) {
      return [];
    }

    const lineSales =
      await tx.lineSaleAccount.findMany({
        where: {
          partyCode: {
            in: assignedLines,
          },
        },
        select: {
          id: true,
          partyCode: true,
          isActive: true,
        },
      });

    const foundCodes = new Set(
      lineSales.map(
        (lineSale: {
          partyCode: string;
        }) => lineSale.partyCode
      )
    );

    const missingCodes = assignedLines.filter(
      (code) => !foundCodes.has(code)
    );

    if (missingCodes.length > 0) {
      throw new DepotServiceError(
        `The following Line Sale accounts do not exist: ${missingCodes.join(', ')}.`,
        400,
        'INVALID_LINE_SALE_MAPPING'
      );
    }

    const inactiveCodes = lineSales
      .filter(
        (lineSale: {
          isActive: boolean;
        }) => !lineSale.isActive
      )
      .map(
        (lineSale: {
          partyCode: string;
        }) => lineSale.partyCode
      );

    if (inactiveCodes.length > 0) {
      throw new DepotServiceError(
        `Inactive Line Sale accounts cannot be assigned: ${inactiveCodes.join(', ')}.`,
        400,
        'INACTIVE_LINE_SALE_MAPPING'
      );
    }

    const idsByPartyCode = new Map<string, number>(
  lineSales.map(
    (lineSale: {
      id: number;
      partyCode: string;
    }) => [lineSale.partyCode, lineSale.id]
  )
);

    return assignedLines.map(
      (partyCode) => idsByPartyCode.get(partyCode)!
    );
  }

  /**
   * Resolves a Depot Person and returns the actual User ID.
   *
   * The assignment is relational through User.depotId.
   */
  private async resolveAssignedUser(
    tx: any,
    assignedUser?: string
  ): Promise<number | null> {
    const identifier =
      assignedUser?.trim();

    if (!identifier) {
      return null;
    }

    const user =
      await tx.user.findFirst({
        where: {
          OR: [
            {
              loginId: identifier,
            },
            {
              employeeId: identifier,
            },
          ],
          isActive: true,
        },
        include: {
          role: true,
        },
      });

    if (!user) {
      throw new DepotServiceError(
        `Assigned user '${identifier}' was not found or is inactive.`,
        400,
        'INVALID_DEPOT_USER'
      );
    }

    const isDepotPerson =
      user.role?.code === 'DEPOT_PERSON' ||
      user.role?.name === 'Depot Person';

    if (!isDepotPerson) {
      throw new DepotServiceError(
        `User '${identifier}' is not a Depot Person and cannot be assigned to a depot.`,
        400,
        'INVALID_DEPOT_USER_ROLE'
      );
    }

    return user.id;
  }

  /**
   * Synchronizes DepotLineSale mappings.
   *
   * This operation is intentionally executed inside the same Prisma
   * transaction as the Depot create/update.
   */
  private async synchronizeLineSaleMappings(
    tx: any,
    depotId: number,
    assignedLines?: string[]
  ): Promise<void> {
    if (assignedLines === undefined) {
      return;
    }

    const normalizedLines =
      this.normalizeAssignedLines(
        assignedLines
      );

    const lineSaleIds =
      await this.resolveLineSaleIds(
        tx,
        normalizedLines
      );

    /*
     * Replace the complete mapping set.
     *
     * Existing mappings not present in the submitted list are removed.
     * Existing mappings are recreated using createMany.
     */
    await tx.depotLineSale.deleteMany({
      where: {
        depotId,
      },
    });

    if (lineSaleIds.length === 0) {
      return;
    }

    await tx.depotLineSale.createMany({
      data: lineSaleIds.map(
        (lineSaleId) => ({
          depotId,
          lineSaleId,
          isActive: true,
        })
      ),
      skipDuplicates: true,
    });
  }

  /**
   * Synchronizes the single Depot Person assignment.
   */
  private async synchronizeAssignedUser(
    tx: any,
    depotId: number,
    assignedUser?: string
  ): Promise<void> {
    if (assignedUser === undefined) {
      return;
    }

    const userId =
      await this.resolveAssignedUser(
        tx,
        assignedUser
      );

    /*
     * Remove the current Depot Person assignment for this depot.
     */
    await tx.user.updateMany({
      where: {
        depotId,
        role: {
          OR: [
            {
              code: 'DEPOT_PERSON',
            },
            {
              name: 'Depot Person',
            },
          ],
        },
      },
      data: {
        depotId: null,
      },
    });

    /*
     * No assignment requested.
     */
    if (userId === null) {
      return;
    }

    /*
     * A user can belong to only one depot.
     * Move the selected Depot Person from any previous depot.
     */
    await tx.user.updateMany({
      where: {
        id: userId,
      },
      data: {
        depotId,
      },
    });
  }

  /**
   * Retrieves all depots with their real relational data.
   */
  async getDepots(
    filters: DepotFilterQuery = {}
  ): Promise<DepotResponseDTO[]> {
    const where: any = {};

    if (
      filters.search &&
      filters.search.trim()
    ) {
      const search =
        filters.search.trim();

      where.OR = [
        {
          name: {
            contains: search,
          },
        },
        {
          code: {
            contains: search,
          },
        },
        {
          location: {
            contains: search,
          },
        },
        {
          address: {
            contains: search,
          },
        },
      ];
    }

    if (
      filters.isActive !== undefined
    ) {
      where.isActive =
        filters.isActive;
    }

    if (
      filters.city &&
      filters.city.trim()
    ) {
      where.location = {
        contains:
          filters.city.trim(),
      };
    }

    if (
      filters.state &&
      filters.state.trim()
    ) {
      where.location = {
        ...(where.location || {}),
        contains:
          filters.state.trim(),
      };
    }

    try {
      const depots =
        await prisma.depot.findMany({
          where,
          include:
            this.depotInclude,
          orderBy: {
            createdAt: 'desc',
          },
        });

      return depots.map((depot) =>
        this.formatDepot(
          depot as unknown as DepotWithRelations
        )
      );
    } catch (error) {
      console.error(
        '[DepotService] Failed to retrieve depots:',
        error
      );

      throw new DepotServiceError(
        'Unable to retrieve depots from the database.',
        503,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Retrieves a single Depot by ID, code, or name.
   */
  async getDepotById(
    idOrCode: string | number
  ): Promise<DepotResponseDTO> {
    const identifier =
      String(idOrCode).trim();

    if (!identifier) {
      throw new DepotServiceError(
        'Depot identifier is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const numericId =
      typeof idOrCode === 'number'
        ? idOrCode
        : Number(identifier);

    try {
      const depot =
        await prisma.depot.findFirst({
          where:
            !Number.isNaN(numericId)
              ? {
                  OR: [
                    {
                      id: numericId,
                    },
                    {
                      code: identifier,
                    },
                    {
                      name: identifier,
                    },
                  ],
                }
              : {
                  OR: [
                    {
                      code: identifier,
                    },
                    {
                      name: identifier,
                    },
                  ],
                },
          include:
            this.depotInclude,
        });

      if (!depot) {
        throw new DepotServiceError(
          `Depot not found with identifier '${identifier}'.`,
          404,
          'DEPOT_NOT_FOUND'
        );
      }

      return this.formatDepot(
        depot as unknown as DepotWithRelations
      );
    } catch (error) {
      if (
        error instanceof DepotServiceError
      ) {
        throw error;
      }

      console.error(
        '[DepotService] Failed to retrieve depot:',
        error
      );

      throw new DepotServiceError(
        'Unable to retrieve the depot from the database.',
        503,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Creates a new Depot and all related mappings atomically.
   */
  async createDepot(
    dto: CreateDepotDTO,
    creatorUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DepotResponseDTO> {
    const rawName =
      dto.siteName || dto.name;

    const cleanName =
      rawName?.trim();

    if (
      !cleanName ||
      cleanName.length < 2
    ) {
      throw new DepotServiceError(
        'Depot Site Name is required (minimum 2 characters).',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (cleanName.length > 100) {
      throw new DepotServiceError(
        'Depot Site Name cannot exceed 100 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const rawCode =
      dto.depotCode ||
      dto.code ||
      cleanName
        .toUpperCase()
        .replace(
          /[^A-Z0-9]/g,
          '-'
        )
        .slice(0, 30);

    const cleanCode =
      rawCode.trim();

    if (
      !cleanCode ||
      cleanCode.length < 2
    ) {
      throw new DepotServiceError(
        'Depot Code is required (minimum 2 characters).',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (cleanCode.length > 50) {
      throw new DepotServiceError(
        'Depot Code cannot exceed 50 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    this.validateCoordinates(
      dto.latitude,
      dto.longitude,
      dto.allowedRadius
    );

    if (
      dto.sapPlantCode &&
      dto.sapPlantCode.trim()
        .length > 50
    ) {
      throw new DepotServiceError(
        'SAP Plant Code cannot exceed 50 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const cleanPhone =
      (
        dto.phone ||
        dto.contactNumber
      )
        ?.trim() || null;

    if (
      cleanPhone &&
      cleanPhone.length > 20
    ) {
      throw new DepotServiceError(
        'Contact phone number cannot exceed 20 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const normalizedLines =
      this.normalizeAssignedLines(
        dto.assignedLines
      );

    const {
      addressText,
      locationText,
    } =
      this.serializeAddressData(dto);

    try {
      const createdDepot =
        await prisma.$transaction(
          async (tx) => {
            const existingByCode =
              await tx.depot.findUnique({
                where: {
                  code: cleanCode,
                },
                select: {
                  id: true,
                },
              });

            if (existingByCode) {
              throw new DepotServiceError(
                `Depot with Code '${cleanCode}' already exists.`,
                409,
                'DUPLICATE_DEPOT_CODE'
              );
            }

            /*
             * Validate assigned user BEFORE creating the depot.
             */
            const assignedUserId =
              await this.resolveAssignedUser(
                tx,
                dto.assignedUser
              );

            /*
             * Validate Line Sales BEFORE creating the depot.
             */
            const lineSaleIds =
              await this.resolveLineSaleIds(
                tx,
                normalizedLines
              );

            const created =
              await tx.depot.create({
                data: {
                  code: cleanCode,
                  name: cleanName,
                  location:
                    locationText,
                  address:
                    addressText,
                  phone:
                    cleanPhone,
                  sapPlantCode:
                    dto.sapPlantCode
                      ?.trim() || null,
                  isActive:
                    dto.isActive !==
                    undefined
                      ? Boolean(
                          dto.isActive
                        )
                      : true,
                },
              });

            /*
             * Persist Depot <-> Line Sale mappings.
             */
            if (
              lineSaleIds.length > 0
            ) {
              await tx.depotLineSale.createMany(
                {
                  data:
                    lineSaleIds.map(
                      (
                        lineSaleId
                      ) => ({
                        depotId:
                          created.id,
                        lineSaleId,
                        isActive:
                          true,
                      })
                    ),
                  skipDuplicates:
                    true,
                }
              );
            }

            /*
             * Persist Depot Person assignment.
             */
            if (
              assignedUserId !==
              null
            ) {
              await tx.user.updateMany(
                {
                  where: {
                    id: assignedUserId,
                  },
                  data: {
                    depotId:
                      created.id,
                  },
                }
              );
            }

            /*
             * Return the fully related Depot.
             */
            return tx.depot.findUniqueOrThrow(
              {
                where: {
                  id: created.id,
                },
                include:
                  this.depotInclude,
              }
            );
          }
        );

      /*
       * Audit is intentionally outside the business transaction.
       * A logging failure must not undo a successful business operation.
       */
      try {
        await prisma.auditLog.create({
          data: {
            userId:
              creatorUserId || null,
            action:
              'DEPOT_CREATED',
            entityType:
              'Depot',
            entityId:
              String(
                createdDepot.id
              ),
            ipAddress:
              ipAddress || null,
            userAgent:
              userAgent || null,
            newValues:
              JSON.stringify({
                depotId:
                  createdDepot.id,
                code:
                  createdDepot.code,
                name:
                  createdDepot.name,
                location:
                  createdDepot.location,
                isActive:
                  createdDepot.isActive,
                sapPlantCode:
                  createdDepot.sapPlantCode,
                assignedLines:
                  createdDepot.depotLineSales.map(
                    (mapping) =>
                      mapping
                        .lineSale
                        .partyCode
                  ),
              }),
          },
        });
      } catch (auditError) {
        console.error(
          '[DepotService] Failed to create audit log:',
          auditError
        );
      }

      return this.formatDepot(
        createdDepot as unknown as DepotWithRelations
      );
    } catch (error) {
      if (
        error instanceof DepotServiceError
      ) {
        throw error;
      }

      console.error(
        '[DepotService] Failed to create depot:',
        error
      );

      throw new DepotServiceError(
        'Unable to create depot. The database operation was rolled back.',
        500,
        'DEPOT_CREATE_FAILED'
      );
    }
  }

  /**
   * Updates a Depot and synchronizes its relational mappings atomically.
   */
  async updateDepot(
    depotId: number,
    dto: UpdateDepotDTO,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DepotResponseDTO> {
    if (
      !Number.isInteger(depotId) ||
      depotId <= 0
    ) {
      throw new DepotServiceError(
        'Depot ID must be a valid positive integer.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const rawCode =
      dto.depotCode ||
      dto.code;

    if (
      rawCode !== undefined
    ) {
      const cleanCode =
        rawCode.trim();

      if (
        cleanCode.length < 2
      ) {
        throw new DepotServiceError(
          'Depot Code must be at least 2 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (
        cleanCode.length > 50
      ) {
        throw new DepotServiceError(
          'Depot Code cannot exceed 50 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    const rawName =
      dto.siteName ||
      dto.name;

    if (
      rawName !== undefined
    ) {
      const cleanName =
        rawName.trim();

      if (
        cleanName.length < 2
      ) {
        throw new DepotServiceError(
          'Depot Site Name must be at least 2 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (
        cleanName.length > 100
      ) {
        throw new DepotServiceError(
          'Depot Site Name cannot exceed 100 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    this.validateCoordinates(
      dto.latitude,
      dto.longitude,
      dto.allowedRadius
    );

    if (
      dto.sapPlantCode !==
      undefined
    ) {
      const cleanSap =
        dto.sapPlantCode
          ?.trim() || null;

      if (
        cleanSap &&
        cleanSap.length > 50
      ) {
        throw new DepotServiceError(
          'SAP Plant Code cannot exceed 50 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    const cleanPhone =
      (
        dto.phone !==
        undefined
          ? dto.phone
          : dto.contactNumber
      )?.trim();

    if (
      cleanPhone !==
        undefined &&
      cleanPhone &&
      cleanPhone.length > 20
    ) {
      throw new DepotServiceError(
        'Contact phone number cannot exceed 20 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const hasLineSaleUpdate =
      dto.assignedLines !==
      undefined;

    const hasUserUpdate =
      dto.assignedUser !==
      undefined;

    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            const existingDepot =
              await tx.depot.findUnique({
                where: {
                  id: depotId,
                },
                include:
                  this.depotInclude,
              });

            if (!existingDepot) {
              throw new DepotServiceError(
                `Depot with ID ${depotId} not found.`,
                404,
                'DEPOT_NOT_FOUND'
              );
            }

            const existingMeta =
              this.parseAddressData(
                existingDepot.address
              );

            const updateData: any =
              {};

            /*
             * Depot Code
             */
            if (
              rawCode !==
              undefined
            ) {
              const cleanCode =
                rawCode.trim();

              if (
                cleanCode !==
                existingDepot.code
              ) {
                const duplicate =
                  await tx.depot.findUnique(
                    {
                      where: {
                        code:
                          cleanCode,
                      },
                      select: {
                        id: true,
                      },
                    }
                  );

                if (
                  duplicate &&
                  duplicate.id !==
                    depotId
                ) {
                  throw new DepotServiceError(
                    `Depot with Code '${cleanCode}' is already registered to another depot.`,
                    409,
                    'DUPLICATE_DEPOT_CODE'
                  );
                }

                updateData.code =
                  cleanCode;
              }
            }

            /*
             * Depot Name
             */
            if (
              rawName !==
              undefined
            ) {
              updateData.name =
                rawName.trim();
            }

            /*
             * SAP Plant
             */
            if (
              dto.sapPlantCode !==
              undefined
            ) {
              updateData.sapPlantCode =
                dto.sapPlantCode
                  ?.trim() || null;
            }

            /*
             * Phone
             */
            if (
              cleanPhone !==
              undefined
            ) {
              updateData.phone =
                cleanPhone || null;
            }

            /*
             * Status
             */
            if (
              dto.isActive !==
              undefined
            ) {
              updateData.isActive =
                Boolean(
                  dto.isActive
                );
            }

            /*
             * Address / metadata
             */
            const {
              addressText,
              locationText,
            } =
              this.serializeAddressData(
                dto,
                existingMeta
              );

            updateData.address =
              addressText;

            updateData.location =
              locationText;

            /*
             * Update core Depot.
             */
            await tx.depot.update({
              where: {
                id: depotId,
              },
              data:
                updateData,
            });

            /*
             * Synchronize Line Sales ONLY when the field was supplied.
             *
             * This is important because partial updates must not
             * accidentally erase existing mappings.
             */
            if (
              hasLineSaleUpdate
            ) {
              await this.synchronizeLineSaleMappings(
                tx,
                depotId,
                dto.assignedLines
              );
            }

            /*
             * Synchronize assigned Depot Person ONLY when supplied.
             */
            if (
              hasUserUpdate
            ) {
              await this.synchronizeAssignedUser(
                tx,
                depotId,
                dto.assignedUser
              );
            }

            /*
             * Retrieve final state from MySQL inside transaction.
             */
            return tx.depot.findUniqueOrThrow(
              {
                where: {
                  id: depotId,
                },
                include:
                  this.depotInclude,
              }
            );
          }
        );

      /*
       * Audit log.
       */
      try {
        await prisma.auditLog.create({
          data: {
            userId:
              updaterUserId || null,
            action:
              'DEPOT_UPDATED',
            entityType:
              'Depot',
            entityId:
              String(
                result.id
              ),
            ipAddress:
              ipAddress || null,
            userAgent:
              userAgent || null,
            oldValues:
              JSON.stringify({
                depotId,
                code:
                  undefined,
              }),
            newValues:
              JSON.stringify({
                depotId:
                  result.id,
                code:
                  result.code,
                name:
                  result.name,
                isActive:
                  result.isActive,
                assignedUser:
                  result.users?.find(
                    (user) =>
                      user.role
                        ?.code ===
                        'DEPOT_PERSON' ||
                      user.role
                        ?.name ===
                        'Depot Person'
                  )?.loginId ||
                  null,
                assignedLines:
                  result.depotLineSales.map(
                    (mapping) =>
                      mapping
                        .lineSale
                        .partyCode
                  ),
              }),
          },
        });
      } catch (auditError) {
        console.error(
          '[DepotService] Failed to create audit log:',
          auditError
        );
      }

      return this.formatDepot(
        result as unknown as DepotWithRelations
      );
    } catch (error) {
      if (
        error instanceof DepotServiceError
      ) {
        throw error;
      }

      console.error(
        '[DepotService] Failed to update depot:',
        error
      );

      throw new DepotServiceError(
        'Unable to update depot. The database operation was rolled back.',
        500,
        'DEPOT_UPDATE_FAILED'
      );
    }
  }

  /**
   * Activates/deactivates a Depot.
   */
  async updateDepotStatus(
    depotId: number,
    isActive: boolean,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DepotResponseDTO> {
    if (
      !Number.isInteger(depotId) ||
      depotId <= 0
    ) {
      throw new DepotServiceError(
        'Depot ID must be a valid positive integer.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      typeof isActive !==
      'boolean'
    ) {
      throw new DepotServiceError(
        'isActive must be a boolean.',
        400,
        'VALIDATION_ERROR'
      );
    }

    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            const existingDepot =
              await tx.depot.findUnique({
                where: {
                  id: depotId,
                },
                select: {
                  id: true,
                  isActive: true,
                },
              });

            if (!existingDepot) {
              throw new DepotServiceError(
                `Depot with ID ${depotId} not found.`,
                404,
                'DEPOT_NOT_FOUND'
              );
            }

            await tx.depot.update({
              where: {
                id: depotId,
              },
              data: {
                isActive,
              },
            });

            return tx.depot.findUniqueOrThrow(
              {
                where: {
                  id: depotId,
                },
                include:
                  this.depotInclude,
              }
            );
          }
        );

      try {
        await prisma.auditLog.create({
          data: {
            userId:
              updaterUserId || null,
            action:
              isActive
                ? 'DEPOT_ACTIVATED'
                : 'DEPOT_DEACTIVATED',
            entityType:
              'Depot',
            entityId:
              String(
                result.id
              ),
            ipAddress:
              ipAddress || null,
            userAgent:
              userAgent || null,
            oldValues:
              JSON.stringify({
                isActive:
                  !isActive,
              }),
            newValues:
              JSON.stringify({
                isActive,
              }),
          },
        });
      } catch (auditError) {
        console.error(
          '[DepotService] Failed to create audit log:',
          auditError
        );
      }

      return this.formatDepot(
        result as unknown as DepotWithRelations
      );
    } catch (error) {
      if (
        error instanceof DepotServiceError
      ) {
        throw error;
      }

      console.error(
        '[DepotService] Failed to update depot status:',
        error
      );

      throw new DepotServiceError(
        'Unable to update depot status.',
        500,
        'DEPOT_STATUS_UPDATE_FAILED'
      );
    }
  }
}

export const depotService =
  new DepotService();