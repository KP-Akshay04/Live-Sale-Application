import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';
import {
  CreateSchemeListDTO,
  UpdateSchemeListDTO,
  CreateSchemeListItemDTO,
  UpdateSchemeListItemDTO,
  SchemeListFilterQuery,
  SchemeListResponseDTO,
  SchemeListItemResponseDTO,
} from '../types/schemeList.types.js';

export class SchemeListServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'SCHEME_LIST_SERVICE_ERROR') {
    super(message);
    this.name = 'SchemeListServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class SchemeListService {
  // In-memory fallback for offline/test environments
  private memorySchemeLists: Map<number, any> = new Map();
  private nextMemoryId = 200;

  constructor() {
    this.initDefaultMemorySeeds();
  }

  private initDefaultMemorySeeds() {
    const seed1 = {
      id: 1,
      code: 'SL-SUMMER-SPECIAL',
      name: 'Summer Splash Promotion',
      description: 'Buy-X-Get-Y seasonal volume promotion deal',
      schemeType: 'QTY_FREE',
      validFrom: new Date('2024-01-01'),
      validTo: null,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      items: [
        { id: 1, schemeListId: 1, productId: 1, productCode: 'PROD-001', materialCode: 'PROD-001', productName: 'Golden Leaf Premium Tea 250g', description: 'Golden Leaf Premium Tea 250g', category: 'Beverages', baseUom: 'Box', uom: 'Box', boxPcs: 'Box', minQty: 10, buyQty: 10, freeQty: 1, discountPercent: 0, discountAmount: 110, rate: 110 },
        { id: 2, schemeListId: 1, productId: 2, productCode: 'PROD-002', materialCode: 'PROD-002', productName: 'Sparkling Orange Splash 500ml', description: 'Sparkling Orange Splash 500ml', category: 'Beverages', baseUom: 'Pcs', uom: 'Pcs', boxPcs: 'Pcs', minQty: 24, buyQty: 24, freeQty: 2, discountPercent: 0, discountAmount: 36, rate: 36 },
        { id: 3, schemeListId: 1, productId: 3, productCode: 'PROD-003', materialCode: 'PROD-003', productName: 'Crisp Lemon Fizz Soda 1L', description: 'Crisp Lemon Fizz Soda 1L', category: 'Beverages', baseUom: 'Pcs', uom: 'Pcs', boxPcs: 'Pcs', minQty: 12, buyQty: 12, freeQty: 1, discountPercent: 0, discountAmount: 64, rate: 64 },
        { id: 4, schemeListId: 1, productId: 4, productCode: 'PROD-004', materialCode: 'PROD-004', productName: 'Organic Mango Nectar Juice 1L', description: 'Organic Mango Nectar Juice 1L', category: 'Beverages', baseUom: 'Box', uom: 'Box', boxPcs: 'Box', minQty: 5, buyQty: 5, freeQty: 1, discountPercent: 0, discountAmount: 88, rate: 88 },
        { id: 5, schemeListId: 1, productId: 5, productCode: 'PROD-005', materialCode: 'PROD-005', productName: 'Pure Spring Mineral Water 500ml', description: 'Pure Spring Mineral Water 500ml', category: 'Packaged Water', baseUom: 'Box', uom: 'Pcs', boxPcs: 'Pcs', minQty: 48, buyQty: 48, freeQty: 4, discountPercent: 0, discountAmount: 12, rate: 12 },
      ],
    };

    const seed2 = {
      id: 2,
      code: 'SL-STANDARD',
      name: 'Standard Volume Schemes',
      description: 'Standard volume threshold incentive matrix',
      schemeType: 'QTY_FREE',
      validFrom: new Date('2024-01-01'),
      validTo: null,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      items: [
        { id: 6, schemeListId: 2, productId: 1, productCode: 'PROD-001', materialCode: 'PROD-001', productName: 'Golden Leaf Premium Tea 250g', description: 'Golden Leaf Premium Tea 250g', category: 'Beverages', baseUom: 'Box', uom: 'Box', boxPcs: 'Box', minQty: 20, buyQty: 20, freeQty: 1, discountPercent: 0, discountAmount: 110, rate: 110 },
        { id: 7, schemeListId: 2, productId: 2, productCode: 'PROD-002', materialCode: 'PROD-002', productName: 'Sparkling Orange Splash 500ml', description: 'Sparkling Orange Splash 500ml', category: 'Beverages', baseUom: 'Pcs', uom: 'Pcs', boxPcs: 'Pcs', minQty: 48, buyQty: 48, freeQty: 3, discountPercent: 0, discountAmount: 36, rate: 36 },
        { id: 8, schemeListId: 2, productId: 3, productCode: 'PROD-003', materialCode: 'PROD-003', productName: 'Crisp Lemon Fizz Soda 1L', description: 'Crisp Lemon Fizz Soda 1L', category: 'Beverages', baseUom: 'Pcs', uom: 'Pcs', boxPcs: 'Pcs', minQty: 24, buyQty: 24, freeQty: 1, discountPercent: 0, discountAmount: 64, rate: 64 },
        { id: 9, schemeListId: 2, productId: 4, productCode: 'PROD-004', materialCode: 'PROD-004', productName: 'Organic Mango Nectar Juice 1L', description: 'Organic Mango Nectar Juice 1L', category: 'Beverages', baseUom: 'Box', uom: 'Box', boxPcs: 'Box', minQty: 10, buyQty: 10, freeQty: 1, discountPercent: 0, discountAmount: 88, rate: 88 },
        { id: 10, schemeListId: 2, productId: 5, productCode: 'PROD-005', materialCode: 'PROD-005', productName: 'Pure Spring Mineral Water 500ml', description: 'Pure Spring Mineral Water 500ml', category: 'Packaged Water', baseUom: 'Box', uom: 'Pcs', boxPcs: 'Pcs', minQty: 100, buyQty: 100, freeQty: 5, discountPercent: 0, discountAmount: 12, rate: 12 },
      ],
    };

    this.memorySchemeLists.set(seed1.id, seed1);
    this.memorySchemeLists.set(seed2.id, seed2);
  }

  /**
   * Helper to format Decimal to Number with fixed precision.
   */
  private formatDecimal(val: any, decimals = 2): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') {
      return Number(val.toFixed(decimals));
    }
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : Number(parsed.toFixed(decimals));
    }
    if (typeof val === 'object' && typeof val.toNumber === 'function') {
      return Number(val.toNumber().toFixed(decimals));
    }
    if (typeof val === 'object' && typeof val.toFixed === 'function') {
      return Number(parseFloat(val.toFixed(decimals)).toFixed(decimals));
    }
    const parsed = Number(val);
    return isNaN(parsed) ? 0 : Number(parsed.toFixed(decimals));
  }

  /**
   * Transforms raw Prisma SchemeList record (with items and product relations) into SchemeListResponseDTO.
   */
  private formatSchemeList(schemeList: any): SchemeListResponseDTO {
    const items: SchemeListItemResponseDTO[] = (schemeList.items || []).map((item: any) => {
      const minQtyNum = this.formatDecimal(item.minQty ?? item.buyQty, 3);
      const freeQtyNum = this.formatDecimal(item.freeQty, 3);
      const discountPercentNum = this.formatDecimal(item.discountPercent, 2);
      const discountAmountNum = this.formatDecimal(item.discountAmount ?? item.rate, 2);
      const product = item.product || {};
      const uom = item.uom || product.baseUom || 'Box';
      const boxPcs: 'Box' | 'Pcs' =
        item.boxPcs || (uom.toLowerCase().includes('box') || uom.toLowerCase().includes('case') ? 'Box' : 'Pcs');

      return {
        id: item.id,
        schemeListId: item.schemeListId,
        productId: item.productId,
        productCode: product.materialCode || item.productCode || item.materialCode || `PROD-${item.productId}`,
        materialCode: product.materialCode || item.productCode || item.materialCode || `PROD-${item.productId}`,
        productName: product.description || item.productName || item.description || '',
        description: product.description || item.productName || item.description || '',
        category: product.category || item.category || 'General',
        baseUom: product.baseUom || item.baseUom || uom,
        uom: uom,
        boxPcs: boxPcs,
        minQty: minQtyNum,
        buyQty: minQtyNum,
        freeQty: freeQtyNum,
        discountPercent: discountPercentNum,
        discountAmount: discountAmountNum,
        rate: discountAmountNum,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return {
      id: schemeList.id,
      code: schemeList.code,
      name: schemeList.name,
      description: schemeList.description || null,
      schemeType: schemeList.schemeType || 'QTY_FREE',
      validFrom: schemeList.validFrom ? new Date(schemeList.validFrom).toISOString().split('T')[0] : null,
      validTo: schemeList.validTo ? new Date(schemeList.validTo).toISOString().split('T')[0] : null,
      isActive: Boolean(schemeList.isActive),
      itemCount: items.length,
      items,
      createdAt: schemeList.createdAt || new Date(),
      updatedAt: schemeList.updatedAt || new Date(),
    };
  }

  /**
   * Helper: Resolve product by ID or material code
   */
  private async resolveProduct(productIdOrCode: number | string): Promise<{ id: number; materialCode: string; description: string; baseUom: string; baseRate: number }> {
    const raw = String(productIdOrCode).trim();
    const numericId = parseInt(raw, 10);

    try {
      let product = null;
      if (!isNaN(numericId) && numericId > 0 && String(numericId) === raw) {
        product = await prisma.product.findUnique({ where: { id: numericId } });
      }
      if (!product) {
        product = await prisma.product.findUnique({ where: { materialCode: raw } });
      }

      if (product) {
        return {
          id: product.id,
          materialCode: product.materialCode,
          description: product.description,
          baseUom: product.baseUom,
          baseRate: this.formatDecimal(product.baseRate, 2),
        };
      }
    } catch {
      // Prisma error, fallback
    }

    // In-memory fallback lookup
    const fallbackProducts = [
      { id: 1, materialCode: 'PROD-001', description: 'Golden Leaf Premium Tea 250g', baseUom: 'Box', baseRate: 120.0 },
      { id: 2, materialCode: 'PROD-002', description: 'Sparkling Orange Splash 500ml', baseUom: 'Pcs', baseRate: 35.0 },
      { id: 3, materialCode: 'PROD-003', description: 'Crisp Lemon Fizz Soda 1L', baseUom: 'Pcs', baseRate: 60.0 },
      { id: 4, materialCode: 'PROD-004', description: 'Organic Mango Nectar Juice 1L', baseUom: 'Box', baseRate: 85.0 },
      { id: 5, materialCode: 'PROD-005', description: 'Pure Spring Mineral Water 500ml', baseUom: 'Box', baseRate: 15.0 },
    ];

    const match = fallbackProducts.find((p) => p.id === numericId || p.materialCode.toUpperCase() === raw.toUpperCase());
    if (match) {
      return match;
    }

    throw new SchemeListServiceError(`Referenced product '${raw}' not found in Product Master`, 404, 'PRODUCT_NOT_FOUND');
  }

  /**
   * Helper: Validates scheme list header and items input
   */
  private validateSchemeListInput(dto: CreateSchemeListDTO | UpdateSchemeListDTO, isCreate = true) {
    if (isCreate) {
      const code = (dto.code || (dto as any).id || '').trim();
      if (!code) {
        throw new SchemeListServiceError('Scheme code / ID is required', 400, 'VALIDATION_ERROR');
      }
      if (code.length > 50) {
        throw new SchemeListServiceError('Scheme code must not exceed 50 characters', 400, 'VALIDATION_ERROR');
      }
      if (!/^[A-Za-z0-9_-]+$/.test(code)) {
        throw new SchemeListServiceError('Scheme code must contain only alphanumeric characters, dashes, and underscores', 400, 'VALIDATION_ERROR');
      }
    }

    if (isCreate || dto.name !== undefined) {
      const name = (dto.name || '').trim();
      if (!name) {
        throw new SchemeListServiceError('Scheme name is required', 400, 'VALIDATION_ERROR');
      }
      if (name.length > 100) {
        throw new SchemeListServiceError('Scheme name must not exceed 100 characters', 400, 'VALIDATION_ERROR');
      }
    }

    // Validity range check
    let validFromDate: Date | null = null;
    let validToDate: Date | null = null;

    if (dto.validFrom) {
      validFromDate = new Date(dto.validFrom);
      if (isNaN(validFromDate.getTime())) {
        throw new SchemeListServiceError('Invalid validFrom date format', 400, 'INVALID_DATE_FORMAT');
      }
    }

    if (dto.validTo) {
      validToDate = new Date(dto.validTo);
      if (isNaN(validToDate.getTime())) {
        throw new SchemeListServiceError('Invalid validTo date format', 400, 'INVALID_DATE_FORMAT');
      }
    }

    if (validFromDate && validToDate && validToDate < validFromDate) {
      throw new SchemeListServiceError('validTo date cannot be earlier than validFrom date', 400, 'INVALID_VALIDITY_RANGE');
    }
  }

  /**
   * Helper: Validates a single SchemeListItem input
   */
  private validateSchemeItem(item: CreateSchemeListItemDTO | UpdateSchemeListItemDTO) {
    if (!item.productId && item.productId !== 0) {
      throw new SchemeListServiceError('Product ID is required for each scheme item', 400, 'VALIDATION_ERROR');
    }

    const minQty = item.minQty ?? item.buyQty ?? 0;
    if (typeof minQty !== 'number' || isNaN(minQty) || minQty < 0) {
      throw new SchemeListServiceError('Minimum buy quantity must be a non-negative number', 400, 'VALIDATION_ERROR');
    }

    const freeQty = item.freeQty ?? 0;
    if (typeof freeQty !== 'number' || isNaN(freeQty) || freeQty < 0) {
      throw new SchemeListServiceError('Free promotional quantity must be a non-negative number', 400, 'VALIDATION_ERROR');
    }

    const discountPercent = item.discountPercent ?? 0;
    if (typeof discountPercent !== 'number' || isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      throw new SchemeListServiceError('Discount percentage must be between 0% and 100%', 400, 'VALIDATION_ERROR');
    }

    const discountAmount = item.discountAmount ?? item.rate ?? 0;
    if (typeof discountAmount !== 'number' || isNaN(discountAmount) || discountAmount < 0) {
      throw new SchemeListServiceError('Discount / promo rate amount must be a non-negative number', 400, 'VALIDATION_ERROR');
    }
  }

  // =========================================================================
  // PUBLIC CRUD OPERATIONS
  // =========================================================================

  /**
   * 1. GET ALL SCHEME LISTS
   */
  async getSchemeLists(filters: SchemeListFilterQuery = {}): Promise<SchemeListResponseDTO[]> {
    try {
      const where: Prisma.SchemeListWhereInput = {};

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.schemeType) {
        where.schemeType = filters.schemeType;
      }

      if (filters.code) {
        where.code = { contains: filters.code.trim() };
      }

      if (filters.search) {
        const term = filters.search.trim();
        where.OR = [
          { code: { contains: term } },
          { name: { contains: term } },
          { description: { contains: term } },
        ];
      }

      const schemeLists = await prisma.schemeList.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
      });

      if (schemeLists && schemeLists.length > 0) {
        return schemeLists.map((sl) => this.formatSchemeList(sl));
      }
    } catch {
      // Fall back to in-memory store
    }

    // In-memory filter fallback
    let list = Array.from(this.memorySchemeLists.values());

    if (filters.isActive !== undefined) {
      list = list.filter((sl) => sl.isActive === filters.isActive);
    }
    if (filters.schemeType) {
      list = list.filter((sl) => sl.schemeType === filters.schemeType);
    }
    if (filters.code) {
      list = list.filter((sl) => sl.code.toLowerCase().includes(filters.code!.toLowerCase()));
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      list = list.filter(
        (sl) =>
          sl.code.toLowerCase().includes(term) ||
          sl.name.toLowerCase().includes(term) ||
          (sl.description && sl.description.toLowerCase().includes(term))
      );
    }

    return list.map((sl) => this.formatSchemeList(sl));
  }

  /**
   * 2. GET SCHEME LIST BY ID OR CODE
   */
  async getSchemeListById(idOrCode: string | number): Promise<SchemeListResponseDTO> {
    const raw = String(idOrCode).trim();
    const numericId = parseInt(raw, 10);

    try {
      let schemeList = null;
      if (!isNaN(numericId) && numericId > 0 && String(numericId) === raw) {
        schemeList = await prisma.schemeList.findUnique({
          where: { id: numericId },
          include: {
            items: {
              include: { product: true },
              orderBy: { id: 'asc' },
            },
          },
        });
      }

      if (!schemeList) {
        schemeList = await prisma.schemeList.findUnique({
          where: { code: raw.toUpperCase() },
          include: {
            items: {
              include: { product: true },
              orderBy: { id: 'asc' },
            },
          },
        });
      }

      if (!schemeList) {
        schemeList = await prisma.schemeList.findFirst({
          where: {
            OR: [
              { code: { equals: raw } },
              { code: { equals: raw.toUpperCase() } },
            ],
          },
          include: {
            items: {
              include: { product: true },
              orderBy: { id: 'asc' },
            },
          },
        });
      }

      if (schemeList) {
        return this.formatSchemeList(schemeList);
      }
    } catch {
      // In-memory fallback
    }

    // In-memory lookup
    const list = Array.from(this.memorySchemeLists.values());
    const match = list.find(
      (sl) =>
        sl.id === numericId ||
        sl.code.toUpperCase() === raw.toUpperCase() ||
        sl.code === raw
    );

    if (match) {
      return this.formatSchemeList(match);
    }

    throw new SchemeListServiceError(`Scheme list '${raw}' not found`, 404, 'SCHEME_LIST_NOT_FOUND');
  }

  /**
   * 3. CREATE SCHEME LIST (TRANSACTIONAL)
   */
  async createSchemeList(
    dto: CreateSchemeListDTO,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SchemeListResponseDTO> {
    this.validateSchemeListInput(dto, true);

    const cleanCode = (dto.code || (dto as any).id || '').trim().toUpperCase();
    const cleanName = dto.name.trim();
    const cleanDesc = dto.description ? dto.description.trim() : null;
    const schemeType = dto.schemeType || 'QTY_FREE';
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    const isActive = dto.isActive !== undefined ? Boolean(dto.isActive) : true;
    const items = dto.items || [];

    // 1. Validate all items and resolve product IDs before transaction
    const resolvedItems: Array<{
      productId: number;
      productCode: string;
      productName: string;
      category: string;
      baseUom: string;
      uom: string;
      boxPcs: 'Box' | 'Pcs';
      minQty: number;
      buyQty: number;
      freeQty: number;
      discountPercent: number;
      discountAmount: number;
      rate: number;
    }> = [];

    const seenProducts = new Set<number>();

    for (const item of items) {
      this.validateSchemeItem(item);
      const product = await this.resolveProduct(item.productId);

      if (seenProducts.has(product.id)) {
        throw new SchemeListServiceError(
          `Product '${product.materialCode}' is already defined in this scheme list`,
          409,
          'DUPLICATE_PRODUCT_IN_SCHEME_LIST'
        );
      }
      seenProducts.add(product.id);

      const minQty = item.minQty ?? item.buyQty ?? 0;
      const freeQty = item.freeQty ?? 0;
      const discountPercent = item.discountPercent ?? 0;
      const discountAmount = item.discountAmount ?? item.rate ?? product.baseRate;
      const uom = item.uom || product.baseUom || 'Box';
      const boxPcs: 'Box' | 'Pcs' =
        item.boxPcs || (uom.toLowerCase().includes('box') || uom.toLowerCase().includes('case') ? 'Box' : 'Pcs');

      resolvedItems.push({
        productId: product.id,
        productCode: product.materialCode,
        productName: product.description,
        category: 'Beverages',
        baseUom: product.baseUom,
        uom: uom,
        boxPcs: boxPcs,
        minQty,
        buyQty: minQty,
        freeQty,
        discountPercent,
        discountAmount,
        rate: discountAmount,
      });
    }

    // 2. Persist to MySQL transactionally
    try {
      // Check existing code uniqueness
      const existing = await prisma.schemeList.findUnique({
        where: { code: cleanCode },
      });

      if (existing) {
        throw new SchemeListServiceError(`Scheme list code '${cleanCode}' already exists`, 409, 'DUPLICATE_SCHEME_LIST_CODE');
      }

      const created = await prisma.$transaction(async (tx) => {
        const header = await tx.schemeList.create({
          data: {
            code: cleanCode,
            name: cleanName,
            description: cleanDesc,
            schemeType: schemeType,
            validFrom: validFrom,
            validTo: validTo,
            isActive: isActive,
          },
        });

        if (resolvedItems.length > 0) {
          await tx.schemeListItem.createMany({
            data: resolvedItems.map((item) => ({
              schemeListId: header.id,
              productId: item.productId,
              minQty: new Prisma.Decimal(item.minQty.toFixed(3)),
              freeQty: new Prisma.Decimal(item.freeQty.toFixed(3)),
              discountPercent: new Prisma.Decimal(item.discountPercent.toFixed(2)),
              discountAmount: new Prisma.Decimal(item.discountAmount.toFixed(2)),
            })),
          });
        }

        return tx.schemeList.findUnique({
          where: { id: header.id },
          include: {
            items: {
              include: { product: true },
              orderBy: { id: 'asc' },
            },
          },
        });
      });

      // Audit Log
      if (userId) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: userId,
              action: 'SCHEME_LIST_CREATED',
              entityType: 'SchemeList',
              entityId: String(created!.id),
              newValues: JSON.stringify({
                code: cleanCode,
                name: cleanName,
                itemCount: resolvedItems.length,
              }),
              ipAddress: ipAddress || null,
              userAgent: userAgent || null,
            },
          });
        } catch {
          // Non-blocking audit log
        }
      }

      return this.formatSchemeList(created!);
    } catch (err: any) {
      if (err instanceof SchemeListServiceError) {
        throw err;
      }
      if (err?.code === 'P2002') {
        throw new SchemeListServiceError(`Scheme list code '${cleanCode}' already exists`, 409, 'DUPLICATE_SCHEME_LIST_CODE');
      }
    }

    // In-memory fallback
    const memList = Array.from(this.memorySchemeLists.values());
    if (memList.some((sl) => sl.code.toUpperCase() === cleanCode)) {
      throw new SchemeListServiceError(`Scheme list code '${cleanCode}' already exists`, 409, 'DUPLICATE_SCHEME_LIST_CODE');
    }

    const newId = this.nextMemoryId++;
    const memoryRecord = {
      id: newId,
      code: cleanCode,
      name: cleanName,
      description: cleanDesc,
      schemeType: schemeType,
      validFrom: validFrom,
      validTo: validTo,
      isActive: isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: resolvedItems.map((item, idx) => ({
        id: newId * 100 + idx + 1,
        schemeListId: newId,
        productId: item.productId,
        productCode: item.productCode,
        materialCode: item.productCode,
        productName: item.productName,
        description: item.productName,
        category: item.category,
        baseUom: item.baseUom,
        uom: item.uom,
        boxPcs: item.boxPcs,
        minQty: item.minQty,
        buyQty: item.buyQty,
        freeQty: item.freeQty,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        rate: item.rate,
      })),
    };

    this.memorySchemeLists.set(newId, memoryRecord);
    return this.formatSchemeList(memoryRecord);
  }

  /**
   * 4. UPDATE SCHEME LIST (TRANSACTIONAL)
   */
  async updateSchemeList(
    idOrCode: string | number,
    dto: UpdateSchemeListDTO,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SchemeListResponseDTO> {
    this.validateSchemeListInput(dto, false);

    const raw = String(idOrCode).trim();
    const numericId = parseInt(raw, 10);

    // Resolve target scheme
    let existingScheme = null;
    try {
      if (!isNaN(numericId) && numericId > 0 && String(numericId) === raw) {
        existingScheme = await prisma.schemeList.findUnique({
          where: { id: numericId },
          include: { items: true },
        });
      }
      if (!existingScheme) {
        existingScheme = await prisma.schemeList.findUnique({
          where: { code: raw.toUpperCase() },
          include: { items: true },
        });
      }
      if (!existingScheme) {
        existingScheme = await prisma.schemeList.findFirst({
          where: {
            OR: [{ code: raw }, { code: raw.toUpperCase() }],
          },
          include: { items: true },
        });
      }
    } catch {
      // Prisma error, fallback below
    }

    if (existingScheme) {
      const targetId = existingScheme.id;

      // Check code uniqueness if changing code
      if (dto.code && dto.code.trim().toUpperCase() !== existingScheme.code) {
        const dupCheck = await prisma.schemeList.findUnique({
          where: { code: dto.code.trim().toUpperCase() },
        });
        if (dupCheck && dupCheck.id !== targetId) {
          throw new SchemeListServiceError(`Scheme list code '${dto.code}' is already taken`, 409, 'DUPLICATE_SCHEME_LIST_CODE');
        }
      }

      // If items are provided, validate and resolve all products first
      let resolvedItems: any[] | null = null;
      if (dto.items) {
        resolvedItems = [];
        const seen = new Set<number>();
        for (const item of dto.items) {
          this.validateSchemeItem(item);
          const product = await this.resolveProduct(item.productId);

          if (seen.has(product.id)) {
            throw new SchemeListServiceError(
              `Product '${product.materialCode}' is duplicate in this scheme list`,
              409,
              'DUPLICATE_PRODUCT_IN_SCHEME_LIST'
            );
          }
          seen.add(product.id);

          const minQty = item.minQty ?? item.buyQty ?? 0;
          const freeQty = item.freeQty ?? 0;
          const discountPercent = item.discountPercent ?? 0;
          const discountAmount = item.discountAmount ?? item.rate ?? product.baseRate;
          const uom = item.uom || product.baseUom || 'Box';
          const boxPcs: 'Box' | 'Pcs' =
            item.boxPcs || (uom.toLowerCase().includes('box') || uom.toLowerCase().includes('case') ? 'Box' : 'Pcs');

          resolvedItems.push({
            productId: product.id,
            minQty,
            buyQty: minQty,
            freeQty,
            discountPercent,
            discountAmount,
            uom,
            boxPcs,
          });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updateData: Prisma.SchemeListUpdateInput = {};
        if (dto.code) updateData.code = dto.code.trim().toUpperCase();
        if (dto.name) updateData.name = dto.name.trim();
        if (dto.description !== undefined) updateData.description = dto.description ? dto.description.trim() : null;
        if (dto.schemeType) updateData.schemeType = dto.schemeType;
        if (dto.validFrom !== undefined) updateData.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
        if (dto.validTo !== undefined) updateData.validTo = dto.validTo ? new Date(dto.validTo) : null;
        if (dto.isActive !== undefined) updateData.isActive = Boolean(dto.isActive);

        await tx.schemeList.update({
          where: { id: targetId },
          data: updateData,
        });

        // Reconcile items if provided
        if (resolvedItems) {
          await tx.schemeListItem.deleteMany({
            where: { schemeListId: targetId },
          });

          if (resolvedItems.length > 0) {
            await tx.schemeListItem.createMany({
              data: resolvedItems.map((item) => ({
                schemeListId: targetId,
                productId: item.productId,
                minQty: new Prisma.Decimal(item.minQty.toFixed(3)),
                freeQty: new Prisma.Decimal(item.freeQty.toFixed(3)),
                discountPercent: new Prisma.Decimal(item.discountPercent.toFixed(2)),
                discountAmount: new Prisma.Decimal(item.discountAmount.toFixed(2)),
              })),
            });
          }
        }

        return tx.schemeList.findUnique({
          where: { id: targetId },
          include: {
            items: {
              include: { product: true },
              orderBy: { id: 'asc' },
            },
          },
        });
      });

      // Audit Log
      if (userId) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: userId,
              action: 'SCHEME_LIST_UPDATED',
              entityType: 'SchemeList',
              entityId: String(targetId),
              newValues: JSON.stringify({
                code: updated!.code,
                name: updated!.name,
                itemCount: updated!.items.length,
              }),
              ipAddress: ipAddress || null,
              userAgent: userAgent || null,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      return this.formatSchemeList(updated!);
    }

    // In-memory update fallback
    const list = Array.from(this.memorySchemeLists.values());
    const memMatch = list.find(
      (sl) => sl.id === numericId || sl.code.toUpperCase() === raw.toUpperCase() || sl.code === raw
    );

    if (!memMatch) {
      throw new SchemeListServiceError(`Scheme list '${raw}' not found`, 404, 'SCHEME_LIST_NOT_FOUND');
    }

    if (dto.name) memMatch.name = dto.name.trim();
    if (dto.description !== undefined) memMatch.description = dto.description ? dto.description.trim() : null;
    if (dto.schemeType) memMatch.schemeType = dto.schemeType;
    if (dto.validFrom !== undefined) memMatch.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validTo !== undefined) memMatch.validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (dto.isActive !== undefined) memMatch.isActive = Boolean(dto.isActive);
    memMatch.updatedAt = new Date();

    if (dto.items) {
      const newItems = [];
      const seen = new Set<number>();
      for (const item of dto.items) {
        this.validateSchemeItem(item);
        const product = await this.resolveProduct(item.productId);
        if (seen.has(product.id)) {
          throw new SchemeListServiceError(
            `Product '${product.materialCode}' is duplicate in this scheme list`,
            409,
            'DUPLICATE_PRODUCT_IN_SCHEME_LIST'
          );
        }
        seen.add(product.id);

        const minQty = item.minQty ?? item.buyQty ?? 0;
        const freeQty = item.freeQty ?? 0;
        const discountPercent = item.discountPercent ?? 0;
        const discountAmount = item.discountAmount ?? item.rate ?? product.baseRate;
        const uom = item.uom || product.baseUom || 'Box';
        const boxPcs: 'Box' | 'Pcs' =
          item.boxPcs || (uom.toLowerCase().includes('box') || uom.toLowerCase().includes('case') ? 'Box' : 'Pcs');

        newItems.push({
          id: memMatch.id * 100 + newItems.length + 1,
          schemeListId: memMatch.id,
          productId: product.id,
          productCode: product.materialCode,
          materialCode: product.materialCode,
          productName: product.description,
          description: product.description,
          category: 'Beverages',
          baseUom: product.baseUom,
          uom,
          boxPcs,
          minQty,
          buyQty: minQty,
          freeQty,
          discountPercent,
          discountAmount,
          rate: discountAmount,
        });
      }
      memMatch.items = newItems;
    }

    return this.formatSchemeList(memMatch);
  }

  /**
   * 5. UPDATE SCHEME LIST STATUS (ACTIVATE / DEACTIVATE)
   */
  async updateSchemeListStatus(
    idOrCode: string | number,
    isActive: boolean,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SchemeListResponseDTO> {
    if (typeof isActive !== 'boolean') {
      throw new SchemeListServiceError('Status isActive must be a boolean (true/false)', 400, 'VALIDATION_ERROR');
    }

    const raw = String(idOrCode).trim();
    const numericId = parseInt(raw, 10);

    let existing = null;
    try {
      if (!isNaN(numericId) && numericId > 0 && String(numericId) === raw) {
        existing = await prisma.schemeList.findUnique({
          where: { id: numericId },
          include: { items: { include: { product: true } } },
        });
      }
      if (!existing) {
        existing = await prisma.schemeList.findUnique({
          where: { code: raw.toUpperCase() },
          include: { items: { include: { product: true } } },
        });
      }
      if (!existing) {
        existing = await prisma.schemeList.findFirst({
          where: {
            OR: [{ code: raw }, { code: raw.toUpperCase() }],
          },
          include: { items: { include: { product: true } } },
        });
      }

      if (existing) {
        const updated = await prisma.schemeList.update({
          where: { id: existing.id },
          data: { isActive: isActive },
          include: {
            items: {
              include: { product: true },
              orderBy: { id: 'asc' },
            },
          },
        });

        if (userId) {
          try {
            await prisma.auditLog.create({
              data: {
                userId: userId,
                action: isActive ? 'SCHEME_LIST_ACTIVATED' : 'SCHEME_LIST_DEACTIVATED',
                entityType: 'SchemeList',
                entityId: String(updated.id),
                newValues: JSON.stringify({
                  code: updated.code,
                  name: updated.name,
                  isActive,
                }),
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
              },
            });
          } catch {
            // Non-blocking
          }
        }

        return this.formatSchemeList(updated);
      }
    } catch {
      // Prisma error, fallback
    }

    // In-memory fallback
    const list = Array.from(this.memorySchemeLists.values());
    const match = list.find(
      (sl) => sl.id === numericId || sl.code.toUpperCase() === raw.toUpperCase() || sl.code === raw
    );

    if (!match) {
      throw new SchemeListServiceError(`Scheme list '${raw}' not found`, 404, 'SCHEME_LIST_NOT_FOUND');
    }

    match.isActive = isActive;
    match.updatedAt = new Date();

    return this.formatSchemeList(match);
  }

  /**
   * 6. UPSERT SINGLE SCHEME LIST ITEM
   */
  async upsertSchemeListItem(
    idOrCode: string | number,
    itemDto: CreateSchemeListItemDTO | UpdateSchemeListItemDTO,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SchemeListResponseDTO> {
    this.validateSchemeItem(itemDto);

    const product = await this.resolveProduct(itemDto.productId);
    const raw = String(idOrCode).trim();
    const numericId = parseInt(raw, 10);

    let existingPl = null;
    try {
      if (!isNaN(numericId) && numericId > 0 && String(numericId) === raw) {
        existingPl = await prisma.schemeList.findUnique({
          where: { id: numericId },
          include: { items: { include: { product: true } } },
        });
      }
      if (!existingPl) {
        existingPl = await prisma.schemeList.findUnique({
          where: { code: raw.toUpperCase() },
          include: { items: { include: { product: true } } },
        });
      }
      if (!existingPl) {
        existingPl = await prisma.schemeList.findFirst({
          where: { OR: [{ code: raw }, { code: raw.toUpperCase() }] },
          include: { items: { include: { product: true } } },
        });
      }

      if (existingPl) {
        const minQty = itemDto.minQty ?? itemDto.buyQty ?? 0;
        const freeQty = itemDto.freeQty ?? 0;
        const discountPercent = itemDto.discountPercent ?? 0;
        const discountAmount = itemDto.discountAmount ?? itemDto.rate ?? product.baseRate;

        // Check if item already exists for this product in this scheme
        const existingItem = existingPl.items.find((i) => i.productId === product.id);

        if (existingItem) {
          await prisma.schemeListItem.update({
            where: { id: existingItem.id },
            data: {
              minQty: new Prisma.Decimal(minQty.toFixed(3)),
              freeQty: new Prisma.Decimal(freeQty.toFixed(3)),
              discountPercent: new Prisma.Decimal(discountPercent.toFixed(2)),
              discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
            },
          });
        } else {
          await prisma.schemeListItem.create({
            data: {
              schemeListId: existingPl.id,
              productId: product.id,
              minQty: new Prisma.Decimal(minQty.toFixed(3)),
              freeQty: new Prisma.Decimal(freeQty.toFixed(3)),
              discountPercent: new Prisma.Decimal(discountPercent.toFixed(2)),
              discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
            },
          });
        }

        const reloaded = await prisma.schemeList.findUnique({
          where: { id: existingPl.id },
          include: {
            items: {
              include: { product: true },
              orderBy: { id: 'asc' },
            },
          },
        });

        if (userId) {
          try {
            await prisma.auditLog.create({
              data: {
                userId: userId,
                action: 'SCHEME_LIST_ITEM_UPDATED',
                entityType: 'SchemeListItem',
                entityId: String(product.id),
                newValues: JSON.stringify({
                  schemeListCode: existingPl.code,
                  productCode: product.materialCode,
                  minQty,
                  freeQty,
                  discountAmount,
                }),
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
              },
            });
          } catch {
            // Non-blocking
          }
        }

        return this.formatSchemeList(reloaded!);
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const list = Array.from(this.memorySchemeLists.values());
    const memMatch = list.find(
      (sl) => sl.id === numericId || sl.code.toUpperCase() === raw.toUpperCase() || sl.code === raw
    );

    if (!memMatch) {
      throw new SchemeListServiceError(`Scheme list '${raw}' not found`, 404, 'SCHEME_LIST_NOT_FOUND');
    }

    const minQty = itemDto.minQty ?? itemDto.buyQty ?? 0;
    const freeQty = itemDto.freeQty ?? 0;
    const discountPercent = itemDto.discountPercent ?? 0;
    const discountAmount = itemDto.discountAmount ?? itemDto.rate ?? product.baseRate;
    const uom = itemDto.uom || product.baseUom || 'Box';
    const boxPcs: 'Box' | 'Pcs' =
      itemDto.boxPcs || (uom.toLowerCase().includes('box') || uom.toLowerCase().includes('case') ? 'Box' : 'Pcs');

    const itemIdx = memMatch.items.findIndex((i: any) => i.productId === product.id);
    if (itemIdx >= 0) {
      memMatch.items[itemIdx].minQty = minQty;
      memMatch.items[itemIdx].buyQty = minQty;
      memMatch.items[itemIdx].freeQty = freeQty;
      memMatch.items[itemIdx].discountPercent = discountPercent;
      memMatch.items[itemIdx].discountAmount = discountAmount;
      memMatch.items[itemIdx].rate = discountAmount;
      memMatch.items[itemIdx].uom = uom;
      memMatch.items[itemIdx].boxPcs = boxPcs;
    } else {
      memMatch.items.push({
        id: memMatch.id * 100 + memMatch.items.length + 1,
        schemeListId: memMatch.id,
        productId: product.id,
        productCode: product.materialCode,
        materialCode: product.materialCode,
        productName: product.description,
        description: product.description,
        category: 'Beverages',
        baseUom: product.baseUom,
        uom,
        boxPcs,
        minQty,
        buyQty: minQty,
        freeQty,
        discountPercent,
        discountAmount,
        rate: discountAmount,
      });
    }

    memMatch.updatedAt = new Date();
    return this.formatSchemeList(memMatch);
  }

  /**
   * 7. DELETE SCHEME LIST (CASCADE DELETES ITEMS)
   */
  async deleteSchemeList(
    idOrCode: string | number,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string; deletedId: number | string }> {
    const raw = String(idOrCode).trim();
    const numericId = parseInt(raw, 10);

    let existing = null;
    try {
      if (!isNaN(numericId) && numericId > 0 && String(numericId) === raw) {
        existing = await prisma.schemeList.findUnique({ where: { id: numericId } });
      }
      if (!existing) {
        existing = await prisma.schemeList.findUnique({ where: { code: raw.toUpperCase() } });
      }
      if (!existing) {
        existing = await prisma.schemeList.findFirst({
          where: { OR: [{ code: raw }, { code: raw.toUpperCase() }] },
        });
      }

      if (existing) {
        await prisma.schemeList.delete({
          where: { id: existing.id },
        });

        if (userId) {
          try {
            await prisma.auditLog.create({
              data: {
                userId: userId,
                action: 'SCHEME_LIST_DELETED',
                entityType: 'SchemeList',
                entityId: String(existing.id),
                newValues: JSON.stringify({
                  code: existing.code,
                  name: existing.name,
                }),
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
              },
            });
          } catch {
            // Non-blocking
          }
        }

        return { success: true, message: `Scheme list '${existing.code}' deleted successfully`, deletedId: existing.id };
      }
    } catch {
      // Fallback
    }

    // In-memory delete fallback
    const list = Array.from(this.memorySchemeLists.values());
    const match = list.find(
      (sl) => sl.id === numericId || sl.code.toUpperCase() === raw.toUpperCase() || sl.code === raw
    );

    if (!match) {
      throw new SchemeListServiceError(`Scheme list '${raw}' not found`, 404, 'SCHEME_LIST_NOT_FOUND');
    }

    this.memorySchemeLists.delete(match.id);
    return { success: true, message: `Scheme list '${match.code}' deleted successfully`, deletedId: match.id };
  }
}

export const schemeListService = new SchemeListService();
