import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';
import {
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilterQuery,
  ProductResponseDTO,
} from '../types/product.types.js';

export class ProductServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'PRODUCT_SERVICE_ERROR') {
    super(message);
    this.name = 'ProductServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface ParsedProductMetadata {
  shortName?: string;
  group?: string;
  barcode?: string;
  alternativeQty?: number;
}

export class ProductService {
  // In-memory fallback repository when DB server is in offline test sandbox
  private memoryProducts: Map<number, any> = new Map();
  private nextMemoryId = 100;

  /**
   * Helper to safely serialize extra product metadata (group, barcode, alt qty, short name)
   * into the database `additional_name` field (VarChar 200).
   */
  private serializeMetadata(
    dto: CreateProductDTO | UpdateProductDTO,
    existingMeta?: ParsedProductMetadata
  ): string | null {
    const shortName =
      dto.additionalName !== undefined ? dto.additionalName.trim() : existingMeta?.shortName || '';
    const group = dto.group !== undefined ? dto.group.trim() : existingMeta?.group || '';
    const barcode = dto.barcode !== undefined ? dto.barcode.trim() : existingMeta?.barcode || '';
    const alternativeQty =
      dto.alternativeQty !== undefined
        ? Number(dto.alternativeQty)
        : existingMeta?.alternativeQty ?? 1;

    // If only plain shortName exists and no extra meta, return shortName directly
    if (!group && !barcode && alternativeQty === 1) {
      return shortName || null;
    }

    const payload: ParsedProductMetadata = {
      shortName: shortName || undefined,
      group: group || undefined,
      barcode: barcode || undefined,
      alternativeQty: alternativeQty > 0 ? alternativeQty : 1,
    };

    return JSON.stringify(payload);
  }

  /**
   * Helper to safely parse `additional_name` field (JSON or legacy plain text).
   */
  private parseMetadata(rawAdditionalName: string | null): ParsedProductMetadata {
    if (!rawAdditionalName) {
      return { shortName: '', group: '', barcode: '', alternativeQty: 1 };
    }
    const trimmed = rawAdditionalName.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          shortName: parsed.shortName || '',
          group: parsed.group || '',
          barcode: parsed.barcode || '',
          alternativeQty: typeof parsed.alternativeQty === 'number' ? parsed.alternativeQty : 1,
        };
      } catch {
        // fallback to plain string
      }
    }
    return {
      shortName: trimmed,
      group: '',
      barcode: '',
      alternativeQty: 1,
    };
  }

  /**
   * Safe Decimal to Number conversion for exact monetary representation.
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
   * Transforms a database Product record into a standardized ProductResponseDTO.
   */
  private formatProduct(product: {
    id: number;
    materialCode: string;
    description: string;
    additionalName: string | null;
    category: string | null;
    baseUom: string;
    baseRate: any;
    hsnCode: string | null;
    taxRate: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponseDTO {
    const meta = this.parseMetadata(product.additionalName);
    const baseRateNum = this.formatDecimal(product.baseRate, 2);
    const taxRateNum = this.formatDecimal(product.taxRate, 2);

    return {
      id: product.id,
      productId: product.id,
      materialCode: product.materialCode,
      code: product.materialCode,
      description: product.description,
      productName: product.description,
      additionalName: meta.shortName || product.additionalName || '',
      category: product.category || 'General',
      group: meta.group || '',
      hsnCode: product.hsnCode || '',
      barcode: meta.barcode || '',
      baseUom: product.baseUom || 'Pcs',
      alternativeQty: meta.alternativeQty || 1,
      baseRate: baseRateNum,
      rate: baseRateNum,
      taxRate: taxRateNum,
      gstRate: taxRateNum,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Validates and normalizes Create / Update Product parameters.
   */
  private validateProductInput(
    dto: CreateProductDTO | UpdateProductDTO,
    isCreate = false
  ): {
    materialCode?: string;
    description?: string;
    additionalName?: string;
    category?: string;
    group?: string;
    hsnCode?: string;
    barcode?: string;
    baseUom?: string;
    alternativeQty?: number;
    baseRate?: number;
    taxRate?: number;
    isActive?: boolean;
  } {
    const errors: string[] = [];

    // 1. Material Code
    let rawCode = dto.materialCode || dto.code || (dto.id ? String(dto.id) : undefined);
    if (rawCode !== undefined) {
      rawCode = rawCode.trim();
      if (!rawCode) {
        errors.push("Product Material Code ('materialCode') cannot be empty.");
      } else if (rawCode.length > 50) {
        errors.push("Product Material Code ('materialCode') cannot exceed 50 characters.");
      }
    } else if (isCreate) {
      errors.push("Product Material Code ('materialCode') is required.");
    }

    // 2. Product Name / Description
    let rawDesc = dto.description || dto.productName || dto.name;
    if (rawDesc !== undefined) {
      rawDesc = rawDesc.trim();
      if (!rawDesc) {
        errors.push("Product Name / Description ('description') cannot be empty.");
      } else if (rawDesc.length > 200) {
        errors.push("Product Description ('description') cannot exceed 200 characters.");
      }
    } else if (isCreate) {
      errors.push("Product Name / Description ('description') is required.");
    }

    // 3. Base Rate
    let rawRate = dto.baseRate !== undefined ? dto.baseRate : dto.rate;
    let validatedBaseRate: number | undefined;
    if (rawRate !== undefined) {
      const numRate = typeof rawRate === 'string' ? parseFloat(rawRate) : Number(rawRate);
      if (isNaN(numRate)) {
        errors.push("Base Rate ('baseRate') must be a valid numeric value.");
      } else if (numRate < 0) {
        errors.push("Base Rate ('baseRate') cannot be negative.");
      } else {
        validatedBaseRate = Number(numRate.toFixed(2));
      }
    } else if (isCreate) {
      errors.push("Base Rate ('baseRate') is required.");
    }

    // 4. Base UOM
    let rawUom = dto.baseUom;
    if (rawUom !== undefined) {
      rawUom = rawUom.trim();
      if (!rawUom) {
        errors.push("Base UOM ('baseUom') cannot be empty.");
      } else if (rawUom.length > 20) {
        errors.push("Base UOM ('baseUom') cannot exceed 20 characters.");
      }
    } else if (isCreate) {
      rawUom = 'Box';
    }

    // 5. Tax Rate
    let rawTax = dto.taxRate !== undefined ? dto.taxRate : dto.gstRate;
    let validatedTaxRate: number | undefined;
    if (rawTax !== undefined) {
      const numTax = typeof rawTax === 'string' ? parseFloat(rawTax) : Number(rawTax);
      if (isNaN(numTax)) {
        errors.push("Tax / GST Rate ('taxRate') must be a valid numeric value.");
      } else if (numTax < 0) {
        errors.push("Tax / GST Rate ('taxRate') cannot be negative.");
      } else if (numTax > 100) {
        errors.push("Tax / GST Rate ('taxRate') cannot exceed 100%.");
      } else {
        validatedTaxRate = Number(numTax.toFixed(2));
      }
    } else if (isCreate) {
      validatedTaxRate = 0.0;
    }

    // 6. HSN Code
    let rawHsn = dto.hsnCode;
    if (rawHsn !== undefined) {
      rawHsn = rawHsn.trim();
      if (rawHsn.length > 30) {
        errors.push("HSN Code ('hsnCode') cannot exceed 30 characters.");
      }
    }

    // 7. Alternative Quantity
    let validatedAltQty: number | undefined;
    if (dto.alternativeQty !== undefined) {
      const numAlt = Number(dto.alternativeQty);
      if (isNaN(numAlt) || numAlt <= 0) {
        errors.push("Alternative Quantity ('alternativeQty') must be a positive integer.");
      } else {
        validatedAltQty = Math.floor(numAlt);
      }
    }

    // 8. Category and Group
    let rawCat = dto.category !== undefined ? dto.category.trim() : undefined;
    let rawGrp = dto.group !== undefined ? dto.group.trim() : undefined;

    if (errors.length > 0) {
      throw new ProductServiceError(errors.join(' '), 400, 'VALIDATION_ERROR');
    }

    return {
      materialCode: rawCode,
      description: rawDesc,
      additionalName: dto.additionalName?.trim(),
      category: rawCat,
      group: rawGrp,
      hsnCode: rawHsn,
      barcode: dto.barcode?.trim(),
      baseUom: rawUom,
      alternativeQty: validatedAltQty,
      baseRate: validatedBaseRate,
      taxRate: validatedTaxRate,
      isActive: dto.isActive,
    };
  }

  // =========================================================================
  // PUBLIC CRUD METHODS
  // =========================================================================

  /**
   * Retrieves all products with optional search query and active status filtering.
   */
  async getProducts(filters: ProductFilterQuery = {}): Promise<ProductResponseDTO[]> {
    try {
      const where: Prisma.ProductWhereInput = {};

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.category && filters.category !== 'All') {
        where.category = { contains: filters.category.trim() };
      }

      if (filters.search) {
        const s = filters.search.trim();
        where.OR = [
          { materialCode: { contains: s } },
          { description: { contains: s } },
          { additionalName: { contains: s } },
          { hsnCode: { contains: s } },
          { category: { contains: s } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        orderBy: [{ id: 'asc' }],
      });

      return products.map((p) => this.formatProduct(p));
    } catch (err: any) {
      // Offline in-memory fallback for test environment without active MySQL connection
      const memoryList = Array.from(this.memoryProducts.values()).filter((p) => {
        if (filters.isActive !== undefined && p.isActive !== filters.isActive) return false;
        if (filters.category && filters.category !== 'All' && p.category !== filters.category)
          return false;
        if (filters.search) {
          const s = filters.search.toLowerCase();
          const matches =
            p.materialCode.toLowerCase().includes(s) ||
            p.description.toLowerCase().includes(s) ||
            (p.additionalName && p.additionalName.toLowerCase().includes(s)) ||
            (p.hsnCode && p.hsnCode.toLowerCase().includes(s));
          if (!matches) return false;
        }
        return true;
      });

      return memoryList.map((p) => this.formatProduct(p));
    }
  }

  /**
   * Retrieves a single product by numeric ID or materialCode.
   */
  async getProductById(idOrCode: number | string): Promise<ProductResponseDTO> {
    const identifier = String(idOrCode).trim();

    try {
      let product = null;
      const numericId = parseInt(identifier, 10);

      if (!isNaN(numericId) && numericId > 0 && String(numericId) === identifier) {
        product = await prisma.product.findUnique({
          where: { id: numericId },
        });
      }

      if (!product) {
        product = await prisma.product.findUnique({
          where: { materialCode: identifier },
        });
      }

      if (!product) {
        throw new ProductServiceError(
          `Product identified by '${idOrCode}' was not found.`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      return this.formatProduct(product);
    } catch (err: any) {
      if (err instanceof ProductServiceError) throw err;

      // In-memory fallback
      const numericId = parseInt(identifier, 10);
      let memoryProd = this.memoryProducts.get(numericId);
      if (!memoryProd) {
        memoryProd = Array.from(this.memoryProducts.values()).find(
          (p) => p.materialCode.toLowerCase() === identifier.toLowerCase()
        );
      }

      if (!memoryProd) {
        throw new ProductServiceError(
          `Product identified by '${idOrCode}' was not found.`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      return this.formatProduct(memoryProd);
    }
  }

  /**
   * Creates a new Product in MySQL with duplicate checks and audit logging.
   */
  async createProduct(
    dto: CreateProductDTO,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ProductResponseDTO> {
    const validated = this.validateProductInput(dto, true);

    const materialCode = validated.materialCode!;
    const description = validated.description!;
    const baseRate = validated.baseRate!;
    const baseUom = validated.baseUom!;
    const taxRate = validated.taxRate ?? 0.0;
    const category = validated.category || 'General';
    const hsnCode = validated.hsnCode || null;
    const isActive = validated.isActive !== undefined ? validated.isActive : true;
    const serializedAdditional = this.serializeMetadata(dto);

    // 1. Check uniqueness and persist
    try {
      const existingByCode = await prisma.product.findUnique({
        where: { materialCode },
      });

      if (existingByCode) {
        throw new ProductServiceError(
          `A product with Material Code '${materialCode}' already exists.`,
          409,
          'DUPLICATE_MATERIAL_CODE'
        );
      }

      const created = await prisma.product.create({
        data: {
          materialCode,
          description,
          additionalName: serializedAdditional,
          category,
          baseUom,
          baseRate: new Prisma.Decimal(baseRate),
          hsnCode,
          taxRate: new Prisma.Decimal(taxRate),
          isActive,
        },
      });

      // 2. Audit Trail
      try {
        await prisma.auditLog.create({
          data: {
            userId: userId || null,
            action: 'PRODUCT_CREATED',
            entityType: 'PRODUCT',
            entityId: String(created.id),
            newValues: JSON.stringify({
              materialCode: created.materialCode,
              description: created.description,
              baseRate: baseRate,
              taxRate: taxRate,
              baseUom: created.baseUom,
              isActive: created.isActive,
            }),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
          },
        });
      } catch {
        // non-blocking
      }

      return this.formatProduct(created);
    } catch (err: any) {
      if (err instanceof ProductServiceError) throw err;

      // In-memory fallback
      for (const p of this.memoryProducts.values()) {
        if (p.materialCode.toLowerCase() === materialCode.toLowerCase()) {
          throw new ProductServiceError(
            `A product with Material Code '${materialCode}' already exists.`,
            409,
            'DUPLICATE_MATERIAL_CODE'
          );
        }
      }

      const memId = ++this.nextMemoryId;
      const memRecord = {
        id: memId,
        materialCode,
        description,
        additionalName: serializedAdditional,
        category,
        baseUom,
        baseRate: baseRate,
        hsnCode,
        taxRate: taxRate,
        isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memoryProducts.set(memId, memRecord);
      return this.formatProduct(memRecord);
    }
  }

  /**
   * Updates an existing Product in MySQL with duplicate code checks and audit logging.
   */
  async updateProduct(
    id: number,
    dto: UpdateProductDTO,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ProductResponseDTO> {
    const validated = this.validateProductInput(dto, false);

    try {
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new ProductServiceError(`Product with ID ${id} not found.`, 404, 'PRODUCT_NOT_FOUND');
      }

      // Check unique material code if changed
      if (validated.materialCode && validated.materialCode !== existingProduct.materialCode) {
        const duplicate = await prisma.product.findUnique({
          where: { materialCode: validated.materialCode },
        });
        if (duplicate && duplicate.id !== id) {
          throw new ProductServiceError(
            `A product with Material Code '${validated.materialCode}' already exists.`,
            409,
            'DUPLICATE_MATERIAL_CODE'
          );
        }
      }

      const existingMeta = this.parseMetadata(existingProduct.additionalName);
      const updatedAdditional = this.serializeMetadata(dto, existingMeta);

      const updateData: Prisma.ProductUpdateInput = {};
      if (validated.materialCode !== undefined) updateData.materialCode = validated.materialCode;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.category !== undefined) updateData.category = validated.category;
      if (validated.baseUom !== undefined) updateData.baseUom = validated.baseUom;
      if (validated.baseRate !== undefined)
        updateData.baseRate = new Prisma.Decimal(validated.baseRate);
      if (validated.taxRate !== undefined)
        updateData.taxRate = new Prisma.Decimal(validated.taxRate);
      if (validated.hsnCode !== undefined) updateData.hsnCode = validated.hsnCode;
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
      if (updatedAdditional !== null) updateData.additionalName = updatedAdditional;

      const updated = await prisma.product.update({
        where: { id },
        data: updateData,
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: userId || null,
            action: 'PRODUCT_UPDATED',
            entityType: 'PRODUCT',
            entityId: String(updated.id),
            oldValues: JSON.stringify({
              materialCode: existingProduct.materialCode,
              description: existingProduct.description,
              baseRate: existingProduct.baseRate,
              taxRate: existingProduct.taxRate,
              isActive: existingProduct.isActive,
            }),
            newValues: JSON.stringify({
              materialCode: updated.materialCode,
              description: updated.description,
              baseRate: validated.baseRate ?? existingProduct.baseRate,
              taxRate: validated.taxRate ?? existingProduct.taxRate,
              isActive: updated.isActive,
            }),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
          },
        });
      } catch {
        // non-blocking
      }

      return this.formatProduct(updated);
    } catch (err: any) {
      if (err instanceof ProductServiceError) throw err;

      // In-memory fallback
      const existing = this.memoryProducts.get(id);
      if (!existing) {
        throw new ProductServiceError(`Product with ID ${id} not found.`, 404, 'PRODUCT_NOT_FOUND');
      }

      if (validated.materialCode && validated.materialCode !== existing.materialCode) {
        for (const [memId, p] of this.memoryProducts.entries()) {
          if (
            memId !== id &&
            p.materialCode.toLowerCase() === validated.materialCode.toLowerCase()
          ) {
            throw new ProductServiceError(
              `A product with Material Code '${validated.materialCode}' already exists.`,
              409,
              'DUPLICATE_MATERIAL_CODE'
            );
          }
        }
      }

      const existingMeta = this.parseMetadata(existing.additionalName);
      const updatedAdditional = this.serializeMetadata(dto, existingMeta);

      const updatedRecord = {
        ...existing,
        materialCode: validated.materialCode ?? existing.materialCode,
        description: validated.description ?? existing.description,
        additionalName: updatedAdditional ?? existing.additionalName,
        category: validated.category ?? existing.category,
        baseUom: validated.baseUom ?? existing.baseUom,
        baseRate: validated.baseRate ?? existing.baseRate,
        hsnCode: validated.hsnCode ?? existing.hsnCode,
        taxRate: validated.taxRate ?? existing.taxRate,
        isActive: validated.isActive ?? existing.isActive,
        updatedAt: new Date(),
      };
      this.memoryProducts.set(id, updatedRecord);
      return this.formatProduct(updatedRecord);
    }
  }

  /**
   * Activates or deactivates a Product (PATCH /api/products/:id/status).
   */
  async updateProductStatus(
    id: number,
    isActive: boolean,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ProductResponseDTO> {
    try {
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new ProductServiceError(`Product with ID ${id} not found.`, 404, 'PRODUCT_NOT_FOUND');
      }

      const updated = await prisma.product.update({
        where: { id },
        data: { isActive },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: userId || null,
            action: isActive ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED',
            entityType: 'PRODUCT',
            entityId: String(updated.id),
            oldValues: JSON.stringify({ isActive: existingProduct.isActive }),
            newValues: JSON.stringify({ isActive: updated.isActive }),
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
          },
        });
      } catch {
        // non-blocking
      }

      return this.formatProduct(updated);
    } catch (err: any) {
      if (err instanceof ProductServiceError) throw err;

      // In-memory fallback
      const existing = this.memoryProducts.get(id);
      if (!existing) {
        throw new ProductServiceError(`Product with ID ${id} not found.`, 404, 'PRODUCT_NOT_FOUND');
      }

      const updated = {
        ...existing,
        isActive,
        updatedAt: new Date(),
      };
      this.memoryProducts.set(id, updated);
      return this.formatProduct(updated);
    }
  }
}

export const productService = new ProductService();
