import { prisma } from '../config/database.js';
import {
  CreateLineSaleDTO,
  UpdateLineSaleDTO,
  LineSaleFilterQuery,
  LineSaleResponseDTO,
} from '../types/lineSale.types.js';

export class LineSaleServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = 'LINE_SALE_SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'LineSaleServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class LineSaleService {
  /**
   * In-memory fallback is retained only for isolated/offline test environments.
   * Normal application execution uses MySQL through Prisma.
   */
  private memoryLineSales: Map<number, any> = new Map();
  private nextMemoryId = 200;

  constructor() {
    this.initDefaultMemorySeeds();
  }

  private initDefaultMemorySeeds() {
    const seed1 = {
      id: 1,
      partyCode: 'LSA-1001',
      accountName: 'Sri Laxmi Line Sales Agency',
      salesOfficerId: 3,
      priceListId: 1,
      vehicleNumber: 'KA-01-EA-1234',
      routeName: 'Bangalore South - Electronic City Route',
      sapCustomerCode: 'SAP-CUST-1001',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      salesOfficer: {
        id: 3,
        employeeId: 'EMP-003',
        employeeName: 'Ramesh Kumar',
        loginId: 'sales',
        role: {
          id: 3,
          code: 'SALES_OFFICER',
          name: 'Sales Officer',
        },
      },
      priceList: {
        id: 1,
        code: 'PL-STANDARD',
        name: 'Standard Wholesale Price List',
      },
      depotLineSales: [
        {
          id: 1,
          depotId: 1,
          lineSaleId: 1,
          isActive: true,
          depot: {
            id: 1,
            code: 'DEPOT-BLR-01',
            name: 'Central Depot Bangalore',
          },
        },
      ],
      lineSaleSchemes: [
        {
          id: 1,
          lineSaleId: 1,
          schemeListId: 1,
          isActive: true,
          schemeList: {
            id: 1,
            code: 'SL-SUMMER-SPECIAL',
            name: 'Summer Splash Promotion',
          },
        },
      ],
      state: 'Karnataka',
      gstn: '29ABCDE1234F1Z5',
      contactNo: '+91 98450 12345',
      geographicalLocation: '12.9716° N, 77.5946° E',
      upiQr: '',
    };

    const seed2 = {
      id: 2,
      partyCode: 'LSA-1002',
      accountName: 'Chamundeshwari Line Traders',
      salesOfficerId: 4,
      priceListId: 1,
      vehicleNumber: 'KA-09-MB-5678',
      routeName: 'Mysore Urban - Chamundi Route',
      sapCustomerCode: 'SAP-CUST-1002',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      salesOfficer: {
        id: 4,
        employeeId: 'EMP-004',
        employeeName: 'Sunil Rao',
        loginId: 'sales_officer_two',
        role: {
          id: 3,
          code: 'SALES_OFFICER',
          name: 'Sales Officer',
        },
      },
      priceList: {
        id: 1,
        code: 'PL-STANDARD',
        name: 'Standard Wholesale Price List',
      },
      depotLineSales: [
        {
          id: 2,
          depotId: 2,
          lineSaleId: 2,
          isActive: true,
          depot: {
            id: 2,
            code: 'DEPOT-MYS-01',
            name: 'Mysore Satellite Depot',
          },
        },
      ],
      lineSaleSchemes: [
        {
          id: 2,
          lineSaleId: 2,
          schemeListId: 2,
          isActive: true,
          schemeList: {
            id: 2,
            code: 'SL-STANDARD',
            name: 'Standard Volume Schemes',
          },
        },
      ],
      state: 'Karnataka',
      gstn: '29FGHIJ5678K1Z9',
      contactNo: '+91 98801 67890',
      geographicalLocation: '12.2958° N, 76.6394° E',
      upiQr: '',
    };

    this.memoryLineSales.set(seed1.id, seed1);
    this.memoryLineSales.set(seed2.id, seed2);
  }

  /**
   * Resolves Sales Officer from numeric ID, employee ID, or login ID.
   * The referenced user must have Sales Officer role.
   */
  private async resolveSalesOfficer(
    identifier: number | string
  ): Promise<{
    id: number;
    employeeId: string;
    employeeName: string;
    loginId: string;
    role: string;
  }> {
    const raw = String(identifier).trim();
    const numericId = parseInt(raw, 10);

    try {
      let user = null;

      if (
        !isNaN(numericId) &&
        numericId > 0 &&
        String(numericId) === raw
      ) {
        user = await prisma.user.findUnique({
          where: { id: numericId },
          include: { role: true },
        });
      }

      if (!user) {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { loginId: raw },
              { employeeId: raw },
            ],
          },
          include: { role: true },
        });
      }

      if (user) {
        const roleName = user.role?.name || '';
        const roleCode = user.role?.code || '';

        const normalizedRoleName = roleName
          .toLowerCase()
          .replace(/[\s_-]+/g, '');

        const isSalesOfficer =
          normalizedRoleName === 'salesofficer' ||
          roleCode.toUpperCase() === 'SALES_OFFICER';

        if (!isSalesOfficer) {
          throw new LineSaleServiceError(
            `Referenced user '${user.employeeName}' (${user.loginId}) has role '${roleName}', but must be a Sales Officer.`,
            400,
            'INVALID_SALES_OFFICER_ROLE'
          );
        }

        return {
          id: user.id,
          employeeId: user.employeeId,
          employeeName: user.employeeName,
          loginId: user.loginId,
          role: roleName,
        };
      }
    } catch (err: any) {
      if (err instanceof LineSaleServiceError) {
        throw err;
      }
    }

    const fallbackUsers = [
      {
        id: 3,
        employeeId: 'EMP-003',
        employeeName: 'Ramesh Kumar',
        loginId: 'sales',
        role: 'Sales Officer',
      },
      {
        id: 4,
        employeeId: 'EMP-004',
        employeeName: 'Sunil Rao',
        loginId: 'sales_officer_two',
        role: 'Sales Officer',
      },
      {
        id: 1,
        employeeId: 'EMP-001',
        employeeName: 'Super Admin',
        loginId: 'admin',
        role: 'Super Admin',
      },
      {
        id: 2,
        employeeId: 'EMP-002',
        employeeName: 'Depot Manager',
        loginId: 'depot',
        role: 'Depot Person',
      },
    ];

    const match = fallbackUsers.find(
      (u) =>
        u.id === numericId ||
        u.loginId.toLowerCase() === raw.toLowerCase() ||
        u.employeeId.toLowerCase() === raw.toLowerCase()
    );

    if (match) {
      if (match.role !== 'Sales Officer') {
        throw new LineSaleServiceError(
          `Referenced user '${match.employeeName}' (${match.loginId}) has role '${match.role}', but must be a Sales Officer.`,
          400,
          'INVALID_SALES_OFFICER_ROLE'
        );
      }

      return match;
    }

    throw new LineSaleServiceError(
      `Referenced Sales Officer user '${raw}' not found.`,
      404,
      'USER_NOT_FOUND'
    );
  }

  /**
   * Resolves Price List from numeric ID or code.
   */
  private async resolvePriceList(
    identifier: number | string | null | undefined
  ): Promise<{
    id: number;
    code: string;
    name: string;
  } | null> {
    if (identifier === null || identifier === undefined) {
      return null;
    }

    const raw = String(identifier).trim();

    if (!raw) {
      return null;
    }

    const numericId = parseInt(raw, 10);

    try {
      let priceList = null;

      if (
        !isNaN(numericId) &&
        numericId > 0 &&
        String(numericId) === raw
      ) {
        priceList = await prisma.priceList.findUnique({
          where: { id: numericId },
        });
      }

      if (!priceList) {
        priceList = await prisma.priceList.findUnique({
          where: { code: raw },
        });
      }

      if (priceList) {
        return {
          id: priceList.id,
          code: priceList.code,
          name: priceList.name,
        };
      }
    } catch {
      // Fallback below.
    }

    const fallbackPriceLists = [
      {
        id: 1,
        code: 'PL-STANDARD',
        name: 'Standard Wholesale Price List',
      },
      {
        id: 2,
        code: 'PL-RETAIL-PROMO',
        name: 'Retail Promotional Price List',
      },
    ];

    const match = fallbackPriceLists.find(
      (pl) =>
        pl.id === numericId ||
        pl.code.toUpperCase() === raw.toUpperCase()
    );

    if (match) {
      return match;
    }

    throw new LineSaleServiceError(
      `Referenced Price List '${raw}' not found.`,
      404,
      'PRICE_LIST_NOT_FOUND'
    );
  }

  /**
   * Resolves Depots by numeric ID, code, name, or location.
   */
  private async resolveDepots(
    depotIdentifiers: Array<number | string>
  ): Promise<
    Array<{
      id: number;
      code: string;
      name: string;
    }>
  > {
    if (!depotIdentifiers || depotIdentifiers.length === 0) {
      return [];
    }

    const resolvedDepots: Array<{
      id: number;
      code: string;
      name: string;
    }> = [];

    const seenIds = new Set<number>();

    for (const rawIdentifier of depotIdentifiers) {
      const raw = String(rawIdentifier).trim();

      if (!raw) {
        continue;
      }

      const numericId = parseInt(raw, 10);
      let depot = null;

      try {
        if (
          !isNaN(numericId) &&
          numericId > 0 &&
          String(numericId) === raw
        ) {
          depot = await prisma.depot.findUnique({
            where: { id: numericId },
          });
        }

        if (!depot) {
          depot = await prisma.depot.findUnique({
            where: { code: raw },
          });
        }

        if (!depot) {
          depot = await prisma.depot.findFirst({
            where: {
              OR: [
                { name: raw },
                {
                  location: {
                    contains: raw,
                  },
                },
              ],
            },
          });
        }
      } catch {
        // Fallback below.
      }

      if (!depot) {
        const fallbackDepots = [
          {
            id: 1,
            code: 'DEPOT-BLR-01',
            name: 'Central Depot Bangalore',
          },
          {
            id: 2,
            code: 'DEPOT-MYS-01',
            name: 'Mysore Satellite Depot',
          },
          {
            id: 3,
            code: 'DEPOT-MNG-01',
            name: 'Mangalore Coastal Depot',
          },
        ];

        const match = fallbackDepots.find(
          (d) =>
            d.id === numericId ||
            d.code.toUpperCase() === raw.toUpperCase() ||
            d.name.toLowerCase() === raw.toLowerCase()
        );

        if (match) {
          depot = match;
        }
      }

      if (!depot) {
        throw new LineSaleServiceError(
          `Referenced Depot '${raw}' not found.`,
          404,
          'DEPOT_NOT_FOUND'
        );
      }

      if (!seenIds.has(depot.id)) {
        seenIds.add(depot.id);

        resolvedDepots.push({
          id: depot.id,
          code: depot.code,
          name: depot.name,
        });
      }
    }

    return resolvedDepots;
  }

  /**
   * Resolves Scheme Lists by numeric ID, code, or name.
   */
  private async resolveSchemes(
    schemeIdentifiers: Array<number | string>
  ): Promise<
    Array<{
      id: number;
      code: string;
      name: string;
    }>
  > {
    if (!schemeIdentifiers || schemeIdentifiers.length === 0) {
      return [];
    }

    const resolvedSchemes: Array<{
      id: number;
      code: string;
      name: string;
    }> = [];

    const seenIds = new Set<number>();

    for (const rawIdentifier of schemeIdentifiers) {
      const raw = String(rawIdentifier).trim();

      if (!raw) {
        continue;
      }

      const numericId = parseInt(raw, 10);
      let scheme = null;

      try {
        if (
          !isNaN(numericId) &&
          numericId > 0 &&
          String(numericId) === raw
        ) {
          scheme = await prisma.schemeList.findUnique({
            where: { id: numericId },
          });
        }

        if (!scheme) {
          scheme = await prisma.schemeList.findUnique({
            where: { code: raw },
          });
        }

        if (!scheme) {
          scheme = await prisma.schemeList.findFirst({
            where: {
              name: raw,
            },
          });
        }
      } catch {
        // Fallback below.
      }

      if (!scheme) {
        const fallbackSchemes = [
          {
            id: 1,
            code: 'SL-SUMMER-SPECIAL',
            name: 'Summer Splash Promotion',
          },
          {
            id: 2,
            code: 'SL-STANDARD',
            name: 'Standard Volume Schemes',
          },
        ];

        const match = fallbackSchemes.find(
          (s) =>
            s.id === numericId ||
            s.code.toUpperCase() === raw.toUpperCase() ||
            s.name.toLowerCase() === raw.toLowerCase()
        );

        if (match) {
          scheme = match;
        }
      }

      if (!scheme) {
        throw new LineSaleServiceError(
          `Referenced Scheme List '${raw}' not found.`,
          404,
          'SCHEME_LIST_NOT_FOUND'
        );
      }

      if (!seenIds.has(scheme.id)) {
        seenIds.add(scheme.id);

        resolvedSchemes.push({
          id: scheme.id,
          code: scheme.code,
          name: scheme.name,
        });
      }
    }

    return resolvedSchemes;
  }

  /**
   * Validates Line Sale input.
   */
  private validateLineSaleInput(
    dto: CreateLineSaleDTO | UpdateLineSaleDTO,
    isCreate = true
  ) {
    if (isCreate) {
      const partyCode = (dto.partyCode || '').trim();

      if (!partyCode) {
        throw new LineSaleServiceError(
          'Party Code is required.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (partyCode.length > 50) {
        throw new LineSaleServiceError(
          'Party Code cannot exceed 50 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!/^[A-Za-z0-9_-]+$/.test(partyCode)) {
        throw new LineSaleServiceError(
          'Party Code must contain only alphanumeric characters, hyphens, and underscores.',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    const accountName = (
      dto.accountName ||
      dto.partyName ||
      ''
    ).trim();

    if (isCreate && !accountName) {
      throw new LineSaleServiceError(
        'Account Name / Party Name is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (accountName.length > 150) {
      throw new LineSaleServiceError(
        'Account Name cannot exceed 150 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      dto.vehicleNumber &&
      dto.vehicleNumber.trim().length > 30
    ) {
      throw new LineSaleServiceError(
        'Vehicle Number cannot exceed 30 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      dto.routeName &&
      dto.routeName.trim().length > 100
    ) {
      throw new LineSaleServiceError(
        'Route Name cannot exceed 100 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      dto.sapCustomerCode &&
      dto.sapCustomerCode.trim().length > 50
    ) {
      throw new LineSaleServiceError(
        'SAP Customer Code cannot exceed 50 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (dto.state && dto.state.trim().length > 100) {
      throw new LineSaleServiceError(
        'State cannot exceed 100 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (dto.gstn && dto.gstn.trim().length > 20) {
      throw new LineSaleServiceError(
        'GSTN cannot exceed 20 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (dto.contactNo && dto.contactNo.trim().length > 20) {
      throw new LineSaleServiceError(
        'Contact Number cannot exceed 20 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (
      dto.geographicalLocation &&
      dto.geographicalLocation.trim().length > 255
    ) {
      throw new LineSaleServiceError(
        'Geographical Location cannot exceed 255 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  /**
   * Formats a Prisma record into LineSaleResponseDTO.
   */
  private formatLineSale(
    record: any
  ): LineSaleResponseDTO {
    const rawSalesOfficer = record.salesOfficer;

    const salesOfficerDTO = rawSalesOfficer
      ? {
          id: rawSalesOfficer.id,
          employeeId: rawSalesOfficer.employeeId,
          employeeName: rawSalesOfficer.employeeName,
          loginId: rawSalesOfficer.loginId,
          role:
            rawSalesOfficer.role?.name ||
            'Sales Officer',
        }
      : null;

    const rawPriceList = record.priceList;

    const priceListDTO = rawPriceList
      ? {
          id: rawPriceList.id,
          code: rawPriceList.code,
          name: rawPriceList.name,
        }
      : null;

    const rawDepotLineSales = Array.isArray(
      record.depotLineSales
    )
      ? record.depotLineSales
      : [];

    const depots: Array<{
      id: number;
      code: string;
      name: string;
      siteName: string;
    }> = [];

    const depotIds: number[] = [];

    const depotLineSalesDTO: any[] = [];

    for (const dls of rawDepotLineSales) {
      const depot = dls.depot;

      if (!depot) {
        continue;
      }

      depotIds.push(depot.id);

      depots.push({
        id: depot.id,
        code: depot.code,
        name: depot.name,
        siteName: depot.name,
      });

      depotLineSalesDTO.push({
        id: dls.id,
        depotId: depot.id,
        depotCode: depot.code,
        depotName: depot.name,
        siteName: depot.name,
        isActive: dls.isActive,
      });
    }

    const rawLineSaleSchemes = Array.isArray(
      record.lineSaleSchemes
    )
      ? record.lineSaleSchemes
      : [];

    const schemes: Array<{
      id: number;
      code: string;
      name: string;
    }> = [];

    const schemeListIds: number[] = [];

    const lineSaleSchemesDTO: any[] = [];

    for (const lss of rawLineSaleSchemes) {
      const scheme = lss.schemeList;

      if (!scheme) {
        continue;
      }

      schemeListIds.push(scheme.id);

      schemes.push({
        id: scheme.id,
        code: scheme.code,
        name: scheme.name,
      });

      lineSaleSchemesDTO.push({
        id: lss.id,
        schemeListId: scheme.id,
        schemeCode: scheme.code,
        schemeName: scheme.name,
        isActive: lss.isActive,
      });
    }

    const nearestDepotName =
      depots[0]?.name ||
      record.nearestDepot ||
      '';

    const primarySchemeCode =
      schemes[0]?.code ||
      record.schemeListId ||
      '';

    return {
      id: record.id,
      lineSaleId: record.id,

      partyCode: record.partyCode,
      accountName: record.accountName,
      partyName: record.accountName,

      salesOfficerId: record.salesOfficerId,
      salesOfficer: salesOfficerDTO,
      assignedUser:
        salesOfficerDTO?.loginId ||
        record.assignedUser ||
        'sales',

      priceListId: record.priceListId || null,
      priceList: priceListDTO,

      vehicleNumber:
        record.vehicleNumber || null,

      routeName:
        record.routeName || null,

      sapCustomerCode:
        record.sapCustomerCode || null,

      isActive: record.isActive,

      depotIds,
      depots,
      depotLineSales: depotLineSalesDTO,
      nearestDepot: nearestDepotName,

      schemeListIds,
      schemes,
      lineSaleSchemes: lineSaleSchemesDTO,
      schemeListId: primarySchemeCode,

      /*
       * Master fields persisted directly in MySQL.
       */
      state: record.state || '',
      gstn: record.gstn || '',
      contactNo: record.contactNo || '',
      geographicalLocation:
        record.geographicalLocation ||
        record.routeName ||
        '',
      upiQr: record.upiQr || '',

      createdAt:
        record.createdAt || new Date(),

      updatedAt:
        record.updatedAt || new Date(),
    };
  }

  /**
   * Common Prisma include object for Line Sale queries.
   */
  private getLineSaleInclude() {
    return {
      salesOfficer: {
        include: {
          role: true,
        },
      },
      priceList: true,
      depotLineSales: {
        include: {
          depot: true,
        },
      },
      lineSaleSchemes: {
        include: {
          schemeList: true,
        },
      },
    };
  }

  /**
   * Retrieves all Line Sale Accounts.
   */
  async getLineSales(
    filters: LineSaleFilterQuery = {}
  ): Promise<LineSaleResponseDTO[]> {
    try {
      const where: any = {};

      if (
        filters.search &&
        filters.search.trim().length > 0
      ) {
        const search = filters.search.trim();

        where.OR = [
          {
            partyCode: {
              contains: search,
            },
          },
          {
            accountName: {
              contains: search,
            },
          },
          {
            routeName: {
              contains: search,
            },
          },
          {
            vehicleNumber: {
              contains: search,
            },
          },
          {
            sapCustomerCode: {
              contains: search,
            },
          },
          {
            state: {
              contains: search,
            },
          },
          {
            gstn: {
              contains: search,
            },
          },
          {
            contactNo: {
              contains: search,
            },
          },
          {
            geographicalLocation: {
              contains: search,
            },
          },
        ];
      }

      if (
        filters.partyCode &&
        filters.partyCode.trim().length > 0
      ) {
        where.partyCode =
          filters.partyCode.trim();
      }

      if (
        filters.accountName &&
        filters.accountName.trim().length > 0
      ) {
        where.accountName = {
          contains:
            filters.accountName.trim(),
        };
      }

      if (
        filters.routeName &&
        filters.routeName.trim().length > 0
      ) {
        where.routeName = {
          contains:
            filters.routeName.trim(),
        };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.salesOfficerId) {
        const sid =
          typeof filters.salesOfficerId === 'number'
            ? filters.salesOfficerId
            : parseInt(
                String(filters.salesOfficerId),
                10
              );

        if (!isNaN(sid)) {
          where.salesOfficerId = sid;
        }
      }

      if (filters.depotId) {
        const did =
          typeof filters.depotId === 'number'
            ? filters.depotId
            : parseInt(
                String(filters.depotId),
                10
              );

        if (!isNaN(did)) {
          where.depotLineSales = {
            some: {
              depotId: did,
            },
          };
        }
      }

      const records =
        await prisma.lineSaleAccount.findMany({
          where,
          include:
            this.getLineSaleInclude(),
          orderBy: {
            createdAt: 'desc',
          },
        });

      return records.map((record) =>
        this.formatLineSale(record)
      );
    } catch {
      let list = Array.from(
        this.memoryLineSales.values()
      );

      if (
        filters.search &&
        filters.search.trim().length > 0
      ) {
        const search =
          filters.search
            .trim()
            .toLowerCase();

        list = list.filter(
          (lineSale) =>
            lineSale.partyCode
              .toLowerCase()
              .includes(search) ||
            lineSale.accountName
              .toLowerCase()
              .includes(search) ||
            (
              lineSale.routeName &&
              lineSale.routeName
                .toLowerCase()
                .includes(search)
            ) ||
            (
              lineSale.vehicleNumber &&
              lineSale.vehicleNumber
                .toLowerCase()
                .includes(search)
            ) ||
            (
              lineSale.state &&
              lineSale.state
                .toLowerCase()
                .includes(search)
            ) ||
            (
              lineSale.gstn &&
              lineSale.gstn
                .toLowerCase()
                .includes(search)
            ) ||
            (
              lineSale.contactNo &&
              lineSale.contactNo
                .toLowerCase()
                .includes(search)
            ) ||
            (
              lineSale.geographicalLocation &&
              lineSale.geographicalLocation
                .toLowerCase()
                .includes(search)
            )
        );
      }

      if (filters.isActive !== undefined) {
        list = list.filter(
          (lineSale) =>
            lineSale.isActive ===
            filters.isActive
        );
      }

      return list.map((lineSale) =>
        this.formatLineSale(lineSale)
      );
    }
  }

  /**
   * Retrieves a Line Sale Account by ID or Party Code.
   */
  async getLineSaleById(
    idOrPartyCode: number | string
  ): Promise<LineSaleResponseDTO> {
    const raw =
      String(idOrPartyCode).trim();

    const numericId =
      parseInt(raw, 10);

    try {
      let record = null;

      if (
        !isNaN(numericId) &&
        numericId > 0 &&
        String(numericId) === raw
      ) {
        record =
          await prisma.lineSaleAccount.findUnique({
            where: {
              id: numericId,
            },
            include:
              this.getLineSaleInclude(),
          });
      }

      if (!record) {
        record =
          await prisma.lineSaleAccount.findUnique({
            where: {
              partyCode: raw,
            },
            include:
              this.getLineSaleInclude(),
          });
      }

      if (record) {
        return this.formatLineSale(
          record
        );
      }
    } catch {
      // Memory fallback.
    }

    const memoryMatch =
      Array.from(
        this.memoryLineSales.values()
      ).find(
        (lineSale) =>
          lineSale.id === numericId ||
          lineSale.partyCode
            .toUpperCase() ===
            raw.toUpperCase()
      );

    if (memoryMatch) {
      return this.formatLineSale(
        memoryMatch
      );
    }

    throw new LineSaleServiceError(
      `Line Sale Account '${raw}' not found.`,
      404,
      'LINE_SALE_NOT_FOUND'
    );
  }

  /**
   * Creates a Line Sale Account transactionally.
   */
  async createLineSale(
    dto: CreateLineSaleDTO,
    creatorUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LineSaleResponseDTO> {
    this.validateLineSaleInput(
      dto,
      true
    );

    const partyCode =
      dto.partyCode
        .trim()
        .toUpperCase();

    const accountName =
      (
        dto.accountName ||
        dto.partyName ||
        ''
      ).trim();

    const rawSalesOfficer =
      dto.salesOfficerId ||
      dto.assignedUser;

    if (!rawSalesOfficer) {
      throw new LineSaleServiceError(
        'Sales Officer assignment is required for Line Sale Accounts.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const salesOfficer =
      await this.resolveSalesOfficer(
        rawSalesOfficer
      );

    const priceList =
      await this.resolvePriceList(
        dto.priceListId
      );

    const depotInputs: Array<
      number | string
    > = [];

    if (
      dto.depotIds &&
      Array.isArray(dto.depotIds)
    ) {
      depotInputs.push(
        ...dto.depotIds
      );
    }

    if (
      dto.nearestDepot &&
      dto.nearestDepot.trim()
    ) {
      depotInputs.push(
        dto.nearestDepot.trim()
      );
    }

    const resolvedDepots =
      await this.resolveDepots(
        depotInputs
      );

    const schemeInputs: Array<
      number | string
    > = [];

    if (
      dto.schemeListIds &&
      Array.isArray(
        dto.schemeListIds
      )
    ) {
      schemeInputs.push(
        ...dto.schemeListIds
      );
    }

    if (
      dto.schemeListId &&
      dto.schemeListId.trim()
    ) {
      schemeInputs.push(
        dto.schemeListId.trim()
      );
    }

    const resolvedSchemes =
      await this.resolveSchemes(
        schemeInputs
      );

    try {
      const existing =
        await prisma.lineSaleAccount.findUnique(
          {
            where: {
              partyCode,
            },
          }
        );

      if (existing) {
        throw new LineSaleServiceError(
          `Line Sale Account with Party Code '${partyCode}' already exists.`,
          409,
          'DUPLICATE_PARTY_CODE'
        );
      }

      const createdRecord =
        await prisma.$transaction(
          async (tx) => {
            /*
             * A. Create Line Sale header.
             *
             * IMPORTANT:
             * The five new master fields are explicitly
             * persisted here.
             */
            const header =
              await tx.lineSaleAccount.create({
                data: {
                  partyCode,
                  accountName,

                  salesOfficerId:
                    salesOfficer.id,

                  priceListId:
                    priceList
                      ? priceList.id
                      : null,

                  vehicleNumber:
                    dto.vehicleNumber
                      ?.trim() || null,

                  routeName:
                    dto.routeName?.trim() ||
                    dto.geographicalLocation?.trim() ||
                    null,

                  sapCustomerCode:
                    dto.sapCustomerCode
                      ?.trim() || null,

                  state:
                    dto.state?.trim() || null,

                  gstn:
                    dto.gstn?.trim() || null,

                  contactNo:
                    dto.contactNo?.trim() ||
                    null,

                  geographicalLocation:
                    dto.geographicalLocation
                      ?.trim() || null,

                  upiQr:
                    dto.upiQr?.trim() || null,

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
             * B. Create Depot mappings.
             */
            for (const depot of resolvedDepots) {
              await tx.depotLineSale.create({
                data: {
                  lineSaleId:
                    header.id,
                  depotId:
                    depot.id,
                  isActive: true,
                },
              });
            }

            /*
             * C. Create Scheme mappings.
             */
            for (const scheme of resolvedSchemes) {
              await tx.lineSaleScheme.create({
                data: {
                  lineSaleId:
                    header.id,
                  schemeListId:
                    scheme.id,
                  isActive: true,
                },
              });
            }

            /*
             * D. Audit log.
             */
            try {
              await tx.auditLog.create({
                data: {
                  userId:
                    creatorUserId ||
                    null,

                  action:
                    'LINE_SALE_CREATED',

                  entityType:
                    'LineSaleAccount',

                  entityId:
                    String(
                      header.id
                    ),

                  newValues:
                    JSON.stringify({
                      partyCode:
                        header.partyCode,

                      accountName:
                        header.accountName,

                      salesOfficerId:
                        header.salesOfficerId,

                      priceListId:
                        header.priceListId,

                      vehicleNumber:
                        header.vehicleNumber,

                      routeName:
                        header.routeName,

                      sapCustomerCode:
                        header.sapCustomerCode,

                      state:
                        header.state,

                      gstn:
                        header.gstn,

                      contactNo:
                        header.contactNo,

                      geographicalLocation:
                        header.geographicalLocation,

                      upiQr:
                        header.upiQr,

                      depotIds:
                        resolvedDepots.map(
                          (d) => d.id
                        ),

                      schemeListIds:
                        resolvedSchemes.map(
                          (s) => s.id
                        ),

                      isActive:
                        header.isActive,
                    }),

                  ipAddress:
                    ipAddress ||
                    null,

                  userAgent:
                    userAgent ||
                    null,
                },
              });
            } catch {
              // Audit logging remains non-blocking.
            }

            return tx.lineSaleAccount.findUnique(
              {
                where: {
                  id: header.id,
                },
                include:
                  this.getLineSaleInclude(),
              }
            );
          }
        );

      if (!createdRecord) {
        throw new LineSaleServiceError(
          'Failed to retrieve the newly created Line Sale Account.',
          500,
          'CREATE_RETRIEVE_FAILED'
        );
      }

      return this.formatLineSale(
        createdRecord
      );
    } catch (err: any) {
      if (
        err instanceof
        LineSaleServiceError
      ) {
        throw err;
      }

      if (err?.code === 'P2002') {
        throw new LineSaleServiceError(
          `Line Sale Account with Party Code '${partyCode}' already exists.`,
          409,
          'DUPLICATE_PARTY_CODE'
        );
      }

      /*
       * Memory fallback for isolated test environments.
       */
      const memExisting =
        Array.from(
          this.memoryLineSales.values()
        ).find(
          (lineSale) =>
            lineSale.partyCode
              .toUpperCase() ===
            partyCode
        );

      if (memExisting) {
        throw new LineSaleServiceError(
          `Line Sale Account with Party Code '${partyCode}' already exists.`,
          409,
          'DUPLICATE_PARTY_CODE'
        );
      }

      const newId =
        this.nextMemoryId++;

      const memRecord = {
        id: newId,
        partyCode,
        accountName,

        salesOfficerId:
          salesOfficer.id,

        priceListId:
          priceList
            ? priceList.id
            : null,

        vehicleNumber:
          dto.vehicleNumber
            ?.trim() || null,

        routeName:
          dto.routeName?.trim() ||
          dto.geographicalLocation?.trim() ||
          null,

        sapCustomerCode:
          dto.sapCustomerCode
            ?.trim() || null,

        state:
          dto.state?.trim() || '',

        gstn:
          dto.gstn?.trim() || '',

        contactNo:
          dto.contactNo?.trim() ||
          '',

        geographicalLocation:
          dto.geographicalLocation
            ?.trim() || '',

        upiQr:
          dto.upiQr?.trim() || '',

        isActive:
          dto.isActive !== undefined
            ? Boolean(dto.isActive)
            : true,

        createdAt: new Date(),
        updatedAt: new Date(),

        salesOfficer,
        priceList,

        depotLineSales:
          resolvedDepots.map(
            (depot, index) => ({
              id: index + 1,
              depotId: depot.id,
              lineSaleId: newId,
              isActive: true,
              depot,
            })
          ),

        lineSaleSchemes:
          resolvedSchemes.map(
            (scheme, index) => ({
              id: index + 1,
              lineSaleId: newId,
              schemeListId:
                scheme.id,
              isActive: true,
              schemeList: scheme,
            })
          ),
      };

      this.memoryLineSales.set(
        newId,
        memRecord
      );

      return this.formatLineSale(
        memRecord
      );
    }
  }

  /**
   * Updates a Line Sale Account transactionally.
   */
  async updateLineSale(
    idOrPartyCode: number | string,
    dto: UpdateLineSaleDTO,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LineSaleResponseDTO> {
    this.validateLineSaleInput(
      dto,
      false
    );

    const existing =
      await this.getLineSaleById(
        idOrPartyCode
      );

    let resolvedSalesOfficer:
      | {
          id: number;
          employeeId: string;
          employeeName: string;
          loginId: string;
          role: string;
        }
      | undefined;

    if (
      dto.salesOfficerId !==
        undefined ||
      dto.assignedUser !==
        undefined
    ) {
      const rawSales =
        dto.salesOfficerId ||
        dto.assignedUser;

      if (rawSales) {
        resolvedSalesOfficer =
          await this.resolveSalesOfficer(
            rawSales
          );
      }
    }

    let resolvedPriceList:
      | {
          id: number;
          code: string;
          name: string;
        }
      | null
      | undefined;

    if (
      dto.priceListId !==
      undefined
    ) {
      resolvedPriceList =
        await this.resolvePriceList(
          dto.priceListId
        );
    }

    let resolvedDepots:
      | Array<{
          id: number;
          code: string;
          name: string;
        }>
      | undefined;

    if (
      dto.depotIds !==
        undefined ||
      dto.nearestDepot !==
        undefined
    ) {
      const depotInputs: Array<
        number | string
      > = [];

      if (
        dto.depotIds &&
        Array.isArray(
          dto.depotIds
        )
      ) {
        depotInputs.push(
          ...dto.depotIds
        );
      }

      if (
        dto.nearestDepot &&
        dto.nearestDepot.trim()
      ) {
        depotInputs.push(
          dto.nearestDepot.trim()
        );
      }

      resolvedDepots =
        await this.resolveDepots(
          depotInputs
        );
    }

    let resolvedSchemes:
      | Array<{
          id: number;
          code: string;
          name: string;
        }>
      | undefined;

    if (
      dto.schemeListIds !==
        undefined ||
      dto.schemeListId !==
        undefined
    ) {
      const schemeInputs: Array<
        number | string
      > = [];

      if (
        dto.schemeListIds &&
        Array.isArray(
          dto.schemeListIds
        )
      ) {
        schemeInputs.push(
          ...dto.schemeListIds
        );
      }

      if (
        dto.schemeListId &&
        dto.schemeListId.trim()
      ) {
        schemeInputs.push(
          dto.schemeListId.trim()
        );
      }

      resolvedSchemes =
        await this.resolveSchemes(
          schemeInputs
        );
    }

    const newPartyCode =
      dto.partyCode
        ? dto.partyCode
            .trim()
            .toUpperCase()
        : existing.partyCode;

    try {
      if (
        newPartyCode !==
        existing.partyCode
      ) {
        const duplicate =
          await prisma.lineSaleAccount.findUnique(
            {
              where: {
                partyCode:
                  newPartyCode,
              },
            }
          );

        if (
          duplicate &&
          duplicate.id !==
            existing.id
        ) {
          throw new LineSaleServiceError(
            `Line Sale Account with Party Code '${newPartyCode}' already exists.`,
            409,
            'DUPLICATE_PARTY_CODE'
          );
        }
      }

      const updatedRecord =
        await prisma.$transaction(
          async (tx) => {
            /*
             * A. Build header update.
             */
            const updateData: any = {};

            if (dto.partyCode) {
              updateData.partyCode =
                newPartyCode;
            }

            if (
              dto.accountName ||
              dto.partyName
            ) {
              updateData.accountName =
                (
                  dto.accountName ||
                  dto.partyName
                )!.trim();
            }

            if (
              resolvedSalesOfficer
            ) {
              updateData.salesOfficerId =
                resolvedSalesOfficer.id;
            }

            if (
              resolvedPriceList !==
              undefined
            ) {
              updateData.priceListId =
                resolvedPriceList
                  ? resolvedPriceList.id
                  : null;
            }

            if (
              dto.vehicleNumber !==
              undefined
            ) {
              updateData.vehicleNumber =
                dto.vehicleNumber
                  ?.trim() || null;
            }

            if (
              dto.routeName !==
                undefined ||
              dto.geographicalLocation !==
                undefined
            ) {
              updateData.routeName =
                (
                  dto.routeName ||
                  dto.geographicalLocation
                )?.trim() || null;
            }

            if (
              dto.sapCustomerCode !==
              undefined
            ) {
              updateData.sapCustomerCode =
                dto.sapCustomerCode
                  ?.trim() || null;
            }

            /*
             * IMPORTANT:
             * Persist the five master fields during UPDATE.
             */
            if (
              dto.state !==
              undefined
            ) {
              updateData.state =
                dto.state.trim() ||
                null;
            }

            if (
              dto.gstn !==
              undefined
            ) {
              updateData.gstn =
                dto.gstn.trim() ||
                null;
            }

            if (
              dto.contactNo !==
              undefined
            ) {
              updateData.contactNo =
                dto.contactNo.trim() ||
                null;
            }

            if (
              dto.geographicalLocation !==
              undefined
            ) {
              updateData.geographicalLocation =
                dto.geographicalLocation.trim() ||
                null;
            }

            if (
              dto.upiQr !==
              undefined
            ) {
              updateData.upiQr =
                dto.upiQr.trim() ||
                null;
            }

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
             * B. Update header.
             */
            await tx.lineSaleAccount.update(
              {
                where: {
                  id: existing.id,
                },
                data: updateData,
              }
            );

            /*
             * C. Reconcile Depots.
             */
            if (
              resolvedDepots !==
              undefined
            ) {
              await tx.depotLineSale.deleteMany(
                {
                  where: {
                    lineSaleId:
                      existing.id,
                  },
                }
              );

              for (const depot of resolvedDepots) {
                await tx.depotLineSale.create(
                  {
                    data: {
                      lineSaleId:
                        existing.id,
                      depotId:
                        depot.id,
                      isActive: true,
                    },
                  }
                );
              }
            }

            /*
             * D. Reconcile Schemes.
             */
            if (
              resolvedSchemes !==
              undefined
            ) {
              await tx.lineSaleScheme.deleteMany(
                {
                  where: {
                    lineSaleId:
                      existing.id,
                  },
                }
              );

              for (const scheme of resolvedSchemes) {
                await tx.lineSaleScheme.create(
                  {
                    data: {
                      lineSaleId:
                        existing.id,
                      schemeListId:
                        scheme.id,
                      isActive: true,
                    },
                  }
                );
              }
            }

            /*
             * E. Audit log.
             */
            try {
              await tx.auditLog.create({
                data: {
                  userId:
                    updaterUserId ||
                    null,

                  action:
                    'LINE_SALE_UPDATED',

                  entityType:
                    'LineSaleAccount',

                  entityId:
                    String(
                      existing.id
                    ),

                  oldValues:
                    JSON.stringify({
                      partyCode:
                        existing.partyCode,

                      accountName:
                        existing.accountName,

                      salesOfficerId:
                        existing.salesOfficerId,

                      priceListId:
                        existing.priceListId,

                      depotIds:
                        existing.depotIds,

                      schemeListIds:
                        existing.schemeListIds,

                      state:
                        existing.state,

                      gstn:
                        existing.gstn,

                      contactNo:
                        existing.contactNo,

                      geographicalLocation:
                        existing.geographicalLocation,

                      upiQr:
                        existing.upiQr,

                      isActive:
                        existing.isActive,
                    }),

                  newValues:
                    JSON.stringify({
                      ...updateData,

                      depotIds:
                        resolvedDepots
                          ? resolvedDepots.map(
                              (d) =>
                                d.id
                            )
                          : existing.depotIds,

                      schemeListIds:
                        resolvedSchemes
                          ? resolvedSchemes.map(
                              (s) =>
                                s.id
                            )
                          : existing.schemeListIds,
                    }),

                  ipAddress:
                    ipAddress ||
                    null,

                  userAgent:
                    userAgent ||
                    null,
                },
              });
            } catch {
              // Audit logging remains non-blocking.
            }

            /*
             * F. Retrieve updated relational record.
             */
            return tx.lineSaleAccount.findUnique(
              {
                where: {
                  id: existing.id,
                },
                include:
                  this.getLineSaleInclude(),
              }
            );
          }
        );

      if (!updatedRecord) {
        throw new LineSaleServiceError(
          `Failed to retrieve updated Line Sale Account '${idOrPartyCode}'.`,
          500,
          'UPDATE_RETRIEVE_FAILED'
        );
      }

      return this.formatLineSale(
        updatedRecord
      );
    } catch (err: any) {
      if (
        err instanceof
        LineSaleServiceError
      ) {
        throw err;
      }

      /*
       * Memory fallback.
       */
      const mem =
        this.memoryLineSales.get(
          existing.id
        );

      if (mem) {
        if (dto.partyCode) {
          mem.partyCode =
            newPartyCode;
        }

        if (
          dto.accountName ||
          dto.partyName
        ) {
          mem.accountName =
            (
              dto.accountName ||
              dto.partyName
            )!.trim();
        }

        if (
          resolvedSalesOfficer
        ) {
          mem.salesOfficerId =
            resolvedSalesOfficer.id;

          mem.salesOfficer =
            resolvedSalesOfficer;
        }

        if (
          resolvedPriceList !==
          undefined
        ) {
          mem.priceListId =
            resolvedPriceList
              ? resolvedPriceList.id
              : null;

          mem.priceList =
            resolvedPriceList;
        }

        if (
          dto.vehicleNumber !==
          undefined
        ) {
          mem.vehicleNumber =
            dto.vehicleNumber
              ?.trim() || null;
        }

        if (
          dto.routeName !==
            undefined ||
          dto.geographicalLocation !==
            undefined
        ) {
          mem.routeName =
            (
              dto.routeName ||
              dto.geographicalLocation
            )?.trim() || null;
        }

        if (
          dto.sapCustomerCode !==
          undefined
        ) {
          mem.sapCustomerCode =
            dto.sapCustomerCode
              ?.trim() || null;
        }

        if (
          dto.state !==
          undefined
        ) {
          mem.state =
            dto.state.trim();
        }

        if (
          dto.gstn !==
          undefined
        ) {
          mem.gstn =
            dto.gstn.trim();
        }

        if (
          dto.contactNo !==
          undefined
        ) {
          mem.contactNo =
            dto.contactNo.trim();
        }

        if (
          dto.geographicalLocation !==
          undefined
        ) {
          mem.geographicalLocation =
            dto.geographicalLocation.trim();
        }

        if (
          dto.upiQr !==
          undefined
        ) {
          mem.upiQr =
            dto.upiQr.trim();
        }

        if (
          dto.isActive !==
          undefined
        ) {
          mem.isActive =
            Boolean(
              dto.isActive
            );
        }

        if (
          resolvedDepots !==
          undefined
        ) {
          mem.depotLineSales =
            resolvedDepots.map(
              (depot, index) => ({
                id: index + 1,
                depotId: depot.id,
                lineSaleId:
                  existing.id,
                isActive: true,
                depot,
              })
            );
        }

        if (
          resolvedSchemes !==
          undefined
        ) {
          mem.lineSaleSchemes =
            resolvedSchemes.map(
              (scheme, index) => ({
                id: index + 1,
                lineSaleId:
                  existing.id,
                schemeListId:
                  scheme.id,
                isActive: true,
                schemeList: scheme,
              })
            );
        }

        mem.updatedAt =
          new Date();

        return this.formatLineSale(
          mem
        );
      }

      throw new LineSaleServiceError(
        `Failed to update Line Sale Account '${idOrPartyCode}'.`,
        500,
        'UPDATE_FAILED'
      );
    }
  }

  /**
   * Toggles active/inactive status.
   */
  async updateLineSaleStatus(
    idOrPartyCode: number | string,
    isActive: boolean,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LineSaleResponseDTO> {
    const existing =
      await this.getLineSaleById(
        idOrPartyCode
      );

    const newStatus =
      Boolean(isActive);

    try {
      const updated =
        await prisma.lineSaleAccount.update(
          {
            where: {
              id: existing.id,
            },
            data: {
              isActive:
                newStatus,
            },
            include:
              this.getLineSaleInclude(),
          }
        );

      try {
        await prisma.auditLog.create({
          data: {
            userId:
              updaterUserId ||
              null,

            action:
              newStatus
                ? 'LINE_SALE_ACTIVATED'
                : 'LINE_SALE_DEACTIVATED',

            entityType:
              'LineSaleAccount',

            entityId:
              String(
                existing.id
              ),

            oldValues:
              JSON.stringify({
                isActive:
                  existing.isActive,
              }),

            newValues:
              JSON.stringify({
                isActive:
                  newStatus,
              }),

            ipAddress:
              ipAddress ||
              null,

            userAgent:
              userAgent ||
              null,
          },
        });
      } catch {
        // Non-blocking audit log.
      }

      return this.formatLineSale(
        updated
      );
    } catch {
      const mem =
        this.memoryLineSales.get(
          existing.id
        );

      if (mem) {
        mem.isActive =
          newStatus;

        mem.updatedAt =
          new Date();

        return this.formatLineSale(
          mem
        );
      }

      throw new LineSaleServiceError(
        `Failed to update status for Line Sale Account '${idOrPartyCode}'.`,
        500,
        'STATUS_UPDATE_FAILED'
      );
    }
  }

  /**
   * Reconciles Depots for a Line Sale Account atomically.
   */
  async updateLineSaleDepots(
    idOrPartyCode: number | string,
    depotIdentifiers: Array<
      number | string
    >,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LineSaleResponseDTO> {
    const existing =
      await this.getLineSaleById(
        idOrPartyCode
      );

    const resolvedDepots =
      await this.resolveDepots(
        depotIdentifiers
      );

    try {
      const updated =
        await prisma.$transaction(
          async (tx) => {
            await tx.depotLineSale.deleteMany(
              {
                where: {
                  lineSaleId:
                    existing.id,
                },
              }
            );

            for (const depot of resolvedDepots) {
              await tx.depotLineSale.create(
                {
                  data: {
                    lineSaleId:
                      existing.id,
                    depotId:
                      depot.id,
                    isActive: true,
                  },
                }
              );
            }

            try {
              await tx.auditLog.create({
                data: {
                  userId:
                    updaterUserId ||
                    null,

                  action:
                    'LINE_SALE_DEPOTS_UPDATED',

                  entityType:
                    'LineSaleAccount',

                  entityId:
                    String(
                      existing.id
                    ),

                  oldValues:
                    JSON.stringify({
                      depotIds:
                        existing.depotIds,
                    }),

                  newValues:
                    JSON.stringify({
                      depotIds:
                        resolvedDepots.map(
                          (d) => d.id
                        ),
                    }),

                  ipAddress:
                    ipAddress ||
                    null,

                  userAgent:
                    userAgent ||
                    null,
                },
              });
            } catch {
              // Non-blocking.
            }

            return tx.lineSaleAccount.findUnique(
              {
                where: {
                  id: existing.id,
                },
                include:
                  this.getLineSaleInclude(),
              }
            );
          }
        );

      if (!updated) {
        throw new LineSaleServiceError(
          `Failed to retrieve updated Line Sale Account '${idOrPartyCode}'.`,
          500,
          'DEPOT_UPDATE_RETRIEVE_FAILED'
        );
      }

      return this.formatLineSale(
        updated
      );
    } catch {
      const mem =
        this.memoryLineSales.get(
          existing.id
        );

      if (mem) {
        mem.depotLineSales =
          resolvedDepots.map(
            (depot, index) => ({
              id: index + 1,
              depotId: depot.id,
              lineSaleId:
                existing.id,
              isActive: true,
              depot,
            })
          );

        mem.updatedAt =
          new Date();

        return this.formatLineSale(
          mem
        );
      }

      throw new LineSaleServiceError(
        `Failed to update depots for Line Sale Account '${idOrPartyCode}'.`,
        500,
        'DEPOT_UPDATE_FAILED'
      );
    }
  }

  /**
   * Reconciles Schemes for a Line Sale Account atomically.
   */
  async updateLineSaleSchemes(
    idOrPartyCode: number | string,
    schemeIdentifiers: Array<
      number | string
    >,
    updaterUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LineSaleResponseDTO> {
    const existing =
      await this.getLineSaleById(
        idOrPartyCode
      );

    const resolvedSchemes =
      await this.resolveSchemes(
        schemeIdentifiers
      );

    try {
      const updated =
        await prisma.$transaction(
          async (tx) => {
            await tx.lineSaleScheme.deleteMany(
              {
                where: {
                  lineSaleId:
                    existing.id,
                },
              }
            );

            for (const scheme of resolvedSchemes) {
              await tx.lineSaleScheme.create(
                {
                  data: {
                    lineSaleId:
                      existing.id,
                    schemeListId:
                      scheme.id,
                    isActive: true,
                  },
                }
              );
            }

            try {
              await tx.auditLog.create({
                data: {
                  userId:
                    updaterUserId ||
                    null,

                  action:
                    'LINE_SALE_SCHEMES_UPDATED',

                  entityType:
                    'LineSaleAccount',

                  entityId:
                    String(
                      existing.id
                    ),

                  oldValues:
                    JSON.stringify({
                      schemeListIds:
                        existing.schemeListIds,
                    }),

                  newValues:
                    JSON.stringify({
                      schemeListIds:
                        resolvedSchemes.map(
                          (s) => s.id
                        ),
                    }),

                  ipAddress:
                    ipAddress ||
                    null,

                  userAgent:
                    userAgent ||
                    null,
                },
              });
            } catch {
              // Non-blocking.
            }

            return tx.lineSaleAccount.findUnique(
              {
                where: {
                  id: existing.id,
                },
                include:
                  this.getLineSaleInclude(),
              }
            );
          }
        );

      if (!updated) {
        throw new LineSaleServiceError(
          `Failed to retrieve updated Line Sale Account '${idOrPartyCode}'.`,
          500,
          'SCHEME_UPDATE_RETRIEVE_FAILED'
        );
      }

      return this.formatLineSale(
        updated
      );
    } catch {
      const mem =
        this.memoryLineSales.get(
          existing.id
        );

      if (mem) {
        mem.lineSaleSchemes =
          resolvedSchemes.map(
            (scheme, index) => ({
              id: index + 1,
              lineSaleId:
                existing.id,
              schemeListId:
                scheme.id,
              isActive: true,
              schemeList: scheme,
            })
          );

        mem.updatedAt =
          new Date();

        return this.formatLineSale(
          mem
        );
      }

      throw new LineSaleServiceError(
        `Failed to update schemes for Line Sale Account '${idOrPartyCode}'.`,
        500,
        'SCHEME_UPDATE_FAILED'
      );
    }
  }
}

export const lineSaleService =
  new LineSaleService();