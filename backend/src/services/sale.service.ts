import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import {
  CreateSaleDTO,
  UpdateSaleDTO,
  CreatePaymentForSaleDTO,
  UpdatePaymentDTO,
  SaleFilterQuery,
  SaleResponseDTO,
  SaleItemResponseDTO,
  PaymentResponseDTO,
  SaleSummaryDTO,
} from '../types/sale.types.js';
import { JWTPayload } from '../types/auth.types.js';

export class SaleServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = 'SALE_ERROR'
  ) {
    super(message);
    this.name = 'SaleServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class SaleService {
  // ---------------------------------------------------------------------------
  // Decimal / numeric helpers
  // ---------------------------------------------------------------------------

  private decimal(value: unknown): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) {
      return value;
    }

    if (value === null || value === undefined || value === '') {
      return new Prisma.Decimal(0);
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return new Prisma.Decimal(0);
    }

    return new Prisma.Decimal(numeric);
  }

  private decimalNumber(
    value: unknown,
    decimals = 2
  ): number {
    const d = this.decimal(value);
    return Number(d.toFixed(decimals));
  }

  private positiveNumber(
    value: unknown,
    fieldName: string,
    allowZero = true
  ): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      throw new SaleServiceError(
        `${fieldName} must be a valid number.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    if (allowZero ? numeric < 0 : numeric <= 0) {
      throw new SaleServiceError(
        `${fieldName} must be ${allowZero ? 'non-negative' : 'greater than zero'}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    return numeric;
  }

  private parseDate(
    value: string | Date | undefined,
    fieldName: string
  ): Date | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const date = value instanceof Date
      ? new Date(value.getTime())
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new SaleServiceError(
        `${fieldName} contains an invalid date.`,
        400,
        'INVALID_DATE'
      );
    }

    return date;
  }

  private parseId(
    value: number | string,
    fieldName: string
  ): number {
    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new SaleServiceError(
        `${fieldName} must be a valid positive integer.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    return numeric;
  }

  // ---------------------------------------------------------------------------
  // Invoice / payment helpers
  // ---------------------------------------------------------------------------

  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `INV-${timestamp.slice(-10)}-${random}`;
  }

  private generatePaymentReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');

    return `PAY-${timestamp.slice(-10)}-${random}`;
  }

  private calculatePaymentStatus(
    netAmount: Prisma.Decimal,
    paidAmount: Prisma.Decimal
  ): string {
    const net = netAmount.toNumber();
    const paid = paidAmount.toNumber();

    if (paid <= 0) {
      return 'PENDING';
    }

    if (paid < net) {
      return 'PARTIAL';
    }

    if (paid >= net) {
      return 'PAID';
    }

    return 'PENDING';
  }

  // ---------------------------------------------------------------------------
  // Product / price / scheme resolution
  // ---------------------------------------------------------------------------

  private async resolveProduct(
    tx: Prisma.TransactionClient,
    productIdentifier: number | string
  ) {
    const raw = String(productIdentifier).trim();

    if (!raw) {
      throw new SaleServiceError(
        'Product ID is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const numericId = Number(raw);

    let product = null;

    if (
      Number.isInteger(numericId) &&
      numericId > 0 &&
      String(numericId) === raw
    ) {
      product = await tx.product.findUnique({
        where: { id: numericId },
      });
    }

    if (!product) {
      product = await tx.product.findUnique({
        where: { materialCode: raw },
      });
    }

    if (!product) {
      throw new SaleServiceError(
        `Product '${productIdentifier}' was not found in Product Master.`,
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    if (!product.isActive) {
      throw new SaleServiceError(
        `Product '${product.materialCode}' is inactive.`,
        400,
        'PRODUCT_INACTIVE'
      );
    }

    return product;
  }

  private async resolveLineSale(
    tx: Prisma.TransactionClient,
    lineSaleIdentifier: number | string
  ) {
    const raw = String(lineSaleIdentifier).trim();
    const numericId = Number(raw);

    let lineSale = null;

    if (
      Number.isInteger(numericId) &&
      numericId > 0 &&
      String(numericId) === raw
    ) {
      lineSale = await tx.lineSaleAccount.findUnique({
        where: { id: numericId },
        include: {
          priceList: true,
          salesOfficer: {
            include: {
              role: true,
            },
          },
          lineSaleSchemes: {
            where: {
              isActive: true,
            },
            include: {
              schemeList: {
                include: {
                  items: true,
                },
              },
            },
          },
        },
      });
    }

    if (!lineSale) {
      lineSale = await tx.lineSaleAccount.findUnique({
        where: {
          partyCode: raw,
        },
        include: {
          priceList: true,
          salesOfficer: {
            include: {
              role: true,
            },
          },
          lineSaleSchemes: {
            where: {
              isActive: true,
            },
            include: {
              schemeList: {
                include: {
                  items: true,
                },
              },
            },
          },
        },
      });
    }

    if (!lineSale) {
      throw new SaleServiceError(
        `Line Sale '${lineSaleIdentifier}' was not found.`,
        404,
        'LINE_SALE_NOT_FOUND'
      );
    }

    if (!lineSale.isActive) {
      throw new SaleServiceError(
        `Line Sale '${lineSale.partyCode}' is inactive.`,
        400,
        'LINE_SALE_INACTIVE'
      );
    }

    return lineSale;
  }

  private async validateSalesOfficer(
    tx: Prisma.TransactionClient,
    authenticatedUserId: number,
    lineSaleSalesOfficerId: number
  ) {
    const user = await tx.user.findUnique({
      where: {
        id: authenticatedUserId,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new SaleServiceError(
        'Authenticated user was not found.',
        401,
        'USER_NOT_FOUND'
      );
    }

    if (!user.isActive) {
      throw new SaleServiceError(
        'Authenticated user is inactive.',
        403,
        'USER_INACTIVE'
      );
    }

    if (user.id !== lineSaleSalesOfficerId) {
      throw new SaleServiceError(
        'The selected Line Sale is not assigned to the authenticated Sales Officer.',
        403,
        'LINE_SALE_ACCESS_DENIED'
      );
    }

    return user;
  }

  private async resolvePrice(
    tx: Prisma.TransactionClient,
    lineSale: any,
    productId: number,
    requestedUom?: string
  ): Promise<{
    rate: Prisma.Decimal;
    uom: string;
  }> {
    if (lineSale.priceListId) {
      const priceList = lineSale.priceList;

      if (!priceList) {
        throw new SaleServiceError(
          `Price List '${lineSale.priceListId}' configured for Line Sale '${lineSale.partyCode}' was not found.`,
          404,
          'PRICE_LIST_NOT_FOUND'
        );
      }

      if (!priceList.isActive) {
        throw new SaleServiceError(
          `Price List '${priceList.code}' is inactive.`,
          400,
          'PRICE_LIST_INACTIVE'
        );
      }

      const today = new Date();

      if (priceList.validFrom && today < priceList.validFrom) {
        throw new SaleServiceError(
          `Price List '${priceList.code}' is not yet valid.`,
          400,
          'PRICE_LIST_NOT_VALID'
        );
      }

      if (priceList.validTo && today > priceList.validTo) {
        throw new SaleServiceError(
          `Price List '${priceList.code}' has expired.`,
          400,
          'PRICE_LIST_EXPIRED'
        );
      }

      const item = await tx.priceListItem.findFirst({
        where: {
          priceListId: priceList.id,
          productId,
          ...(requestedUom
            ? { uom: requestedUom }
            : {}),
        },
      });

      if (!item) {
        throw new SaleServiceError(
          `No price configured for product ID '${productId}' in Price List '${priceList.code}'.`,
          400,
          'PRICE_NOT_CONFIGURED'
        );
      }

      return {
        rate: item.rate,
        uom: item.uom,
      };
    }

    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      throw new SaleServiceError(
        `Product '${productId}' was not found.`,
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    return {
      rate: product.baseRate,
      uom: requestedUom || product.baseUom,
    };
  }

  private async resolveSchemeForProduct(
    tx: Prisma.TransactionClient,
    lineSaleId: number,
    productId: number,
    quantity: number
  ): Promise<{
    freeQuantity: number;
    discountAmount: number;
    schemeName: string | null;
  }> {
    const mappings = await tx.lineSaleScheme.findMany({
      where: {
        lineSaleId,
        isActive: true,
      },
      include: {
        schemeList: {
          include: {
            items: {
              where: {
                productId,
              },
            },
          },
        },
      },
    });

    let bestFreeQuantity = 0;
    let bestDiscountAmount = 0;
    let selectedSchemeName: string | null = null;

    const now = new Date();

    for (const mapping of mappings) {
      const scheme = mapping.schemeList;

      if (!scheme.isActive) {
        continue;
      }

      if (scheme.validFrom && now < scheme.validFrom) {
        continue;
      }

      if (scheme.validTo && now > scheme.validTo) {
        continue;
      }

      const item = scheme.items[0];

      if (!item) {
        continue;
      }

      const minQty = item.minQty.toNumber();

      if (quantity < minQty) {
        continue;
      }

      const multiplier = minQty > 0
        ? Math.floor(quantity / minQty)
        : 0;

      const freeQty = item.freeQty.toNumber() * multiplier;

      const discountPercent = item.discountPercent.toNumber();

      const discountAmount = item.discountAmount.toNumber() * multiplier;

      if (
        freeQty > bestFreeQuantity ||
        discountAmount > bestDiscountAmount
      ) {
        bestFreeQuantity = freeQty;
        bestDiscountAmount = discountAmount;
        selectedSchemeName = scheme.name;
      }

      if (discountPercent > 0) {
        // Percentage discount is applied later against the item's gross value.
        // We don't return it here because the current SaleItem schema stores
        // only the resulting discount amount.
      }
    }

    return {
      freeQuantity: bestFreeQuantity,
      discountAmount: bestDiscountAmount,
      schemeName: selectedSchemeName,
    };
  }


    // ---------------------------------------------------------------------------
  // STOCK VALIDATION
  // ---------------------------------------------------------------------------

  private async validateSaleStock(
    tx: Prisma.TransactionClient,
    lineSaleId: number,
    items: Array<{
      productId: number;
      quantity: Prisma.Decimal;
      freeQuantity: Prisma.Decimal;
    }>,
    excludeSaleId?: number
  ): Promise<void> {
    /*
     * A Sale is currently linked to Line Sale, not directly to Goods Issue.
     * Therefore, stock validation is performed against the latest active
     * Goods Issue for that Line Sale.
     */

    const goodsIssue =
      await tx.goodsIssue.findFirst({
        where: {
          lineSaleId,
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          items: true,
        },
        orderBy: [
          {
            issueDate: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      });

    if (!goodsIssue) {
      throw new SaleServiceError(
        'No Goods Issue is available for this Line Sale. Stock must be issued before a sale can be created.',
        400,
        'NO_STOCK_ISSUED'
      );
    }

    /*
     * Aggregate issued quantity by product.
     */
    const issuedByProduct =
      new Map<number, Prisma.Decimal>();

    for (const issueItem of goodsIssue.items) {
      const current =
        issuedByProduct.get(
          issueItem.productId
        ) || new Prisma.Decimal(0);

      issuedByProduct.set(
        issueItem.productId,
        current.add(
          this.decimal(
            issueItem.quantity
          )
        )
      );
    }

    /*
     * Find existing sales for the same Line Sale.
     *
     * Because Sale currently has no goodsIssueId, we only consider sales
     * belonging to the current Goods Issue period.
     */
    const existingSales =
      await tx.sale.findMany({
        where: {
          lineSaleId,
          saleDate: {
            gte: goodsIssue.issueDate,
          },
          ...(excludeSaleId
            ? {
                id: {
                  not: excludeSaleId,
                },
              }
            : {}),
        },
        include: {
          items: true,
        },
      });

    /*
     * Aggregate consumed physical quantity:
     *
     * sold quantity + free quantity
     */
    const consumedByProduct =
      new Map<number, Prisma.Decimal>();

    for (const sale of existingSales) {
      for (const saleItem of sale.items) {
        const current =
          consumedByProduct.get(
            saleItem.productId
          ) || new Prisma.Decimal(0);

        const consumed =
          this.decimal(
            saleItem.quantity
          ).add(
            this.decimal(
              saleItem.freeQuantity
            )
          );

        consumedByProduct.set(
          saleItem.productId,
          current.add(consumed)
        );
      }
    }

    /*
     * Aggregate requested quantity for the new/updated sale.
     */
    const requestedByProduct =
      new Map<number, Prisma.Decimal>();

    for (const item of items) {
      const current =
        requestedByProduct.get(
          item.productId
        ) || new Prisma.Decimal(0);

      const requested =
        this.decimal(
          item.quantity
        ).add(
          this.decimal(
            item.freeQuantity
          )
        );

      requestedByProduct.set(
        item.productId,
        current.add(requested)
      );
    }

    /*
     * Validate every requested product.
     */
    for (
      const [
        productId,
        requestedQuantity,
      ] of requestedByProduct
    ) {
      const issued =
        issuedByProduct.get(productId) ||
        new Prisma.Decimal(0);

      const alreadyConsumed =
        consumedByProduct.get(productId) ||
        new Prisma.Decimal(0);

      const available =
        issued.sub(
          alreadyConsumed
        );

      if (
        requestedQuantity.gt(
          available
        )
      ) {
        const product =
          await tx.product.findUnique({
            where: {
              id: productId,
            },
            select: {
              materialCode: true,
              description: true,
            },
          });

        const productName =
          product?.materialCode ||
          product?.description ||
          `Product ${productId}`;

        throw new SaleServiceError(
          `Insufficient stock for '${productName}'. Issued: ${issued.toFixed(3)}, already consumed: ${alreadyConsumed.toFixed(3)}, available: ${Prisma.Decimal.max(available, new Prisma.Decimal(0)).toFixed(3)}, requested: ${requestedQuantity.toFixed(3)}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }
    }
  }


  // ---------------------------------------------------------------------------
  // Response formatting
  // ---------------------------------------------------------------------------

  private formatPayment(payment: any): PaymentResponseDTO {
    return {
      id: payment.id,
      paymentId: payment.id,
      saleId: payment.saleId,
      paymentReference: payment.paymentReference,
      paymentMethod: payment.paymentMethod,
      amount: this.decimalNumber(payment.amount, 2),
      upiReference: payment.upiReference || null,
      status: payment.status,
      paymentDate: new Date(payment.paymentDate).toISOString(),
      createdAt: new Date(payment.createdAt).toISOString(),
      updatedAt: new Date(payment.updatedAt).toISOString(),
    };
  }

  private formatSaleItem(item: any): SaleItemResponseDTO {
    const product = item.product || {};

    return {
      id: item.id,
      saleItemId: item.id,
      saleId: item.saleId,
      productId: item.productId,

      productCode: product.materialCode || '',
      productName: product.description || '',
      additionalName: product.additionalName || '',

      quantity: this.decimalNumber(item.quantity, 3),
      freeQuantity: this.decimalNumber(item.freeQuantity, 3),
      uom: item.uom,
      rate: this.decimalNumber(item.rate, 2),

      grossAmount: this.decimalNumber(item.grossAmount, 2),
      discountAmount: this.decimalNumber(item.discountAmount, 2),
      netAmount: this.decimalNumber(item.netAmount, 2),

      applicableScheme: item.applicableScheme || null,
    };
  }

  private formatSale(sale: any): SaleResponseDTO {
    const lineSale = sale.lineSale;
    const officer = sale.salesOfficer;

    return {
      id: sale.id,
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,

      lineSaleId: sale.lineSaleId,
      partyCode: lineSale?.partyCode || '',
      partyName: lineSale?.accountName || '',

      salesOfficerId: sale.salesOfficerId,
      salesOfficer: officer
        ? {
            id: officer.id,
            employeeId: officer.employeeId,
            employeeName: officer.employeeName,
            loginId: officer.loginId,
            role: officer.role?.name || officer.role?.code || '',
          }
        : null,

      customerName: sale.customerName,
      customerPhone: sale.customerPhone || null,
      customerAddress: sale.customerAddress || null,

      grossAmount: this.decimalNumber(sale.grossAmount, 2),
      discountAmount: this.decimalNumber(sale.discountAmount, 2),
      taxAmount: this.decimalNumber(sale.taxAmount, 2),
      netAmount: this.decimalNumber(sale.netAmount, 2),

      paymentStatus: sale.paymentStatus,
      status: sale.status,

      saleDate: new Date(sale.saleDate).toISOString(),
      sapInvoiceId: sale.sapInvoiceId || null,

      payments: (sale.payments || []).map((p: any) =>
        this.formatPayment(p)
      ),

      items: (sale.items || []).map((item: any) =>
        this.formatSaleItem(item)
      ),

      createdAt: new Date(sale.createdAt).toISOString(),
      updatedAt: new Date(sale.updatedAt).toISOString(),
    };
  }

  private saleInclude() {
    return {
      lineSale: true,
      salesOfficer: {
        include: {
          role: true,
        },
      },
      items: {
        include: {
          product: true,
        },
        orderBy: {
          id: 'asc' as const,
        },
      },
      payments: {
        orderBy: {
          id: 'asc' as const,
        },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // CREATE SALE
  // ---------------------------------------------------------------------------

  async createSale(
    dto: CreateSaleDTO,
    user: JWTPayload,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SaleResponseDTO> {
    if (!dto) {
      throw new SaleServiceError(
        'Sale request body is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!dto.lineSaleId) {
      throw new SaleServiceError(
        'lineSaleId is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!dto.customerName || !dto.customerName.trim()) {
      throw new SaleServiceError(
        'Customer name is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new SaleServiceError(
        'At least one sale item is required.',
        400,
        'SALE_ITEMS_REQUIRED'
      );
    }

    const authenticatedUserId = Number(user?.userId);

    if (!Number.isInteger(authenticatedUserId) || authenticatedUserId <= 0) {
      throw new SaleServiceError(
        'Authenticated Sales Officer information is invalid.',
        401,
        'INVALID_AUTHENTICATION'
      );
    }

    const lineSaleId = this.parseId(
      dto.lineSaleId,
      'lineSaleId'
    );

    const saleDate =
      this.parseDate(dto.saleDate, 'saleDate') || new Date();

    return prisma.$transaction(
      async (tx) => {
        // ---------------------------------------------------------------------
        // 1. Resolve Line Sale
        // ---------------------------------------------------------------------

        const lineSale = await this.resolveLineSale(
          tx,
          lineSaleId
        );

        // ---------------------------------------------------------------------
        // 2. Authenticate / authorize Sales Officer
        // ---------------------------------------------------------------------

        const salesOfficer = await this.validateSalesOfficer(
          tx,
          authenticatedUserId,
          lineSale.salesOfficerId
        );

        if (
          dto.salesOfficerId !== undefined &&
          Number(dto.salesOfficerId) !== salesOfficer.id
        ) {
          throw new SaleServiceError(
            'salesOfficerId does not match the authenticated Sales Officer.',
            403,
            'SALES_OFFICER_MISMATCH'
          );
        }

        // ---------------------------------------------------------------------
        // 3. Prepare Sale Items
        // ---------------------------------------------------------------------

        const preparedItems: Array<{
          productId: number;
          quantity: Prisma.Decimal;
          freeQuantity: Prisma.Decimal;
          uom: string;
          rate: Prisma.Decimal;
          grossAmount: Prisma.Decimal;
          discountAmount: Prisma.Decimal;
          netAmount: Prisma.Decimal;
          applicableScheme: string | null;
        }> = [];

        let grossAmount = new Prisma.Decimal(0);
        let totalDiscount = new Prisma.Decimal(0);
        let netBeforeTax = new Prisma.Decimal(0);
        let taxAmount = new Prisma.Decimal(0);

        for (const dtoItem of dto.items) {
          if (!dtoItem || !dtoItem.productId) {
            throw new SaleServiceError(
              'Every sale item must contain productId.',
              400,
              'VALIDATION_ERROR'
            );
          }

          const quantity = this.positiveNumber(
            dtoItem.quantity,
            'Item quantity',
            false
          );

          const product = await this.resolveProduct(
            tx,
            dtoItem.productId
          );

          const price = await this.resolvePrice(
            tx,
            lineSale,
            product.id,
            dtoItem.uom
          );

          const rate = dtoItem.rate !== undefined
            ? new Prisma.Decimal(
                this.positiveNumber(
                  dtoItem.rate,
                  'Item rate'
                ).toFixed(2)
              )
            : price.rate;

          const uom = dtoItem.uom?.trim() || price.uom;

          const itemGross = new Prisma.Decimal(
            quantity
          ).mul(rate);

          let itemDiscount = new Prisma.Decimal(
            dtoItem.discountAmount !== undefined
              ? this.positiveNumber(
                  dtoItem.discountAmount,
                  'Item discount'
                )
              : 0
          );

          let applicableScheme: string | null =
            dtoItem.applicableScheme || null;

          let freeQuantity = new Prisma.Decimal(
            dtoItem.freeQuantity !== undefined
              ? this.positiveNumber(
                  dtoItem.freeQuantity,
                  'Free quantity'
                )
              : 0
          );

          // -------------------------------------------------------------------
          // Apply database-configured scheme
          // -------------------------------------------------------------------

          const schemeResult =
            await this.resolveSchemeForProduct(
              tx,
              lineSale.id,
              product.id,
              quantity
            );

          if (
            schemeResult.freeQuantity > freeQuantity.toNumber()
          ) {
            freeQuantity = new Prisma.Decimal(
              schemeResult.freeQuantity
            );
          }

          if (
            schemeResult.discountAmount > itemDiscount.toNumber()
          ) {
            itemDiscount = new Prisma.Decimal(
              schemeResult.discountAmount
            );
          }

          if (schemeResult.schemeName) {
            applicableScheme =
              schemeResult.schemeName;
          }

          // Never allow discount to exceed gross.
          if (itemDiscount.gt(itemGross)) {
            itemDiscount = itemGross;
          }

          const itemNet = itemGross.sub(itemDiscount);

          const taxRate = this.decimal(
            product.taxRate
          );

          const itemTax = itemNet
            .mul(taxRate)
            .div(100);

          grossAmount =
            grossAmount.add(itemGross);

          totalDiscount =
            totalDiscount.add(itemDiscount);

          netBeforeTax =
            netBeforeTax.add(itemNet);

          taxAmount =
            taxAmount.add(itemTax);

          preparedItems.push({
            productId: product.id,
            quantity: new Prisma.Decimal(
              quantity.toFixed(3)
            ),
            freeQuantity: new Prisma.Decimal(
              freeQuantity.toFixed(3)
            ),
            uom,
            rate,
            grossAmount: itemGross.toDecimalPlaces(2),
            discountAmount: itemDiscount.toDecimalPlaces(2),
            netAmount: itemNet.toDecimalPlaces(2),
            applicableScheme,
          });
        }


        // ---------------------------------------------------------------------
        // 3A. Validate available stock
        // ---------------------------------------------------------------------

        await this.validateSaleStock(
          tx,
          lineSale.id,
          preparedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            freeQuantity: item.freeQuantity,
          }))
        );



        // ---------------------------------------------------------------------
        // 4. Header-level discount
        // ---------------------------------------------------------------------

        const headerDiscount =
          dto.discountAmount !== undefined
            ? new Prisma.Decimal(
                this.positiveNumber(
                  dto.discountAmount,
                  'discountAmount'
                ).toFixed(2)
              )
            : new Prisma.Decimal(0);

        totalDiscount =
          totalDiscount.add(headerDiscount);

        if (totalDiscount.gt(grossAmount)) {
          totalDiscount = grossAmount;
        }

        // ---------------------------------------------------------------------
        // 5. Tax
        // ---------------------------------------------------------------------

        const calculatedTax =
          taxAmount;

        const requestedTax =
          dto.taxAmount !== undefined
            ? new Prisma.Decimal(
                this.positiveNumber(
                  dto.taxAmount,
                  'taxAmount'
                ).toFixed(2)
              )
            : calculatedTax;

        taxAmount = requestedTax;

        const netAmount =
          grossAmount
            .sub(totalDiscount)
            .add(taxAmount);

        if (netAmount.lt(0)) {
          throw new SaleServiceError(
            'Calculated sale net amount cannot be negative.',
            400,
            'INVALID_SALE_TOTAL'
          );
        }

        // ---------------------------------------------------------------------
        // 6. Validate payments
        // ---------------------------------------------------------------------

        const paymentDTOs =
          Array.isArray(dto.payments)
            ? dto.payments
            : [];

        let paidAmount =
          new Prisma.Decimal(0);

        for (const payment of paymentDTOs) {
          if (
            !payment.paymentMethod ||
            !payment.paymentMethod.trim()
          ) {
            throw new SaleServiceError(
              'Payment method is required.',
              400,
              'PAYMENT_METHOD_REQUIRED'
            );
          }

          const amount =
            this.positiveNumber(
              payment.amount,
              'Payment amount',
              false
            );

          paidAmount =
            paidAmount.add(
              new Prisma.Decimal(
                amount.toFixed(2)
              )
            );
        }

        if (paidAmount.gt(netAmount)) {
          throw new SaleServiceError(
            `Total payment amount (${paidAmount.toFixed(2)}) cannot exceed sale net amount (${netAmount.toFixed(2)}).`,
            400,
            'PAYMENT_EXCEEDS_SALE'
          );
        }

        const paymentStatus =
          this.calculatePaymentStatus(
            netAmount,
            paidAmount
          );

        // ---------------------------------------------------------------------
        // 7. Invoice number
        // ---------------------------------------------------------------------

        let invoiceNumber =
          dto.invoiceNumber?.trim();

        if (!invoiceNumber) {
          invoiceNumber =
            this.generateInvoiceNumber();
        }

        const existingInvoice =
          await tx.sale.findUnique({
            where: {
              invoiceNumber,
            },
          });

        if (existingInvoice) {
          throw new SaleServiceError(
            `Invoice number '${invoiceNumber}' already exists.`,
            409,
            'DUPLICATE_INVOICE_NUMBER'
          );
        }

        // ---------------------------------------------------------------------
        // 8. Create Sale
        // ---------------------------------------------------------------------

        const createdSale =
          await tx.sale.create({
            data: {
              invoiceNumber,
              lineSaleId: lineSale.id,
              salesOfficerId: salesOfficer.id,

              customerName:
                dto.customerName.trim(),

              customerPhone:
                dto.customerPhone?.trim() || null,

              customerAddress:
                dto.customerAddress?.trim() || null,

              grossAmount:
                grossAmount.toDecimalPlaces(2),

              discountAmount:
                totalDiscount.toDecimalPlaces(2),

              taxAmount:
                taxAmount.toDecimalPlaces(2),

              netAmount:
                netAmount.toDecimalPlaces(2),

              paymentStatus,

              status:
                dto.status?.trim() || 'COMPLETED',

              saleDate,

              sapInvoiceId:
                dto.sapInvoiceId?.trim() || null,

              items: {
                create: preparedItems.map(
                  (item) => ({
                    productId:
                      item.productId,

                    quantity:
                      item.quantity,

                    freeQuantity:
                      item.freeQuantity,

                    uom:
                      item.uom,

                    rate:
                      item.rate,

                    grossAmount:
                      item.grossAmount,

                    discountAmount:
                      item.discountAmount,

                    netAmount:
                      item.netAmount,

                    applicableScheme:
                      item.applicableScheme,
                  })
                ),
              },
            },
            include: this.saleInclude(),
          });

        // ---------------------------------------------------------------------
        // 9. Create payments
        // ---------------------------------------------------------------------

        for (const paymentDTO of paymentDTOs) {
          const amount =
            this.positiveNumber(
              paymentDTO.amount,
              'Payment amount',
              false
            );

          let paymentReference =
            paymentDTO.paymentReference?.trim();

          if (!paymentReference) {
            paymentReference =
              this.generatePaymentReference();
          }

          const duplicatePayment =
            await tx.payment.findUnique({
              where: {
                paymentReference,
              },
            });

          if (duplicatePayment) {
            throw new SaleServiceError(
              `Payment reference '${paymentReference}' already exists.`,
              409,
              'DUPLICATE_PAYMENT_REFERENCE'
            );
          }

          const paymentDate =
            this.parseDate(
              paymentDTO.paymentDate,
              'paymentDate'
            ) || saleDate;

          await tx.payment.create({
            data: {
              saleId:
                createdSale.id,

              paymentReference,

              paymentMethod:
                paymentDTO.paymentMethod
                  .trim()
                  .toUpperCase(),

              amount:
                new Prisma.Decimal(
                  amount.toFixed(2)
                ),

              upiReference:
                paymentDTO.upiReference?.trim() ||
                null,

              status:
                paymentDTO.status?.trim() ||
                'COMPLETED',

              paymentDate,
            },
          });
        }

        // ---------------------------------------------------------------------
        // 10. Recalculate persisted payment status
        // ---------------------------------------------------------------------

        const persistedPayments =
          await tx.payment.findMany({
            where: {
              saleId: createdSale.id,
            },
          });

        const persistedPaidAmount =
          persistedPayments.reduce(
            (
              total: Prisma.Decimal,
              payment: any
            ) =>
              total.add(
                this.decimal(payment.amount)
              ),
            new Prisma.Decimal(0)
          );

        const persistedPaymentStatus =
          this.calculatePaymentStatus(
            netAmount,
            persistedPaidAmount
          );

        await tx.sale.update({
          where: {
            id: createdSale.id,
          },
          data: {
            paymentStatus:
              persistedPaymentStatus,
          },
        });

        // ---------------------------------------------------------------------
        // 11. Audit log
        // ---------------------------------------------------------------------

        await tx.auditLog.create({
          data: {
            userId:
              authenticatedUserId,

            action:
              'SALE_CREATED',

            entityType:
              'SALE',

            entityId:
              String(createdSale.id),

            newValues:
              JSON.stringify({
                invoiceNumber,
                lineSaleId: lineSale.id,
                partyCode: lineSale.partyCode,
                salesOfficerId: salesOfficer.id,
                grossAmount:
                  grossAmount.toFixed(2),
                discountAmount:
                  totalDiscount.toFixed(2),
                taxAmount:
                  taxAmount.toFixed(2),
                netAmount:
                  netAmount.toFixed(2),
                paidAmount:
                  persistedPaidAmount.toFixed(2),
                paymentStatus:
                  persistedPaymentStatus,
                itemCount:
                  preparedItems.length,
              }),

            ipAddress:
              ipAddress || null,

            userAgent:
              userAgent || null,
          },
        });

        // ---------------------------------------------------------------------
        // 12. Reload final transaction state
        // ---------------------------------------------------------------------

        const finalSale =
          await tx.sale.findUnique({
            where: {
              id: createdSale.id,
            },
            include: this.saleInclude(),
          });

        if (!finalSale) {
          throw new SaleServiceError(
            'Sale was created but could not be reloaded.',
            500,
            'SALE_RELOAD_FAILED'
          );
        }

        return this.formatSale(finalSale);
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
  }

  // ---------------------------------------------------------------------------
  // GET SALES
  // ---------------------------------------------------------------------------

  async getSales(
    filters: SaleFilterQuery = {},
    user?: JWTPayload
  ): Promise<SaleResponseDTO[]> {
    const where: Prisma.SaleWhereInput = {};

    if (filters.invoiceNumber?.trim()) {
      where.invoiceNumber = {
        contains:
          filters.invoiceNumber.trim(),
      };
    }

    if (filters.lineSaleId !== undefined) {
      where.lineSaleId =
        this.parseId(
          filters.lineSaleId,
          'lineSaleId'
        );
    }

    if (filters.salesOfficerId !== undefined) {
      where.salesOfficerId =
        this.parseId(
          filters.salesOfficerId,
          'salesOfficerId'
        );
    }

    if (filters.paymentStatus?.trim()) {
      where.paymentStatus =
        filters.paymentStatus.trim().toUpperCase();
    }

    if (filters.status?.trim()) {
      where.status =
        filters.status.trim().toUpperCase();
    }

    if (
      filters.startDate ||
      filters.endDate
    ) {
      const dateFilter: Prisma.DateTimeFilter = {};

      if (filters.startDate) {
        const start =
          this.parseDate(
            filters.startDate,
            'startDate'
          );

        if (start) {
          dateFilter.gte = start;
        }
      }

      if (filters.endDate) {
        const end =
          this.parseDate(
            filters.endDate,
            'endDate'
          );

        if (end) {
          end.setHours(
            23,
            59,
            59,
            999
          );

          dateFilter.lte = end;
        }
      }

      where.saleDate = dateFilter;
    }

    if (filters.search?.trim()) {
      const term =
        filters.search.trim();

      where.OR = [
        {
          invoiceNumber: {
            contains: term,
          },
        },
        {
          customerName: {
            contains: term,
          },
        },
        {
          customerPhone: {
            contains: term,
          },
        },
        {
          lineSale: {
            partyCode: {
              contains: term,
            },
          },
        },
        {
          lineSale: {
            accountName: {
              contains: term,
            },
          },
        },
      ];
    }

    // A Sales Officer sees their own transactions.
    if (
      user &&
      user.roleCode === 'SALES_OFFICER'
    ) {
      where.salesOfficerId =
        user.userId;
    }

    const sales =
      await prisma.sale.findMany({
        where,
        include: this.saleInclude(),
        orderBy: [
          {
            saleDate: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      });

    return sales.map((sale) =>
      this.formatSale(sale)
    );
  }

  // ---------------------------------------------------------------------------
  // GET SALE BY ID
  // ---------------------------------------------------------------------------

  async getSaleById(
    id: string | number,
    user?: JWTPayload
  ): Promise<SaleResponseDTO> {
    const saleId =
      this.parseId(id, 'saleId');

    const sale =
      await prisma.sale.findUnique({
        where: {
          id: saleId,
        },
        include: this.saleInclude(),
      });

    if (!sale) {
      throw new SaleServiceError(
        `Sale '${id}' was not found.`,
        404,
        'SALE_NOT_FOUND'
      );
    }

    if (
      user &&
      user.roleCode === 'SALES_OFFICER' &&
      sale.salesOfficerId !== user.userId
    ) {
      throw new SaleServiceError(
        'You do not have access to this sale.',
        403,
        'SALE_ACCESS_DENIED'
      );
    }

    return this.formatSale(sale);
  }

  // ---------------------------------------------------------------------------
  // UPDATE SALE
  // ---------------------------------------------------------------------------

  async updateSale(
    id: string | number,
    dto: UpdateSaleDTO,
    user: JWTPayload,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SaleResponseDTO> {
    const saleId =
      this.parseId(id, 'saleId');

    return prisma.$transaction(
      async (tx) => {
        const existing =
          await tx.sale.findUnique({
            where: {
              id: saleId,
            },
            include: {
              items: true,
              payments: true,
            },
          });

        if (!existing) {
          throw new SaleServiceError(
            `Sale '${id}' was not found.`,
            404,
            'SALE_NOT_FOUND'
          );
        }

        if (
          user.roleCode === 'SALES_OFFICER' &&
          existing.salesOfficerId !== user.userId
        ) {
          throw new SaleServiceError(
            'You do not have permission to update this sale.',
            403,
            'SALE_ACCESS_DENIED'
          );
        }

        const updateData: Prisma.SaleUpdateInput = {};

        if (
          dto.customerName !== undefined
        ) {
          if (!dto.customerName.trim()) {
            throw new SaleServiceError(
              'Customer name cannot be empty.',
              400,
              'VALIDATION_ERROR'
            );
          }

          updateData.customerName =
            dto.customerName.trim();
        }

        if (
          dto.customerPhone !== undefined
        ) {
          updateData.customerPhone =
            dto.customerPhone?.trim() ||
            null;
        }

        if (
          dto.customerAddress !== undefined
        ) {
          updateData.customerAddress =
            dto.customerAddress?.trim() ||
            null;
        }

        if (
          dto.sapInvoiceId !== undefined
        ) {
          updateData.sapInvoiceId =
            dto.sapInvoiceId?.trim() ||
            null;
        }

        if (
          dto.status !== undefined
        ) {
          updateData.status =
            dto.status.trim().toUpperCase();
        }

        if (
          dto.saleDate !== undefined
        ) {
          const parsedDate =
            this.parseDate(
              dto.saleDate,
              'saleDate'
            );

          if (parsedDate) {
            updateData.saleDate =
              parsedDate;
          }
        }

        // ---------------------------------------------------------------
        // Item reconciliation
        // ---------------------------------------------------------------

        if (dto.items !== undefined) {
          if (
            !Array.isArray(dto.items) ||
            dto.items.length === 0
          ) {
            throw new SaleServiceError(
              'A sale must contain at least one item.',
              400,
              'SALE_ITEMS_REQUIRED'
            );
          }

          const lineSale =
            await this.resolveLineSale(
              tx,
              existing.lineSaleId
            );

          const preparedItems: any[] = [];

          let grossAmount =
            new Prisma.Decimal(0);

          let totalDiscount =
            new Prisma.Decimal(0);

          let taxAmount =
            new Prisma.Decimal(0);

          for (
            const itemDTO of dto.items
          ) {
            if (!itemDTO.productId) {
              throw new SaleServiceError(
                'Each sale item must contain productId.',
                400,
                'VALIDATION_ERROR'
              );
            }

            const product =
              await this.resolveProduct(
                tx,
                itemDTO.productId
              );

            const quantity =
              this.positiveNumber(
                itemDTO.quantity,
                'Item quantity',
                false
              );

            const price =
              await this.resolvePrice(
                tx,
                lineSale,
                product.id,
                itemDTO.uom
              );

            const rate =
              itemDTO.rate !== undefined
                ? new Prisma.Decimal(
                    this.positiveNumber(
                      itemDTO.rate,
                      'Item rate'
                    ).toFixed(2)
                  )
                : price.rate;

            const itemGross =
              new Prisma.Decimal(
                quantity
              ).mul(rate);

            let discount =
              new Prisma.Decimal(
                itemDTO.discountAmount !== undefined
                  ? this.positiveNumber(
                      itemDTO.discountAmount,
                      'Item discount'
                    )
                  : 0
              );

            const scheme =
              await this.resolveSchemeForProduct(
                tx,
                lineSale.id,
                product.id,
                quantity
              );

            if (
              scheme.discountAmount >
              discount.toNumber()
            ) {
              discount =
                new Prisma.Decimal(
                  scheme.discountAmount
                );
            }

            if (discount.gt(itemGross)) {
              discount = itemGross;
            }

            const itemNet =
              itemGross.sub(discount);

            const itemTax =
              itemNet
                .mul(this.decimal(product.taxRate))
                .div(100);

            grossAmount =
              grossAmount.add(itemGross);

            totalDiscount =
              totalDiscount.add(discount);

            taxAmount =
              taxAmount.add(itemTax);

            preparedItems.push({
              productId:
                product.id,

              quantity:
                new Prisma.Decimal(
                  quantity.toFixed(3)
                ),

              freeQuantity:
                new Prisma.Decimal(
                  Math.max(
                    Number(itemDTO.freeQuantity || 0),
                    scheme.freeQuantity
                  ).toFixed(3)
                ),

              uom:
                itemDTO.uom?.trim() ||
                price.uom,

              rate,

              grossAmount:
                itemGross.toDecimalPlaces(2),

              discountAmount:
                discount.toDecimalPlaces(2),

              netAmount:
                itemNet.toDecimalPlaces(2),

              applicableScheme:
                itemDTO.applicableScheme ||
                scheme.schemeName ||
                null,
            });
          }


                    // ---------------------------------------------------------------
          // STOCK VALIDATION
          // ---------------------------------------------------------------

          await this.validateSaleStock(
            tx,
            lineSale.id,
            preparedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              freeQuantity: item.freeQuantity,
            })),
            saleId
          );

          

          const headerDiscount =
            dto.discountAmount !== undefined
              ? new Prisma.Decimal(
                  this.positiveNumber(
                    dto.discountAmount,
                    'discountAmount'
                  ).toFixed(2)
                )
              : new Prisma.Decimal(0);

          totalDiscount =
            totalDiscount.add(
              headerDiscount
            );

          if (totalDiscount.gt(grossAmount)) {
            totalDiscount =
              grossAmount;
          }

          const finalTax =
            dto.taxAmount !== undefined
              ? new Prisma.Decimal(
                  this.positiveNumber(
                    dto.taxAmount,
                    'taxAmount'
                  ).toFixed(2)
                )
              : taxAmount;

          const netAmount =
            grossAmount
              .sub(totalDiscount)
              .add(finalTax);

          await tx.saleItem.deleteMany({
            where: {
              saleId,
            },
          });

          await tx.saleItem.createMany({
            data: preparedItems.map(
              (item) => ({
                saleId,

                productId:
                  item.productId,

                quantity:
                  item.quantity,

                freeQuantity:
                  item.freeQuantity,

                uom:
                  item.uom,

                rate:
                  item.rate,

                grossAmount:
                  item.grossAmount,

                discountAmount:
                  item.discountAmount,

                netAmount:
                  item.netAmount,

                applicableScheme:
                  item.applicableScheme,
              })
            ),
          });

          updateData.grossAmount =
            grossAmount.toDecimalPlaces(2);

          updateData.discountAmount =
            totalDiscount.toDecimalPlaces(2);

          updateData.taxAmount =
            finalTax.toDecimalPlaces(2);

          updateData.netAmount =
            netAmount.toDecimalPlaces(2);

          const paymentTotal =
            existing.payments.reduce(
              (
                total: Prisma.Decimal,
                payment: any
              ) =>
                total.add(
                  this.decimal(
                    payment.amount
                  )
                ),
              new Prisma.Decimal(0)
            );

          updateData.paymentStatus =
            this.calculatePaymentStatus(
              netAmount,
              paymentTotal
            );
        }

        const updated =
          await tx.sale.update({
            where: {
              id: saleId,
            },
            data: updateData,
            include: this.saleInclude(),
          });

        await tx.auditLog.create({
          data: {
            userId:
              user.userId,

            action:
              'SALE_UPDATED',

            entityType:
              'SALE',

            entityId:
              String(saleId),

            oldValues:
              JSON.stringify({
                grossAmount:
                  existing.grossAmount.toString(),
                discountAmount:
                  existing.discountAmount.toString(),
                taxAmount:
                  existing.taxAmount.toString(),
                netAmount:
                  existing.netAmount.toString(),
                status:
                  existing.status,
              }),

            newValues:
              JSON.stringify({
                grossAmount:
                  updated.grossAmount.toString(),
                discountAmount:
                  updated.discountAmount.toString(),
                taxAmount:
                  updated.taxAmount.toString(),
                netAmount:
                  updated.netAmount.toString(),
                status:
                  updated.status,
              }),

            ipAddress:
              ipAddress || null,

            userAgent:
              userAgent || null,
          },
        });

        return this.formatSale(updated);
      }
    );
  }

  // ---------------------------------------------------------------------------
  // PAYMENTS
  // ---------------------------------------------------------------------------

  async createPayment(
    saleIdValue: string | number,
    dto: CreatePaymentForSaleDTO,
    user: JWTPayload,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PaymentResponseDTO> {
    const saleId =
      this.parseId(
        saleIdValue,
        'saleId'
      );

    if (
      !dto.paymentMethod ||
      !dto.paymentMethod.trim()
    ) {
      throw new SaleServiceError(
        'Payment method is required.',
        400,
        'PAYMENT_METHOD_REQUIRED'
      );
    }

    const amount =
      this.positiveNumber(
        dto.amount,
        'Payment amount',
        false
      );

    return prisma.$transaction(
      async (tx) => {
        const sale =
          await tx.sale.findUnique({
            where: {
              id: saleId,
            },
            include: {
              payments: true,
            },
          });

        if (!sale) {
          throw new SaleServiceError(
            `Sale '${saleId}' was not found.`,
            404,
            'SALE_NOT_FOUND'
          );
        }

        if (
          user.roleCode === 'SALES_OFFICER' &&
          sale.salesOfficerId !== user.userId
        ) {
          throw new SaleServiceError(
            'You do not have access to this sale.',
            403,
            'SALE_ACCESS_DENIED'
          );
        }

        const currentPaid =
          sale.payments.reduce(
            (
              total: Prisma.Decimal,
              payment: any
            ) =>
              total.add(
                this.decimal(
                  payment.amount
                )
              ),
            new Prisma.Decimal(0)
          );

        const newPaid =
          currentPaid.add(
            new Prisma.Decimal(
              amount.toFixed(2)
            )
          );

        const netAmount =
          this.decimal(
            sale.netAmount
          );

        if (newPaid.gt(netAmount)) {
          throw new SaleServiceError(
            `Payment would exceed outstanding sale amount. Outstanding amount is ${netAmount.sub(currentPaid).toFixed(2)}.`,
            400,
            'PAYMENT_EXCEEDS_OUTSTANDING'
          );
        }

        let paymentReference =
          dto.paymentReference?.trim();

        if (!paymentReference) {
          paymentReference =
            this.generatePaymentReference();
        }

        const duplicate =
          await tx.payment.findUnique({
            where: {
              paymentReference,
            },
          });

        if (duplicate) {
          throw new SaleServiceError(
            `Payment reference '${paymentReference}' already exists.`,
            409,
            'DUPLICATE_PAYMENT_REFERENCE'
          );
        }

        const paymentDate =
          this.parseDate(
            dto.paymentDate,
            'paymentDate'
          ) || new Date();

        const payment =
          await tx.payment.create({
            data: {
              saleId,

              paymentReference,

              paymentMethod:
                dto.paymentMethod
                  .trim()
                  .toUpperCase(),

              amount:
                new Prisma.Decimal(
                  amount.toFixed(2)
                ),

              upiReference:
                dto.upiReference?.trim() ||
                null,

              status:
                dto.status?.trim() ||
                'COMPLETED',

              paymentDate,
            },
          });

        const paymentStatus =
          this.calculatePaymentStatus(
            netAmount,
            newPaid
          );

        await tx.sale.update({
          where: {
            id: saleId,
          },
          data: {
            paymentStatus,
          },
        });

        await tx.auditLog.create({
          data: {
            userId:
              user.userId,

            action:
              'PAYMENT_CREATED',

            entityType:
              'PAYMENT',

            entityId:
              String(payment.id),

            newValues:
              JSON.stringify({
                saleId,
                paymentReference,
                paymentMethod:
                  payment.paymentMethod,
                amount:
                  amount.toFixed(2),
                paymentStatus,
              }),

            ipAddress:
              ipAddress || null,

            userAgent:
              userAgent || null,
          },
        });

        return this.formatPayment(
          payment
        );
      }
    );
  }

  async updatePayment(
    paymentIdValue: string | number,
    dto: UpdatePaymentDTO,
    user: JWTPayload,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PaymentResponseDTO> {
    const paymentId =
      this.parseId(
        paymentIdValue,
        'paymentId'
      );

    return prisma.$transaction(
      async (tx) => {
        const existing =
          await tx.payment.findUnique({
            where: {
              id: paymentId,
            },
            include: {
              sale: true,
            },
          });

        if (!existing) {
          throw new SaleServiceError(
            `Payment '${paymentId}' was not found.`,
            404,
            'PAYMENT_NOT_FOUND'
          );
        }

        if (
          user.roleCode === 'SALES_OFFICER' &&
          existing.sale.salesOfficerId !== user.userId
        ) {
          throw new SaleServiceError(
            'You do not have access to this payment.',
            403,
            'PAYMENT_ACCESS_DENIED'
          );
        }

        const data: Prisma.PaymentUpdateInput =
          {};

        if (
          dto.paymentMethod !== undefined
        ) {
          if (
            !dto.paymentMethod.trim()
          ) {
            throw new SaleServiceError(
              'Payment method cannot be empty.',
              400,
              'PAYMENT_METHOD_REQUIRED'
            );
          }

          data.paymentMethod =
            dto.paymentMethod
              .trim()
              .toUpperCase();
        }

        if (
          dto.upiReference !== undefined
        ) {
          data.upiReference =
            dto.upiReference?.trim() ||
            null;
        }

        if (
          dto.status !== undefined
        ) {
          data.status =
            dto.status
              .trim()
              .toUpperCase();
        }

        if (
          dto.paymentDate !== undefined
        ) {
          const paymentDate =
            this.parseDate(
              dto.paymentDate,
              'paymentDate'
            );

          if (paymentDate) {
            data.paymentDate =
              paymentDate;
          }
        }

        if (
          dto.amount !== undefined
        ) {
          const amount =
            this.positiveNumber(
              dto.amount,
              'Payment amount',
              false
            );

          const otherPayments =
            await tx.payment.findMany({
              where: {
                saleId:
                  existing.saleId,
                id: {
                  not: paymentId,
                },
              },
            });

          const otherPaid =
            otherPayments.reduce(
              (
                total: Prisma.Decimal,
                payment: any
              ) =>
                total.add(
                  this.decimal(
                    payment.amount
                  )
                ),
              new Prisma.Decimal(0)
            );

          const newTotal =
            otherPaid.add(
              new Prisma.Decimal(
                amount.toFixed(2)
              )
            );

          if (
            newTotal.gt(
              this.decimal(
                existing.sale.netAmount
              )
            )
          ) {
            throw new SaleServiceError(
              'Updated payment amount would exceed the sale net amount.',
              400,
              'PAYMENT_EXCEEDS_SALE'
            );
          }

          data.amount =
            new Prisma.Decimal(
              amount.toFixed(2)
            );
        }

        const updated =
          await tx.payment.update({
            where: {
              id: paymentId,
            },
            data,
          });

        const payments =
          await tx.payment.findMany({
            where: {
              saleId:
                existing.saleId,
            },
          });

        const paid =
          payments.reduce(
            (
              total: Prisma.Decimal,
              payment: any
            ) =>
              total.add(
                this.decimal(
                  payment.amount
                )
              ),
            new Prisma.Decimal(0)
          );

        const paymentStatus =
          this.calculatePaymentStatus(
            this.decimal(
              existing.sale.netAmount
            ),
            paid
          );

        await tx.sale.update({
          where: {
            id: existing.saleId,
          },
          data: {
            paymentStatus,
          },
        });

        await tx.auditLog.create({
          data: {
            userId:
              user.userId,

            action:
              'PAYMENT_UPDATED',

            entityType:
              'PAYMENT',

            entityId:
              String(paymentId),

            oldValues:
              JSON.stringify({
                amount:
                  existing.amount.toString(),
                paymentMethod:
                  existing.paymentMethod,
                status:
                  existing.status,
              }),

            newValues:
              JSON.stringify({
                amount:
                  updated.amount.toString(),
                paymentMethod:
                  updated.paymentMethod,
                status:
                  updated.status,
                paymentStatus,
              }),

            ipAddress:
              ipAddress || null,

            userAgent:
              userAgent || null,
          },
        });

        return this.formatPayment(
          updated
        );
      }
    );
  }

  async getPayments(
    filters: {
      search?: string;
      saleId?: number | string;
      paymentMethod?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {},
    user?: JWTPayload
  ): Promise<PaymentResponseDTO[]> {
    const where: Prisma.PaymentWhereInput =
      {};

    if (
      filters.saleId !== undefined
    ) {
      where.saleId =
        this.parseId(
          filters.saleId,
          'saleId'
        );
    }

    if (
      filters.paymentMethod?.trim()
    ) {
      where.paymentMethod =
        filters.paymentMethod
          .trim()
          .toUpperCase();
    }

    if (filters.status?.trim()) {
      where.status =
        filters.status
          .trim()
          .toUpperCase();
    }

    if (
      filters.startDate ||
      filters.endDate
    ) {
      const dateFilter: Prisma.DateTimeFilter =
        {};

      if (filters.startDate) {
        const date =
          this.parseDate(
            filters.startDate,
            'startDate'
          );

        if (date) {
          dateFilter.gte =
            date;
        }
      }

      if (filters.endDate) {
        const date =
          this.parseDate(
            filters.endDate,
            'endDate'
          );

        if (date) {
          date.setHours(
            23,
            59,
            59,
            999
          );

          dateFilter.lte =
            date;
        }
      }

      where.paymentDate =
        dateFilter;
    }

    if (filters.search?.trim()) {
      const term =
        filters.search.trim();

      where.OR = [
        {
          paymentReference: {
            contains: term,
          },
        },
        {
          upiReference: {
            contains: term,
          },
        },
      ];
    }

    if (
      user &&
      user.roleCode === 'SALES_OFFICER'
    ) {
      where.sale = {
        salesOfficerId:
          user.userId,
      };
    }

    const payments =
      await prisma.payment.findMany({
        where,
        orderBy: {
          paymentDate: 'desc',
        },
      });

    return payments.map(
      (payment) =>
        this.formatPayment(payment)
    );
  }

  // ---------------------------------------------------------------------------
  // SALES SUMMARY
  // ---------------------------------------------------------------------------

  async getSalesSummary(
    filters: SaleFilterQuery = {},
    user?: JWTPayload
  ): Promise<SaleSummaryDTO> {
    const where: Prisma.SaleWhereInput =
      {};

    if (
      filters.lineSaleId !== undefined
    ) {
      where.lineSaleId =
        this.parseId(
          filters.lineSaleId,
          'lineSaleId'
        );
    }

    if (
      filters.salesOfficerId !== undefined
    ) {
      where.salesOfficerId =
        this.parseId(
          filters.salesOfficerId,
          'salesOfficerId'
        );
    }

    if (
      user &&
      user.roleCode === 'SALES_OFFICER'
    ) {
      where.salesOfficerId =
        user.userId;
    }

    if (filters.status?.trim()) {
      where.status =
        filters.status
          .trim()
          .toUpperCase();
    }

    if (
      filters.paymentStatus?.trim()
    ) {
      where.paymentStatus =
        filters.paymentStatus
          .trim()
          .toUpperCase();
    }

    if (
      filters.startDate ||
      filters.endDate
    ) {
      const dateFilter: Prisma.DateTimeFilter =
        {};

      if (filters.startDate) {
        const start =
          this.parseDate(
            filters.startDate,
            'startDate'
          );

        if (start) {
          dateFilter.gte =
            start;
        }
      }

      if (filters.endDate) {
        const end =
          this.parseDate(
            filters.endDate,
            'endDate'
          );

        if (end) {
          end.setHours(
            23,
            59,
            59,
            999
          );

          dateFilter.lte =
            end;
        }
      }

      where.saleDate =
        dateFilter;
    }

    const sales =
      await prisma.sale.findMany({
        where,
        include: {
          payments: true,
        },
      });

    let grossAmount =
      new Prisma.Decimal(0);

    let discountAmount =
      new Prisma.Decimal(0);

    let taxAmount =
      new Prisma.Decimal(0);

    let netAmount =
      new Prisma.Decimal(0);

    let cashAmount =
      new Prisma.Decimal(0);

    let upiAmount =
      new Prisma.Decimal(0);

    for (const sale of sales) {
      grossAmount =
        grossAmount.add(
          this.decimal(
            sale.grossAmount
          )
        );

      discountAmount =
        discountAmount.add(
          this.decimal(
            sale.discountAmount
          )
        );

      taxAmount =
        taxAmount.add(
          this.decimal(
            sale.taxAmount
          )
        );

      netAmount =
        netAmount.add(
          this.decimal(
            sale.netAmount
          )
        );

      for (
        const payment of sale.payments
      ) {
        const amount =
          this.decimal(
            payment.amount
          );

        const method =
          payment.paymentMethod
            .toUpperCase();

        if (method === 'CASH') {
          cashAmount =
            cashAmount.add(amount);
        }

        if (
          method === 'UPI' ||
          method === 'UPI_QR'
        ) {
          upiAmount =
            upiAmount.add(amount);
        }
      }
    }

    const paidAmount =
      cashAmount.add(
        upiAmount
      );

    const pendingAmount =
      Prisma.Decimal.max(
        netAmount.sub(
          paidAmount
        ),
        new Prisma.Decimal(0)
      );

    return {
      totalSales:
        sales.length,

      grossAmount:
        this.decimalNumber(
          grossAmount
        ),

      discountAmount:
        this.decimalNumber(
          discountAmount
        ),

      taxAmount:
        this.decimalNumber(
          taxAmount
        ),

      netAmount:
        this.decimalNumber(
          netAmount
        ),

      cashAmount:
        this.decimalNumber(
          cashAmount
        ),

      upiAmount:
        this.decimalNumber(
          upiAmount
        ),

      pendingAmount:
        this.decimalNumber(
          pendingAmount
        ),
    };
  }
}

export const saleService =
  new SaleService();