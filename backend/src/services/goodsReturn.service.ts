import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreateGoodsReturnDTO,
  UpdateGoodsReturnDTO,
  GoodsReturnFilterQuery,
  GoodsReturnResponseDTO,
  GoodsReturnItemResponseDTO,
} from '../types/goodsReturn.types.js';

export class GoodsReturnServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = 'GOODS_RETURN_ERROR'
  ) {
    super(message);
    this.name = 'GoodsReturnServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class GoodsReturnService {
  /**
   * Convert Prisma Decimal values safely to numbers.
   */
  private decimalToNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }

  /**
   * Convert Date values to ISO strings.
   */
  private dateToString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value ? String(value) : '';
  }

  /**
   * Generate a unique Goods Return document number.
   */
  private async generateReturnDocumentId(): Promise<string> {
    const prefix = 'GR-';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const randomNumber = Math.floor(
        10000 + Math.random() * 90000
      );

      const documentId = `${prefix}${randomNumber}`;

      const existing = await prisma.goodsReturn.findUnique({
        where: {
          returnDocumentId: documentId,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return documentId;
      }
    }

    throw new GoodsReturnServiceError(
      'Unable to generate a unique Goods Return document number.',
      500,
      'DOCUMENT_ID_GENERATION_FAILED'
    );
  }

  /**
   * Convert a database Goods Return record into the API DTO.
   */
  private formatGoodsReturnResponse(record: any): GoodsReturnResponseDTO {
    const issue = record.goodsIssue;
    const lineSale = issue?.lineSale;
    const depot = issue?.depot;
    const salesOfficer = lineSale?.salesOfficer;

    const items: GoodsReturnItemResponseDTO[] = (
      record.items || []
    ).map((item: any) => {
      const issuedQty = this.decimalToNumber(item.issuedQty);
      const soldQty = this.decimalToNumber(item.soldQty);
      const returnQty = this.decimalToNumber(item.returnQty);
      const damagedQty = this.decimalToNumber(item.damagedQty);
      const rate = this.decimalToNumber(item.rate);

      return {
        id: item.id,
        goodsReturnItemId: item.id,
        goodsReturnId: item.goodsReturnId,
        goodsIssueItemId: item.goodsIssueItemId,
        productId: item.productId,

        productCode:
          item.product?.materialCode ||
          `PROD-${item.productId}`,

        materialCode:
          item.product?.materialCode ||
          `PROD-${item.productId}`,

        productName:
          item.product?.description ||
          `Product ${item.productId}`,

        additionalName: (() => {
          const raw = item.product?.additionalName;

          if (!raw) {
            return '';
          }

          try {
            const parsed =
              typeof raw === 'string'
                ? JSON.parse(raw)
                : raw;

            return parsed?.shortName || String(raw);
          } catch {
            return String(raw);
          }
        })(),

        issuedQty,
        soldQty,
        returnQty,
        damagedQty,
        uom:
          item.uom ||
          item.product?.baseUom ||
          'Box',

        rate,

        amount: Number(
          (returnQty * rate).toFixed(2)
        ),
      };
    });

    return {
      id: record.returnDocumentId,
      goodsReturnId: record.id,
      returnDocumentId: record.returnDocumentId,

      goodsIssueId: record.goodsIssueId,

      goodsIssueDocumentId:
        issue?.documentId ||
        String(record.goodsIssueId),

      depotId:
        issue?.depotId ||
        depot?.id ||
        0,

      depotCode:
        depot?.code ||
        '',

      depotName:
        depot?.name ||
        '',

      lineSaleId:
        issue?.lineSaleId ||
        lineSale?.id ||
        0,

      partyCode:
        lineSale?.partyCode ||
        '',

      partyName:
        lineSale?.accountName ||
        '',

      vehicleNumber:
        issue?.vehicleNumber ||
        lineSale?.vehicleNumber ||
        '',

      salesOfficerId:
        lineSale?.salesOfficerId ||
        salesOfficer?.id ||
        0,

      salesOfficerUsername:
        salesOfficer?.loginId ||
        '',

      salesOfficerName:
        salesOfficer?.employeeName ||
        '',

      closingMeterReading:
        record.closingMeterReading === null ||
        record.closingMeterReading === undefined
          ? null
          : this.decimalToNumber(
              record.closingMeterReading
            ),

      totalSoldAmount:
        this.decimalToNumber(
          record.totalSoldAmount
        ),

      totalCollectionCash:
        this.decimalToNumber(
          record.totalCollectionCash
        ),

      totalCollectionUpi:
        this.decimalToNumber(
          record.totalCollectionUpi
        ),

      shortageAmount:
        this.decimalToNumber(
          record.shortageAmount
        ),

      status:
        record.status || 'COMPLETED',

      remarks:
        record.remarks ?? null,

      reconciliationDate:
        this.dateToString(
          record.reconciliationDate
        ),

      createdAt:
        this.dateToString(
          record.createdAt
        ),

      updatedAt:
        this.dateToString(
          record.updatedAt
        ),

      itemCount: items.length,
      items,
    };
  }

  /**
   * Common Prisma include graph.
   */
  private readonly includeRelations = {
    goodsIssue: {
      include: {
        depot: true,
        lineSale: {
          include: {
            salesOfficer: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    },

    items: {
      include: {
        product: true,
        goodsIssueItem: true,
      },
    },
  } satisfies Prisma.GoodsReturnInclude;

  /**
   * GET Goods Returns.
   */
  async getGoodsReturns(
    filters: GoodsReturnFilterQuery = {},
    currentUser?: any
  ): Promise<GoodsReturnResponseDTO[]> {
    try {
      const where: Prisma.GoodsReturnWhereInput = {};

      if (filters.goodsIssueId) {
        const goodsIssueId = Number(
          filters.goodsIssueId
        );

        if (!Number.isNaN(goodsIssueId)) {
          where.goodsIssueId = goodsIssueId;
        }
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        where.reconciliationDate = {};

        if (filters.startDate) {
          const startDate = new Date(
            `${filters.startDate}T00:00:00`
          );

          if (!Number.isNaN(startDate.getTime())) {
            where.reconciliationDate.gte = startDate;
          }
        }

        if (filters.endDate) {
          const endDate = new Date(
            `${filters.endDate}T23:59:59.999`
          );

          if (!Number.isNaN(endDate.getTime())) {
            where.reconciliationDate.lte = endDate;
          }
        }
      }

      if (
        filters.search ||
        filters.depotId ||
        filters.lineSaleId
      ) {
        const search = filters.search?.trim();

        const conditions: Prisma.GoodsReturnWhereInput[] = [];

        if (search) {
          conditions.push({
            returnDocumentId: {
              contains: search,
            },
          });

          conditions.push({
            goodsIssue: {
              documentId: {
                contains: search,
              },
            },
          });

          conditions.push({
            goodsIssue: {
              lineSale: {
                partyCode: {
                  contains: search,
                },
              },
            },
          });

          conditions.push({
            goodsIssue: {
              lineSale: {
                accountName: {
                  contains: search,
                },
              },
            },
          });
        }

        if (filters.depotId) {
          const depotId = Number(filters.depotId);

          if (!Number.isNaN(depotId)) {
            conditions.push({
              goodsIssue: {
                depotId,
              },
            });
          }
        }

        if (filters.lineSaleId) {
          const lineSaleId = Number(
            filters.lineSaleId
          );

          if (!Number.isNaN(lineSaleId)) {
            conditions.push({
              goodsIssue: {
                lineSaleId,
              },
            });
          }
        }

        if (conditions.length > 0) {
          where.OR = conditions;
        }
      }

      /*
       * Respect the logged-in user's line-sale assignment
       * when the authenticated user is a Sales Officer.
       */
      if (
        currentUser &&
        (currentUser.role?.code === 'SALES_OFFICER' ||
          currentUser.role?.name === 'Sales Officer')
      ) {
        const salesOfficerId = Number(
          currentUser.id
        );

        if (!Number.isNaN(salesOfficerId)) {
          where.goodsIssue = {
            ...(where.goodsIssue as Prisma.GoodsIssueWhereInput || {}),
            lineSale: {
              salesOfficerId,
            },
          };
        }
      }

      const records = await prisma.goodsReturn.findMany({
        where,

        include: this.includeRelations,

        orderBy: {
          reconciliationDate: 'desc',
        },
      });

      return records.map((record) =>
        this.formatGoodsReturnResponse(record)
      );
    } catch (err) {
      if (err instanceof GoodsReturnServiceError) {
        throw err;
      }

      throw new GoodsReturnServiceError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch Goods Returns.',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * GET a single Goods Return by numeric ID or document ID.
   */
  async getGoodsReturnById(
    idOrDocumentId: string | number
  ): Promise<GoodsReturnResponseDTO> {
    try {
      const rawId = String(idOrDocumentId).trim();

      if (!rawId) {
        throw new GoodsReturnServiceError(
          'Goods Return ID is required.',
          400,
          'VALIDATION_ERROR'
        );
      }

      const numericId = Number(rawId);

      const record = await prisma.goodsReturn.findFirst({
        where: Number.isInteger(numericId)
          ? {
              OR: [
                {
                  id: numericId,
                },
                {
                  returnDocumentId: rawId,
                },
              ],
            }
          : {
              returnDocumentId: rawId,
            },

        include: this.includeRelations,
      });

      if (!record) {
        throw new GoodsReturnServiceError(
          `Goods Return '${rawId}' not found.`,
          404,
          'GOODS_RETURN_NOT_FOUND'
        );
      }

      return this.formatGoodsReturnResponse(record);
    } catch (err) {
      if (err instanceof GoodsReturnServiceError) {
        throw err;
      }

      throw new GoodsReturnServiceError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch Goods Return.',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Create Goods Return transactionally.
   */
  async createGoodsReturn(
    dto: CreateGoodsReturnDTO,
    currentUser?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<GoodsReturnResponseDTO> {
    if (!dto || typeof dto !== 'object') {
      throw new GoodsReturnServiceError(
        'Request body is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      !dto.goodsIssueId ||
      !Number.isInteger(Number(dto.goodsIssueId))
    ) {
      throw new GoodsReturnServiceError(
        'Goods Issue ID is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      !Array.isArray(dto.items) ||
      dto.items.length === 0
    ) {
      throw new GoodsReturnServiceError(
        'Goods Return must contain at least one item.',
        400,
        'EMPTY_ITEMS'
      );
    }

    const goodsIssueId = Number(
      dto.goodsIssueId
    );

    const goodsIssue =
      await prisma.goodsIssue.findUnique({
        where: {
          id: goodsIssueId,
        },

        include: {
          depot: true,

          lineSale: {
            include: {
              salesOfficer: {
                include: {
                  role: true,
                },
              },
            },
          },

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!goodsIssue) {
      throw new GoodsReturnServiceError(
        `Goods Issue '${goodsIssueId}' not found.`,
        404,
        'GOODS_ISSUE_NOT_FOUND'
      );
    }

    if (
      currentUser &&
      (currentUser.role?.code === 'SALES_OFFICER' ||
        currentUser.role?.name === 'Sales Officer') &&
      goodsIssue.lineSale.salesOfficerId !==
        Number(currentUser.id)
    ) {
      throw new GoodsReturnServiceError(
        'You are not authorized to create a Goods Return for this Goods Issue.',
        403,
        'FORBIDDEN'
      );
    }

    const issueItemsById = new Map(
      goodsIssue.items.map((item) => [
        item.id,
        item,
      ])
    );

    const normalizedItems = dto.items.map(
      (item, index) => {
        const goodsIssueItemId = Number(
          item.goodsIssueItemId
        );

        const issueItem =
          issueItemsById.get(goodsIssueItemId);

        if (!issueItem) {
          throw new GoodsReturnServiceError(
            `Goods Issue Item '${item.goodsIssueItemId}' does not belong to Goods Issue '${goodsIssueId}'.`,
            400,
            'INVALID_GOODS_ISSUE_ITEM'
          );
        }

        const productId = Number(
          item.productId
        );

        if (
          !Number.isInteger(productId) ||
          productId !== issueItem.productId
        ) {
          throw new GoodsReturnServiceError(
            `Invalid product for Goods Issue Item '${goodsIssueItemId}'.`,
            400,
            'INVALID_PRODUCT'
          );
        }

        const issuedQty = Number(
          item.issuedQty
        );

        const soldQty = Number(
          item.soldQty
        );

        const returnQty = Number(
          item.returnQty
        );

        const damagedQty = Number(
          item.damagedQty || 0
        );

        if (
          !Number.isFinite(issuedQty) ||
          issuedQty < 0
        ) {
          throw new GoodsReturnServiceError(
            `Invalid issued quantity for item ${index + 1}.`,
            400,
            'INVALID_QUANTITY'
          );
        }

        if (
          !Number.isFinite(soldQty) ||
          soldQty < 0
        ) {
          throw new GoodsReturnServiceError(
            `Invalid sold quantity for item ${index + 1}.`,
            400,
            'INVALID_QUANTITY'
          );
        }

        if (
          !Number.isFinite(returnQty) ||
          returnQty < 0
        ) {
          throw new GoodsReturnServiceError(
            `Invalid return quantity for item ${index + 1}.`,
            400,
            'INVALID_QUANTITY'
          );
        }

        if (
          !Number.isFinite(damagedQty) ||
          damagedQty < 0
        ) {
          throw new GoodsReturnServiceError(
            `Invalid damaged quantity for item ${index + 1}.`,
            400,
            'INVALID_QUANTITY'
          );
        }

        if (
          returnQty + damagedQty > issuedQty
        ) {
          throw new GoodsReturnServiceError(
            `Return quantity plus damaged quantity cannot exceed issued quantity for item ${index + 1}.`,
            400,
            'QUANTITY_EXCEEDS_ISSUED'
          );
        }

        if (
          soldQty > issuedQty
        ) {
          throw new GoodsReturnServiceError(
            `Sold quantity cannot exceed issued quantity for item ${index + 1}.`,
            400,
            'SOLD_QTY_EXCEEDS_ISSUED'
          );
        }

        return {
          goodsIssueItemId,
          productId,
          issuedQty,
          soldQty,
          returnQty,
          damagedQty,
          uom:
            item.uom ||
            issueItem.uom ||
            issueItem.product.baseUom,

          rate:
            Number.isFinite(Number(item.rate)) &&
            Number(item.rate) >= 0
              ? Number(item.rate)
              : Number(issueItem.rate),
        };
      }
    );

    /*
     * Prevent duplicate completed/persisted return vouchers
     * for the same Goods Issue.
     */
    const existingReturn =
      await prisma.goodsReturn.findFirst({
        where: {
          goodsIssueId,
          status: {
            not: 'CANCELLED',
          },
        },

        select: {
          id: true,
          returnDocumentId: true,
        },
      });

    if (existingReturn) {
      throw new GoodsReturnServiceError(
        `Goods Return '${existingReturn.returnDocumentId}' already exists for Goods Issue '${goodsIssue.documentId}'.`,
        409,
        'DUPLICATE_GOODS_RETURN'
      );
    }

    const returnDocumentId =
      await this.generateReturnDocumentId();

    try {
      const created =
        await prisma.$transaction(
          async (tx) => {
            const header =
              await tx.goodsReturn.create({
                data: {
                  returnDocumentId,

                  goodsIssueId,

                  status: 'COMPLETED',

                  closingMeterReading:
                    dto.closingMeterReading !==
                    undefined
                      ? new Prisma.Decimal(
                          dto.closingMeterReading
                        )
                      : null,

                  totalSoldAmount:
                    new Prisma.Decimal(
                      dto.totalSoldAmount || 0
                    ),

                  totalCollectionCash:
                    new Prisma.Decimal(
                      dto.totalCollectionCash || 0
                    ),

                  totalCollectionUpi:
                    new Prisma.Decimal(
                      dto.totalCollectionUpi || 0
                    ),

                  shortageAmount:
                    new Prisma.Decimal(
                      dto.shortageAmount || 0
                    ),

                  remarks:
                    dto.remarks?.trim() || null,

                  items: {
                    create:
                      normalizedItems.map(
                        (item) => ({
                          goodsIssueItemId:
                            item.goodsIssueItemId,

                          productId:
                            item.productId,

                          issuedQty:
                            new Prisma.Decimal(
                              item.issuedQty
                            ),

                          soldQty:
                            new Prisma.Decimal(
                              item.soldQty
                            ),

                          returnQty:
                            new Prisma.Decimal(
                              item.returnQty
                            ),

                          damagedQty:
                            new Prisma.Decimal(
                              item.damagedQty
                            ),

                          uom: item.uom,

                          rate:
                            new Prisma.Decimal(
                              item.rate
                            ),
                        })
                      ),
                  },
                },

                include:
                  this.includeRelations,
              });

            /*
             * Mark the source Goods Issue as completed
             * when the return has been reconciled.
             */
            if (
              goodsIssue.status !==
              'COMPLETED'
            ) {
              await tx.goodsIssue.update({
                where: {
                  id: goodsIssueId,
                },

                data: {
                  status: 'COMPLETED',

                  closingMeterReading:
                    dto.closingMeterReading !==
                    undefined
                      ? new Prisma.Decimal(
                          dto.closingMeterReading
                        )
                      : undefined,
                },
              });
            }

            /*
             * Audit the database transaction.
             */
            if (currentUser?.id) {
              await tx.auditLog.create({
                data: {
                  userId: Number(
                    currentUser.id
                  ),

                  action: 'CREATE',

                  entityType:
                    'GoodsReturn',

                  entityId:
                    returnDocumentId,

                  oldValues: null,

                  newValues:
                    JSON.stringify({
                      goodsIssueId,
                      returnDocumentId,
                      itemCount:
                        normalizedItems.length,
                    }),

                  ipAddress:
                    ipAddress || null,

                  userAgent:
                    userAgent ||
                    'GoodsReturnService',
                },
              });
            }

            return header;
          }
        );

      return this.formatGoodsReturnResponse(
        created
      );
    } catch (err: any) {
      if (
        err instanceof GoodsReturnServiceError
      ) {
        throw err;
      }

      if (
        err?.code === 'P2002'
      ) {
        throw new GoodsReturnServiceError(
          'A Goods Return with the same document already exists.',
          409,
          'DUPLICATE_GOODS_RETURN'
        );
      }

      throw new GoodsReturnServiceError(
        err instanceof Error
          ? err.message
          : 'Failed to create Goods Return.',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Update an existing Goods Return.
   */
  async updateGoodsReturn(
    idOrDocumentId: string | number,
    dto: UpdateGoodsReturnDTO,
    currentUser?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<GoodsReturnResponseDTO> {
    const existing =
      await this.getGoodsReturnById(
        idOrDocumentId
      );

    const numericId =
      existing.goodsReturnId;

    if (
      dto.closingMeterReading !==
        undefined &&
      (!Number.isFinite(
        Number(dto.closingMeterReading)
      ) ||
        Number(dto.closingMeterReading) < 0)
    ) {
      throw new GoodsReturnServiceError(
        'Closing meter reading must be a valid non-negative number.',
        400,
        'INVALID_METER_READING'
      );
    }

    if (
      dto.items !== undefined &&
      (!Array.isArray(dto.items) ||
        dto.items.length === 0)
    ) {
      throw new GoodsReturnServiceError(
        'Goods Return items cannot be empty.',
        400,
        'EMPTY_ITEMS'
      );
    }

    try {
      const updated =
        await prisma.$transaction(
          async (tx) => {
            const updateData: Prisma.GoodsReturnUpdateInput =
              {};

            if (
              dto.closingMeterReading !==
              undefined
            ) {
              updateData.closingMeterReading =
                new Prisma.Decimal(
                  dto.closingMeterReading
                );
            }

            if (
              dto.totalSoldAmount !==
              undefined
            ) {
              updateData.totalSoldAmount =
                new Prisma.Decimal(
                  dto.totalSoldAmount
                );
            }

            if (
              dto.totalCollectionCash !==
              undefined
            ) {
              updateData.totalCollectionCash =
                new Prisma.Decimal(
                  dto.totalCollectionCash
                );
            }

            if (
              dto.totalCollectionUpi !==
              undefined
            ) {
              updateData.totalCollectionUpi =
                new Prisma.Decimal(
                  dto.totalCollectionUpi
                );
            }

            if (
              dto.shortageAmount !==
              undefined
            ) {
              updateData.shortageAmount =
                new Prisma.Decimal(
                  dto.shortageAmount
                );
            }

            if (
              dto.remarks !== undefined
            ) {
              updateData.remarks =
                dto.remarks?.trim() ||
                null;
            }

            /*
             * Replace item rows atomically when provided.
             */
            if (dto.items) {
  const current = await tx.goodsReturn.findUnique({
    where: {
      id: numericId,
    },
    include: {
      goodsIssue: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!current) {
    throw new GoodsReturnServiceError(
      'Goods Return not found.',
      404,
      'GOODS_RETURN_NOT_FOUND'
    );
  }

  const issueItemsById = new Map(
    current.goodsIssue.items.map((item) => [item.id, item])
  );

  const normalizedItems = dto.items.map((item) => {
    const issueItem = issueItemsById.get(
      Number(item.goodsIssueItemId)
    );

    if (!issueItem) {
      throw new GoodsReturnServiceError(
        `Goods Issue Item '${item.goodsIssueItemId}' does not belong to the source Goods Issue.`,
        400,
        'INVALID_GOODS_ISSUE_ITEM'
      );
    }

    const issuedQty = Number(item.issuedQty);
    const soldQty = Number(item.soldQty);
    const returnQty = Number(item.returnQty);
    const damagedQty = Number(item.damagedQty || 0);

    if (
      returnQty < 0 ||
      damagedQty < 0 ||
      returnQty + damagedQty > issuedQty
    ) {
      throw new GoodsReturnServiceError(
        'Invalid Goods Return quantities.',
        400,
        'INVALID_QUANTITY'
      );
    }

    return {
      goodsIssueItemId: issueItem.id,
      productId: issueItem.productId,
      issuedQty,
      soldQty,
      returnQty,
      damagedQty,
      uom: item.uom || issueItem.uom,
      rate: Number(item.rate ?? issueItem.rate),
    };
  });

  await tx.goodsReturnItem.deleteMany({
    where: {
      goodsReturnId: numericId,
    },
  });

  await tx.goodsReturnItem.createMany({
    data: normalizedItems.map((item) => ({
      goodsReturnId: numericId,
      goodsIssueItemId: item.goodsIssueItemId,
      productId: item.productId,
      issuedQty: new Prisma.Decimal(item.issuedQty),
      soldQty: new Prisma.Decimal(item.soldQty),
      returnQty: new Prisma.Decimal(item.returnQty),
      damagedQty: new Prisma.Decimal(item.damagedQty),
      uom: item.uom,
      rate: new Prisma.Decimal(item.rate),
    })),
  });
}

            const updatedRecord =
              await tx.goodsReturn.update({
                where: {
                  id: numericId,
                },

                data: updateData,

                include:
                  this.includeRelations,
              });

            if (currentUser?.id) {
              await tx.auditLog.create({
                data: {
                  userId: Number(
                    currentUser.id
                  ),

                  action: 'UPDATE',

                  entityType:
                    'GoodsReturn',

                  entityId:
                    existing.returnDocumentId,

                  oldValues:
                    JSON.stringify({
                      status:
                        existing.status,
                    }),

                  newValues:
                    JSON.stringify(dto),

                  ipAddress:
                    ipAddress || null,

                  userAgent:
                    userAgent ||
                    'GoodsReturnService',
                },
              });
            }

                        return updatedRecord;
          }
        );

      return this.formatGoodsReturnResponse(updated);
    } catch (err) {
      if (
        err instanceof GoodsReturnServiceError
      ) {
        throw err;
      }

      throw new GoodsReturnServiceError(
        err instanceof Error
          ? err.message
          : 'Failed to update Goods Return.',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Update Goods Return status.
   */
  async updateGoodsReturnStatus(
    idOrDocumentId: string | number,
    status: string,
    currentUser?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<GoodsReturnResponseDTO> {
    const normalizedStatus =
      String(status || '')
        .trim()
        .toUpperCase();

    const allowedStatuses = [
      'PENDING',
      'COMPLETED',
      'CANCELLED',
    ];

    if (
      !allowedStatuses.includes(
        normalizedStatus
      )
    ) {
      throw new GoodsReturnServiceError(
        `Invalid Goods Return status '${status}'.`,
        400,
        'INVALID_STATUS'
      );
    }

    const existing =
      await this.getGoodsReturnById(
        idOrDocumentId
      );

    try {
      const updated =
        await prisma.$transaction(
          async (tx) => {
            const record =
              await tx.goodsReturn.update({
                where: {
                  id: existing.goodsReturnId,
                },

                data: {
                  status:
                    normalizedStatus,
                },

                include:
                  this.includeRelations,
              });

            if (currentUser?.id) {
              await tx.auditLog.create({
                data: {
                  userId: Number(
                    currentUser.id
                  ),

                  action: 'STATUS_CHANGE',

                  entityType:
                    'GoodsReturn',

                  entityId:
                    existing.returnDocumentId,

                  oldValues:
                    JSON.stringify({
                      status:
                        existing.status,
                    }),

                  newValues:
                    JSON.stringify({
                      status:
                        normalizedStatus,
                    }),

                  ipAddress:
                    ipAddress || null,

                  userAgent:
                    userAgent ||
                    'GoodsReturnService',
                },
              });
            }

            return record;
          }
        );

      return this.formatGoodsReturnResponse(
        updated
      );
    } catch (err) {
      if (
        err instanceof GoodsReturnServiceError
      ) {
        throw err;
      }

      throw new GoodsReturnServiceError(
        err instanceof Error
          ? err.message
          : 'Failed to update Goods Return status.',
        500,
        'DATABASE_ERROR'
      );
    }
  }
}

export const goodsReturnService =
  new GoodsReturnService();