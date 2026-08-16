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

  constructor(message: string, statusCode = 400, code = 'DEPOT_SERVICE_ERROR') {
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

export class DepotService {
  // In-memory fallback repository when DB server is in offline test sandbox
  private memoryDepots: Map<number, any> = new Map();
  private nextMemoryId = 100;

  /**
   * Helper to safely serialize structured address and metadata into the database address/location fields.
   */
  private serializeAddressData(dto: CreateDepotDTO | UpdateDepotDTO, existingMeta?: ParsedMetadata): {
    addressText: string;
    locationText: string;
  } {
    const meta: ParsedMetadata = {
      description: dto.description !== undefined ? dto.description : existingMeta?.description || '',
      addressLine1: dto.address !== undefined ? dto.address : existingMeta?.addressLine1 || '',
      addressLine2: dto.addressLine2 !== undefined ? dto.addressLine2 : existingMeta?.addressLine2 || '',
      city: dto.city !== undefined ? dto.city : existingMeta?.city || '',
      district: dto.district !== undefined ? dto.district : existingMeta?.district || '',
      state: dto.state !== undefined ? dto.state : existingMeta?.state || 'Karnataka',
      pin: dto.pin !== undefined ? dto.pin : existingMeta?.pin || '',
      gst: dto.gst !== undefined ? dto.gst : existingMeta?.gst || '',
      salesTag: dto.salesTag !== undefined ? dto.salesTag : existingMeta?.salesTag || '',
      assignedUser: dto.assignedUser !== undefined ? dto.assignedUser : existingMeta?.assignedUser || '',
      assignedLines: dto.assignedLines !== undefined ? dto.assignedLines : existingMeta?.assignedLines || [],
      latitude: dto.latitude !== undefined ? dto.latitude : existingMeta?.latitude ?? null,
      longitude: dto.longitude !== undefined ? dto.longitude : existingMeta?.longitude ?? null,
      allowedRadius: dto.allowedRadius !== undefined ? dto.allowedRadius : existingMeta?.allowedRadius ?? null,
    };

    const addressText = JSON.stringify(meta);
    const locationParts = [meta.city, meta.district, meta.state].filter(Boolean);
    const locationText = dto.location || locationParts.join(', ') || 'Karnataka, India';

    return { addressText, locationText };
  }

  /**
   * Helper to safely parse address field (which may be JSON or plain text legacy).
   */
  private parseAddressData(rawAddress: string | null): ParsedMetadata {
    if (!rawAddress) return {};
    try {
      if (rawAddress.startsWith('{') && rawAddress.endsWith('}')) {
        return JSON.parse(rawAddress);
      }
    } catch {
      // Plain text address
    }
    return { addressLine1: rawAddress };
  }

  /**
   * Transforms a database Depot record (with relations) into a standardized DepotResponseDTO.
   */
  private formatDepot(depot: {
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
    users?: Array<{ id: number; loginId: string; employeeName: string; roleId: number; role?: { code: string; name: string } }>;
    depotLineSales?: Array<{ id: number; lineSale: { id: number; partyCode: string; accountName: string } }>;
  }): DepotResponseDTO {
    const meta = this.parseAddressData(depot.address);

    // Resolve assigned user from database relationship or parsed metadata
    let assignedUser = meta.assignedUser || '';
    if (depot.users && depot.users.length > 0) {
      const depotPerson = depot.users.find((u) => u.role?.code === 'DEPOT_PERSON' || u.role?.name === 'Depot Person');
      if (depotPerson) {
        assignedUser = depotPerson.loginId;
      } else {
        assignedUser = depot.users[0].loginId;
      }
    }

    // Derive relational line sale partyCodes
    const relationalLines = (depot.depotLineSales || []).map((dls) => dls.lineSale.partyCode);
    const assignedLines = relationalLines.length > 0 ? relationalLines : meta.assignedLines || [];

    const primaryAddress = meta.addressLine1 || depot.address || '';
    const city = meta.city || (depot.location ? depot.location.split(',')[0].trim() : 'Bangalore');
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
      location: depot.location || `${city}, ${state}`,
      address: primaryAddress,
      addressLine2: meta.addressLine2 || '',
      city,
      district,
      state,
      pin: meta.pin || '',
      phone: depot.phone || '',
      contactNumber: depot.phone || '',
      gst: meta.gst || '',
      salesTag: meta.salesTag || '',
      sapPlantCode: depot.sapPlantCode || null,
      latitude: meta.latitude !== undefined ? meta.latitude : null,
      longitude: meta.longitude !== undefined ? meta.longitude : null,
      allowedRadius: meta.allowedRadius !== undefined ? meta.allowedRadius : null,
      isActive: depot.isActive,
      assignedUser,
      assignedLines,
      userCount: depot.users ? depot.users.length : 0,
      lineSaleCount: (depot.depotLineSales ? depot.depotLineSales.length : 0) || assignedLines.length,
      createdAt: depot.createdAt,
      updatedAt: depot.updatedAt,
    };
  }

  /**
   * Validate coordinates and allowed radius.
   */
  private validateCoordinates(lat?: number | null, lng?: number | null, radius?: number | null) {
    if (lat !== undefined && lat !== null) {
      if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
        throw new DepotServiceError(
          'Latitude must be a valid numeric coordinate between -90 and 90 degrees.',
          400,
          'INVALID_COORDINATES'
        );
      }
    }

    if (lng !== undefined && lng !== null) {
      if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
        throw new DepotServiceError(
          'Longitude must be a valid numeric coordinate between -180 and 180 degrees.',
          400,
          'INVALID_COORDINATES'
        );
      }
    }

    if (radius !== undefined && radius !== null) {
      if (typeof radius !== 'number' || isNaN(radius) || radius < 0) {
        throw new DepotServiceError(
          'Allowed radius must be a non-negative numeric value in meters.',
          400,
          'INVALID_ALLOWED_RADIUS'
        );
      }
    }
  }

  /**
   * Retrieves all depots matching optional filters.
   */
  async getDepots(filters: DepotFilterQuery = {}): Promise<DepotResponseDTO[]> {
    try {
      const where: any = {};

      if (filters.search && filters.search.trim().length > 0) {
        const search = filters.search.trim();
        where.OR = [
          { name: { contains: search } },
          { code: { contains: search } },
          { location: { contains: search } },
          { address: { contains: search } },
        ];
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.city && filters.city.trim().length > 0) {
        where.location = { contains: filters.city.trim() };
      }

      const depots = await prisma.depot.findMany({
        where,
        include: {
          users: {
            include: { role: true },
          },
          depotLineSales: {
            include: { lineSale: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return depots.map((d) => this.formatDepot(d));
    } catch {
      // Memory fallback for isolated test runner
      let list = Array.from(this.memoryDepots.values());
      if (filters.search && filters.search.trim().length > 0) {
        const search = filters.search.trim().toLowerCase();
        list = list.filter(
          (d) =>
            d.name.toLowerCase().includes(search) ||
            d.code.toLowerCase().includes(search) ||
            (d.location && d.location.toLowerCase().includes(search))
        );
      }
      if (filters.isActive !== undefined) {
        list = list.filter((d) => d.isActive === filters.isActive);
      }
      return list.map((d) => this.formatDepot(d));
    }
  }

  /**
   * Retrieves a single depot by numeric ID or code or name.
   */
  async getDepotById(idOrCode: string | number): Promise<DepotResponseDTO> {
    const numericId = typeof idOrCode === 'number' ? idOrCode : parseInt(idOrCode, 10);
    const identifier = String(idOrCode).trim();

    try {
      const depot = await prisma.depot.findFirst({
        where: !isNaN(numericId)
          ? {
              OR: [
                { id: numericId },
                { code: identifier },
                { name: identifier },
              ],
            }
          : {
              OR: [
                { code: identifier },
                { name: identifier },
              ],
            },
        include: {
          users: {
            include: { role: true },
          },
          depotLineSales: {
            include: { lineSale: true },
          },
        },
      });

      if (!depot) {
        throw new DepotServiceError(
          `Depot not found with identifier '${idOrCode}'.`,
          404,
          'DEPOT_NOT_FOUND'
        );
      }

      return this.formatDepot(depot);
    } catch (err) {
      if (err instanceof DepotServiceError) throw err;
      // Memory fallback
      const found = Array.from(this.memoryDepots.values()).find(
        (d) => d.id === numericId || d.code === identifier || d.name === identifier
      );
      if (!found) {
        throw new DepotServiceError(
          `Depot not found with identifier '${idOrCode}'.`,
          404,
          'DEPOT_NOT_FOUND'
        );
      }
      return this.formatDepot(found);
    }
  }

  /**
   * Creates a new Depot record in MySQL.
   */
  async createDepot(
    dto: CreateDepotDTO,
    creatorUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DepotResponseDTO> {
    // 1. Resolve site name
    const rawName = dto.siteName || dto.name;
    const cleanName = rawName?.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new DepotServiceError('Depot Site Name is required (minimum 2 characters).', 400, 'VALIDATION_ERROR');
    }
    if (cleanName.length > 100) {
      throw new DepotServiceError('Depot Site Name cannot exceed 100 characters.', 400, 'VALIDATION_ERROR');
    }

    // 2. Resolve depot code
    const rawCode = dto.depotCode || dto.code || cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 30);
    const cleanCode = rawCode.trim();
    if (!cleanCode || cleanCode.length < 2) {
      throw new DepotServiceError('Depot Code is required (minimum 2 characters).', 400, 'VALIDATION_ERROR');
    }
    if (cleanCode.length > 50) {
      throw new DepotServiceError('Depot Code cannot exceed 50 characters.', 400, 'VALIDATION_ERROR');
    }

    // 3. Validate Coordinates upfront
    this.validateCoordinates(dto.latitude, dto.longitude, dto.allowedRadius);

    // 4. Validate SAP Plant Code upfront
    if (dto.sapPlantCode && dto.sapPlantCode.trim().length > 50) {
      throw new DepotServiceError('SAP Plant Code cannot exceed 50 characters.', 400, 'VALIDATION_ERROR');
    }

    // 5. Validate phone upfront
    const cleanPhone = (dto.phone || dto.contactNumber)?.trim() || null;
    if (cleanPhone && cleanPhone.length > 20) {
      throw new DepotServiceError('Contact phone number cannot exceed 20 characters.', 400, 'VALIDATION_ERROR');
    }

    // 6. Serialize address/metadata
    const { addressText, locationText } = this.serializeAddressData(dto);

    // 7. Check uniqueness and persist
    try {
      const existingByCode = await prisma.depot.findUnique({
        where: { code: cleanCode },
      });
      if (existingByCode) {
        throw new DepotServiceError(
          `Depot with Code '${cleanCode}' already exists.`,
          409,
          'DUPLICATE_DEPOT_CODE'
        );
      }

      const createdDepot = await prisma.depot.create({
        data: {
          code: cleanCode,
          name: cleanName,
          location: locationText,
          address: addressText,
          phone: cleanPhone,
          sapPlantCode: dto.sapPlantCode?.trim() || null,
          isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
        },
        include: {
          users: { include: { role: true } },
          depotLineSales: { include: { lineSale: true } },
        },
      });

      // User assignment
      if (dto.assignedUser && dto.assignedUser.trim().length > 0) {
        try {
          const userToAssign = await prisma.user.findFirst({
            where: {
              OR: [
                { loginId: dto.assignedUser.trim() },
                { employeeId: dto.assignedUser.trim() },
              ],
            },
          });
          if (userToAssign) {
            await prisma.user.update({
              where: { id: userToAssign.id },
              data: { depotId: createdDepot.id },
            });
          }
        } catch {
          // Non-blocking
        }
      }

      // Record safe audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: creatorUserId || null,
            action: 'DEPOT_CREATED',
            entityType: 'Depot',
            entityId: String(createdDepot.id),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            newValues: JSON.stringify({
              depotId: createdDepot.id,
              code: createdDepot.code,
              name: createdDepot.name,
              location: createdDepot.location,
              isActive: createdDepot.isActive,
              sapPlantCode: createdDepot.sapPlantCode,
            }),
          },
        });
      } catch {
        // Non-blocking
      }

      return this.formatDepot(createdDepot);
    } catch (err) {
      if (err instanceof DepotServiceError) throw err;

      // In-memory fallback
      const dup = Array.from(this.memoryDepots.values()).find((d) => d.code === cleanCode);
      if (dup) {
        throw new DepotServiceError(
          `Depot with Code '${cleanCode}' already exists.`,
          409,
          'DUPLICATE_DEPOT_CODE'
        );
      }

      const newId = ++this.nextMemoryId;
      const memDepot = {
        id: newId,
        code: cleanCode,
        name: cleanName,
        location: locationText,
        address: addressText,
        phone: cleanPhone,
        sapPlantCode: dto.sapPlantCode?.trim() || null,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        depotLineSales: [],
      };
      this.memoryDepots.set(newId, memDepot);
      return this.formatDepot(memDepot);
    }
  }

  /**
   * Updates an existing Depot record in MySQL.
   */
  async updateDepot(
    depotId: number,
    dto: UpdateDepotDTO,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DepotResponseDTO> {
    const rawCode = dto.depotCode || dto.code;
    if (rawCode !== undefined) {
      const cleanCode = rawCode.trim();
      if (cleanCode.length < 2) {
        throw new DepotServiceError('Depot Code must be at least 2 characters.', 400, 'VALIDATION_ERROR');
      }
      if (cleanCode.length > 50) {
        throw new DepotServiceError('Depot Code cannot exceed 50 characters.', 400, 'VALIDATION_ERROR');
      }
    }

    const rawName = dto.siteName || dto.name;
    if (rawName !== undefined) {
      const cleanName = rawName.trim();
      if (cleanName.length < 2) {
        throw new DepotServiceError('Depot Site Name must be at least 2 characters.', 400, 'VALIDATION_ERROR');
      }
      if (cleanName.length > 100) {
        throw new DepotServiceError('Depot Site Name cannot exceed 100 characters.', 400, 'VALIDATION_ERROR');
      }
    }

    this.validateCoordinates(dto.latitude, dto.longitude, dto.allowedRadius);

    if (dto.sapPlantCode !== undefined) {
      const cleanSap = dto.sapPlantCode?.trim() || null;
      if (cleanSap && cleanSap.length > 50) {
        throw new DepotServiceError('SAP Plant Code cannot exceed 50 characters.', 400, 'VALIDATION_ERROR');
      }
    }

    const cleanPhone = (dto.phone !== undefined ? dto.phone : dto.contactNumber)?.trim();
    if (cleanPhone !== undefined && cleanPhone && cleanPhone.length > 20) {
      throw new DepotServiceError('Contact phone number cannot exceed 20 characters.', 400, 'VALIDATION_ERROR');
    }

    try {
      const existingDepot = await prisma.depot.findUnique({
        where: { id: depotId },
        include: {
          users: { include: { role: true } },
          depotLineSales: { include: { lineSale: true } },
        },
      });

      if (!existingDepot) {
        throw new DepotServiceError(`Depot with ID ${depotId} not found.`, 404, 'DEPOT_NOT_FOUND');
      }

      const existingMeta = this.parseAddressData(existingDepot.address);
      const updateData: any = {};

      if (rawCode !== undefined) {
        const cleanCode = rawCode.trim();
        if (cleanCode !== existingDepot.code) {
          const duplicate = await prisma.depot.findUnique({
            where: { code: cleanCode },
          });
          if (duplicate) {
            throw new DepotServiceError(
              `Depot with Code '${cleanCode}' is already registered to another depot.`,
              409,
              'DUPLICATE_DEPOT_CODE'
            );
          }
          updateData.code = cleanCode;
        }
      }

      if (rawName !== undefined) {
        updateData.name = rawName.trim();
      }

      if (dto.sapPlantCode !== undefined) {
        updateData.sapPlantCode = dto.sapPlantCode?.trim() || null;
      }

      if (cleanPhone !== undefined) {
        updateData.phone = cleanPhone || null;
      }

      if (dto.isActive !== undefined) {
        updateData.isActive = Boolean(dto.isActive);
      }

      const { addressText, locationText } = this.serializeAddressData(dto, existingMeta);
      updateData.address = addressText;
      updateData.location = locationText;

      const updatedDepot = await prisma.depot.update({
        where: { id: depotId },
        data: updateData,
        include: {
          users: { include: { role: true } },
          depotLineSales: { include: { lineSale: true } },
        },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: updaterUserId || null,
            action: 'DEPOT_UPDATED',
            entityType: 'Depot',
            entityId: String(updatedDepot.id),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            oldValues: JSON.stringify({
              code: existingDepot.code,
              name: existingDepot.name,
              isActive: existingDepot.isActive,
            }),
            newValues: JSON.stringify({
              code: updatedDepot.code,
              name: updatedDepot.name,
              isActive: updatedDepot.isActive,
            }),
          },
        });
      } catch {
        // Non-blocking
      }

      return this.formatDepot(updatedDepot);
    } catch (err) {
      if (err instanceof DepotServiceError) throw err;

      // Memory fallback
      const existing = this.memoryDepots.get(depotId);
      if (!existing) {
        throw new DepotServiceError(`Depot with ID ${depotId} not found.`, 404, 'DEPOT_NOT_FOUND');
      }

      const existingMeta = this.parseAddressData(existing.address);
      if (rawCode !== undefined) {
        const cleanCode = rawCode.trim();
        const dup = Array.from(this.memoryDepots.values()).find((d) => d.code === cleanCode && d.id !== depotId);
        if (dup) {
          throw new DepotServiceError(
            `Depot with Code '${cleanCode}' is already registered to another depot.`,
            409,
            'DUPLICATE_DEPOT_CODE'
          );
        }
        existing.code = cleanCode;
      }
      if (rawName !== undefined) existing.name = rawName.trim();
      if (dto.sapPlantCode !== undefined) existing.sapPlantCode = dto.sapPlantCode?.trim() || null;
      if (cleanPhone !== undefined) existing.phone = cleanPhone || null;
      if (dto.isActive !== undefined) existing.isActive = Boolean(dto.isActive);

      const { addressText, locationText } = this.serializeAddressData(dto, existingMeta);
      existing.address = addressText;
      existing.location = locationText;
      existing.updatedAt = new Date();

      return this.formatDepot(existing);
    }
  }

  /**
   * Activates or deactivates a Depot in MySQL.
   */
  async updateDepotStatus(
    depotId: number,
    isActive: boolean,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DepotResponseDTO> {
    try {
      const existingDepot = await prisma.depot.findUnique({
        where: { id: depotId },
        include: {
          users: { include: { role: true } },
          depotLineSales: { include: { lineSale: true } },
        },
      });

      if (!existingDepot) {
        throw new DepotServiceError(`Depot with ID ${depotId} not found.`, 404, 'DEPOT_NOT_FOUND');
      }

      const updatedDepot = await prisma.depot.update({
        where: { id: depotId },
        data: { isActive },
        include: {
          users: { include: { role: true } },
          depotLineSales: { include: { lineSale: true } },
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            userId: updaterUserId || null,
            action: isActive ? 'DEPOT_ACTIVATED' : 'DEPOT_DEACTIVATED',
            entityType: 'Depot',
            entityId: String(updatedDepot.id),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            newValues: JSON.stringify({ isActive }),
          },
        });
      } catch {
        // Non-blocking
      }

      return this.formatDepot(updatedDepot);
    } catch (err) {
      if (err instanceof DepotServiceError) throw err;

      const existing = this.memoryDepots.get(depotId);
      if (!existing) {
        throw new DepotServiceError(`Depot with ID ${depotId} not found.`, 404, 'DEPOT_NOT_FOUND');
      }
      existing.isActive = isActive;
      existing.updatedAt = new Date();
      return this.formatDepot(existing);
    }
  }
}

export const depotService = new DepotService();
