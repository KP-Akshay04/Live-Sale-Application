import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const passwordHash = async (password: string) => bcrypt.hash(password, 12);

async function main() {
  console.log('============================================================');
  console.log(' BINDU Live Sale - Foundational Master Data Seed');
  console.log('============================================================');

  /*
   * This seed is intentionally idempotent:
   * - Safe to execute repeatedly in development/staging.
   * - Uses stable business keys (codes/employee IDs), not delete/recreate.
   * - Does not contain production secrets.
   *
   * For a fresh local test database, run:
   *   npx prisma migrate reset --schema=backend/prisma/schema.prisma --force
   * followed by:
   *   npm run prisma:seed
   */

  // -------------------------------------------------------------------------
  // 1. ROLES
  // -------------------------------------------------------------------------
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      update: {
        name: 'Super Admin',
        description:
          'Full administrative access across all depots, masters, pricing, schemes, users, and operational controls.',
      },
      create: {
        code: 'SUPER_ADMIN',
        name: 'Super Admin',
        description:
          'Full administrative access across all depots, masters, pricing, schemes, users, and operational controls.',
      },
    }),
    prisma.role.upsert({
      where: { code: 'DEPOT_PERSON' },
      update: {
        name: 'Depot Person',
        description:
          'Depot-level operator responsible for inventory, Goods Issue, vehicle dispatch, and stock reconciliation.',
      },
      create: {
        code: 'DEPOT_PERSON',
        name: 'Depot Person',
        description:
          'Depot-level operator responsible for inventory, Goods Issue, vehicle dispatch, and stock reconciliation.',
      },
    }),
    prisma.role.upsert({
      where: { code: 'SALES_OFFICER' },
      update: {
        name: 'Sales Officer',
        description:
          'Field sales operator responsible for line-sale billing, invoicing, collections, and outlet distribution.',
      },
      create: {
        code: 'SALES_OFFICER',
        name: 'Sales Officer',
        description:
          'Field sales operator responsible for line-sale billing, invoicing, collections, and outlet distribution.',
      },
    }),
  ]);

  const [superAdminRole, depotPersonRole, salesOfficerRole] = roles;

  // -------------------------------------------------------------------------
  // 2. DEPOTS
  // -------------------------------------------------------------------------
  const depot1 = await prisma.depot.upsert({
    where: { code: 'DEPOT-BLR-01' },
    update: {
      name: 'Central Depot Bangalore',
      location: 'Bangalore, Karnataka',
      address: JSON.stringify({
        description: 'Primary South India Distribution Hub',
        addressLine1: 'Plot 42, Peenya Industrial Area 2nd Stage',
        addressLine2: 'Near Outer Ring Road Junction',
        city: 'Bangalore',
        district: 'Bangalore Urban',
        state: 'Karnataka',
        pin: '560058',
        gst: '29AABCB1234F1Z1',
        salesTag: 'KA-SOUTH',
        latitude: 13.0285,
        longitude: 77.5197,
        allowedRadius: 200,
      }),
      phone: '+91 80 2839 0001',
      sapPlantCode: 'PLNT-1001',
      isActive: true,
    },
    create: {
      code: 'DEPOT-BLR-01',
      name: 'Central Depot Bangalore',
      location: 'Bangalore, Karnataka',
      address: JSON.stringify({
        description: 'Primary South India Distribution Hub',
        addressLine1: 'Plot 42, Peenya Industrial Area 2nd Stage',
        addressLine2: 'Near Outer Ring Road Junction',
        city: 'Bangalore',
        district: 'Bangalore Urban',
        state: 'Karnataka',
        pin: '560058',
        gst: '29AABCB1234F1Z1',
        salesTag: 'KA-SOUTH',
        latitude: 13.0285,
        longitude: 77.5197,
        allowedRadius: 200,
      }),
      phone: '+91 80 2839 0001',
      sapPlantCode: 'PLNT-1001',
      isActive: true,
    },
  });

  const depot2 = await prisma.depot.upsert({
    where: { code: 'DEPOT-MYS-01' },
    update: {
      name: 'Mysore Regional Depot',
      location: 'Mysore, Karnataka',
      address: JSON.stringify({
        description: 'Southern Karnataka Regional Logistics Center',
        addressLine1: 'Hebbal Industrial Estate, Hootagalli',
        addressLine2: 'Belagola Post',
        city: 'Mysore',
        district: 'Mysore',
        state: 'Karnataka',
        pin: '570018',
        gst: '29AABCB1234F1Z2',
        salesTag: 'KA-MYS',
        latitude: 12.3556,
        longitude: 76.5912,
        allowedRadius: 250,
      }),
      phone: '+91 821 240 0002',
      sapPlantCode: 'PLNT-1002',
      isActive: true,
    },
    create: {
      code: 'DEPOT-MYS-01',
      name: 'Mysore Regional Depot',
      location: 'Mysore, Karnataka',
      address: JSON.stringify({
        description: 'Southern Karnataka Regional Logistics Center',
        addressLine1: 'Hebbal Industrial Estate, Hootagalli',
        addressLine2: 'Belagola Post',
        city: 'Mysore',
        district: 'Mysore',
        state: 'Karnataka',
        pin: '570018',
        gst: '29AABCB1234F1Z2',
        salesTag: 'KA-MYS',
        latitude: 12.3556,
        longitude: 76.5912,
        allowedRadius: 250,
      }),
      phone: '+91 821 240 0002',
      sapPlantCode: 'PLNT-1002',
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 3. USERS
  // -------------------------------------------------------------------------
  const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'EMP001';

  const superAdmin = await prisma.user.upsert({
    where: { employeeId: 'EMP001' },
    update: {
      loginId: process.env.DEV_ADMIN_LOGIN_ID?.trim() || 'Akshay',
      employeeName:
        process.env.DEV_ADMIN_NAME?.trim() || 'Development Super Admin',
      passwordHash: await passwordHash(adminPassword),
      roleId: superAdminRole.id,
      depotId: null,
      isActive: true,
    },
    create: {
      employeeId: 'EMP001',
      loginId: process.env.DEV_ADMIN_LOGIN_ID?.trim() || 'Akshay',
      employeeName:
        process.env.DEV_ADMIN_NAME?.trim() || 'Development Super Admin',
      passwordHash: await passwordHash(adminPassword),
      roleId: superAdminRole.id,
      depotId: null,
      isActive: true,
    },
  });

  const depotPerson = await prisma.user.upsert({
    where: { employeeId: 'EMP002' },
    update: {
      loginId: 'DepotManager',
      employeeName: 'Depot Manager Bangalore',
      passwordHash: await passwordHash('DEPOT001'),
      roleId: depotPersonRole.id,
      depotId: depot1.id,
      isActive: true,
    },
    create: {
      employeeId: 'EMP002',
      loginId: 'DepotManager',
      employeeName: 'Depot Manager Bangalore',
      passwordHash: await passwordHash('DEPOT001'),
      roleId: depotPersonRole.id,
      depotId: depot1.id,
      isActive: true,
    },
  });

  const salesOfficer = await prisma.user.upsert({
    where: { employeeId: 'EMP003' },
    update: {
      loginId: 'Ramesh',
      employeeName: 'Ramesh Kumar',
      passwordHash: await passwordHash('SALES001'),
      roleId: salesOfficerRole.id,
      depotId: depot1.id,
      isActive: true,
    },
    create: {
      employeeId: 'EMP003',
      loginId: 'Ramesh',
      employeeName: 'Ramesh Kumar',
      passwordHash: await passwordHash('SALES001'),
      roleId: salesOfficerRole.id,
      depotId: depot1.id,
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 4. PRODUCTS
  // -------------------------------------------------------------------------
  const product1 = await prisma.product.upsert({
    where: { materialCode: 'PROD-001' },
    update: {
      description: 'Lemon Fizz 750ML',
      additionalName: 'Lemon Fizz 750ML',
      category: 'Carbonated Drinks',
      baseUom: 'Pcs',
      baseRate: 110.0,
      hsnCode: '22021000',
      taxRate: 18.0,
      isActive: true,
    },
    create: {
      materialCode: 'PROD-001',
      description: 'Lemon Fizz 750ML',
      additionalName: 'Lemon Fizz 750ML',
      category: 'Carbonated Drinks',
      baseUom: 'Pcs',
      baseRate: 110.0,
      hsnCode: '22021000',
      taxRate: 18.0,
      isActive: true,
    },
  });

  const product2 = await prisma.product.upsert({
    where: { materialCode: 'PROD-002' },
    update: {
      description: 'Orange Splash 500ML',
      additionalName: 'Orange Splash 500ML',
      category: 'Carbonated Drinks',
      baseUom: 'Pcs',
      baseRate: 36.0,
      hsnCode: '22021000',
      taxRate: 18.0,
      isActive: true,
    },
    create: {
      materialCode: 'PROD-002',
      description: 'Orange Splash 500ML',
      additionalName: 'Orange Splash 500ML',
      category: 'Carbonated Drinks',
      baseUom: 'Pcs',
      baseRate: 36.0,
      hsnCode: '22021000',
      taxRate: 18.0,
      isActive: true,
    },
  });

  const product3 = await prisma.product.upsert({
    where: { materialCode: 'PROD-003' },
    update: {
      description: 'Jeera Masala 750ML',
      additionalName: 'Jeera Masala 750ML',
      category: 'Carbonated Drinks',
      baseUom: 'Pcs',
      baseRate: 52.25,
      hsnCode: '22021000',
      taxRate: 18.0,
      isActive: true,
    },
    create: {
      materialCode: 'PROD-003',
      description: 'Jeera Masala 750ML',
      additionalName: 'Jeera Masala 750ML',
      category: 'Carbonated Drinks',
      baseUom: 'Pcs',
      baseRate: 52.25,
      hsnCode: '22021000',
      taxRate: 18.0,
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 5. PRICE LISTS
  // -------------------------------------------------------------------------
  const standardPriceList = await prisma.priceList.upsert({
    where: { code: 'PL-STANDARD' },
    update: {
      name: 'Standard Price List',
      description: 'Standard distributor pricing matrix',
      currency: 'INR',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validTo: null,
      isActive: true,
    },
    create: {
      code: 'PL-STANDARD',
      name: 'Standard Price List',
      description: 'Standard distributor pricing matrix',
      currency: 'INR',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validTo: null,
      isActive: true,
    },
  });

  const wholesalePriceList = await prisma.priceList.upsert({
    where: { code: 'PL-WHOLESALE' },
    update: {
      name: 'Wholesale Price List',
      description: 'Wholesale customer pricing matrix',
      currency: 'INR',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validTo: null,
      isActive: true,
    },
    create: {
      code: 'PL-WHOLESALE',
      name: 'Wholesale Price List',
      description: 'Wholesale customer pricing matrix',
      currency: 'INR',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validTo: null,
      isActive: true,
    },
  });

  const standardItems = [
    { productId: product1.id, rate: 110.0, uom: 'Pcs' },
    { productId: product2.id, rate: 36.0, uom: 'Pcs' },
    { productId: product3.id, rate: 52.25, uom: 'Pcs' },
  ];

  const wholesaleItems = [
    { productId: product1.id, rate: 100.0, uom: 'Pcs' },
    { productId: product2.id, rate: 32.0, uom: 'Pcs' },
    { productId: product3.id, rate: 47.5, uom: 'Pcs' },
  ];

  for (const item of standardItems) {
    await prisma.priceListItem.upsert({
      where: {
        priceListId_productId_uom: {
          priceListId: standardPriceList.id,
          productId: item.productId,
          uom: item.uom,
        },
      },
      update: { rate: item.rate },
      create: {
        priceListId: standardPriceList.id,
        productId: item.productId,
        rate: item.rate,
        uom: item.uom,
      },
    });
  }

  for (const item of wholesaleItems) {
    await prisma.priceListItem.upsert({
      where: {
        priceListId_productId_uom: {
          priceListId: wholesalePriceList.id,
          productId: item.productId,
          uom: item.uom,
        },
      },
      update: { rate: item.rate },
      create: {
        priceListId: wholesalePriceList.id,
        productId: item.productId,
        rate: item.rate,
        uom: item.uom,
      },
    });
  }

  // -------------------------------------------------------------------------
  // 6. SCHEME LISTS
  // -------------------------------------------------------------------------
  const summerScheme = await prisma.schemeList.upsert({
    where: { code: 'SL-SUMMER-SPECIAL' },
    update: {
      name: 'Summer Splash',
      description: 'Summer promotional volume schemes',
      schemeType: 'QTY_FREE',
      validFrom: new Date('2025-04-01T00:00:00.000Z'),
      validTo: new Date('2030-12-31T23:59:59.000Z'),
      isActive: true,
    },
    create: {
      code: 'SL-SUMMER-SPECIAL',
      name: 'Summer Splash',
      description: 'Summer promotional volume schemes',
      schemeType: 'QTY_FREE',
      validFrom: new Date('2025-04-01T00:00:00.000Z'),
      validTo: new Date('2030-12-31T23:59:59.000Z'),
      isActive: true,
    },
  });

  const standardVolumeScheme = await prisma.schemeList.upsert({
    where: { code: 'SL-STANDARD-VOLUME' },
    update: {
      name: 'Standard Volume',
      description: 'Standard volume-based promotional scheme',
      schemeType: 'QTY_FREE',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validTo: null,
      isActive: true,
    },
    create: {
      code: 'SL-STANDARD-VOLUME',
      name: 'Standard Volume',
      description: 'Standard volume-based promotional scheme',
      schemeType: 'QTY_FREE',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validTo: null,
      isActive: true,
    },
  });

  /*
   * Five Summer Splash items are intentionally seeded because the application
   * uses a multi-product promotional matrix rather than a single-product rule.
   */
  const summerItems = [
    { productId: product1.id, minQty: 10, freeQty: 1, discountPercent: 0, discountAmount: 0 },
    { productId: product2.id, minQty: 10, freeQty: 1, discountPercent: 0, discountAmount: 0 },
    { productId: product3.id, minQty: 10, freeQty: 1, discountPercent: 0, discountAmount: 0 },
    { productId: product1.id, minQty: 20, freeQty: 2, discountPercent: 0, discountAmount: 0 },
    { productId: product2.id, minQty: 20, freeQty: 2, discountPercent: 0, discountAmount: 0 },
  ];

  /*
   * The schema has no unique constraint on schemeListId + productId.
   * Therefore duplicate product rules are allowed at DB level and are valid
   * for tiered promotional rules. We clear only the seed-owned scheme items
   * before recreating the deterministic five rules.
   */
  await prisma.schemeListItem.deleteMany({
    where: { schemeListId: summerScheme.id },
  });

  await prisma.schemeListItem.createMany({
    data: summerItems.map((item) => ({
      schemeListId: summerScheme.id,
      productId: item.productId,
      minQty: item.minQty,
      freeQty: item.freeQty,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
    })),
  });

  const standardSchemeItems = [
    { productId: product1.id, minQty: 10, freeQty: 1 },
    { productId: product2.id, minQty: 10, freeQty: 1 },
    { productId: product3.id, minQty: 10, freeQty: 1 },
  ];

  await prisma.schemeListItem.deleteMany({
    where: { schemeListId: standardVolumeScheme.id },
  });

  await prisma.schemeListItem.createMany({
    data: standardSchemeItems.map((item) => ({
      schemeListId: standardVolumeScheme.id,
      productId: item.productId,
      minQty: item.minQty,
      freeQty: item.freeQty,
      discountPercent: 0,
      discountAmount: 0,
    })),
  });

  // -------------------------------------------------------------------------
  // 7. LINE SALE ACCOUNTS
  // -------------------------------------------------------------------------
  const lineSale1 = await prisma.lineSaleAccount.upsert({
    where: { partyCode: 'LSA-1001' },
    update: {
      accountName: 'Bangalore South Line Sale',
      salesOfficerId: salesOfficer.id,
      priceListId: standardPriceList.id,
      vehicleNumber: 'KA-01-EV-4090',
      routeName: 'Bangalore South Route',
      sapCustomerCode: 'SAP-CUST-1001',
      isActive: true,
    },
    create: {
      partyCode: 'LSA-1001',
      accountName: 'Bangalore South Line Sale',
      salesOfficerId: salesOfficer.id,
      priceListId: standardPriceList.id,
      vehicleNumber: 'KA-01-EV-4090',
      routeName: 'Bangalore South Route',
      sapCustomerCode: 'SAP-CUST-1001',
      isActive: true,
    },
  });

  const lineSale2 = await prisma.lineSaleAccount.upsert({
    where: { partyCode: 'LSA-1002' },
    update: {
      accountName: 'Mysore Regional Line Sale',
      salesOfficerId: salesOfficer.id,
      priceListId: wholesalePriceList.id,
      vehicleNumber: 'KA-09-AB-1002',
      routeName: 'Mysore Regional Route',
      sapCustomerCode: 'SAP-CUST-1002',
      isActive: true,
    },
    create: {
      partyCode: 'LSA-1002',
      accountName: 'Mysore Regional Line Sale',
      salesOfficerId: salesOfficer.id,
      priceListId: wholesalePriceList.id,
      vehicleNumber: 'KA-09-AB-1002',
      routeName: 'Mysore Regional Route',
      sapCustomerCode: 'SAP-CUST-1002',
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 8. DEPOT ↔ LINE SALE MAPPINGS
  // -------------------------------------------------------------------------
  await prisma.depotLineSale.upsert({
    where: {
      depotId_lineSaleId: {
        depotId: depot1.id,
        lineSaleId: lineSale1.id,
      },
    },
    update: { isActive: true },
    create: {
      depotId: depot1.id,
      lineSaleId: lineSale1.id,
      isActive: true,
    },
  });

  await prisma.depotLineSale.upsert({
    where: {
      depotId_lineSaleId: {
        depotId: depot2.id,
        lineSaleId: lineSale2.id,
      },
    },
    update: { isActive: true },
    create: {
      depotId: depot2.id,
      lineSaleId: lineSale2.id,
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 9. LINE SALE ↔ SCHEME MAPPINGS
  // -------------------------------------------------------------------------
  await prisma.lineSaleScheme.upsert({
    where: {
      lineSaleId_schemeListId: {
        lineSaleId: lineSale1.id,
        schemeListId: summerScheme.id,
      },
    },
    update: { isActive: true },
    create: {
      lineSaleId: lineSale1.id,
      schemeListId: summerScheme.id,
      isActive: true,
    },
  });

  await prisma.lineSaleScheme.upsert({
    where: {
      lineSaleId_schemeListId: {
        lineSaleId: lineSale1.id,
        schemeListId: standardVolumeScheme.id,
      },
    },
    update: { isActive: true },
    create: {
      lineSaleId: lineSale1.id,
      schemeListId: standardVolumeScheme.id,
      isActive: true,
    },
  });

  await prisma.lineSaleScheme.upsert({
    where: {
      lineSaleId_schemeListId: {
        lineSaleId: lineSale2.id,
        schemeListId: standardVolumeScheme.id,
      },
    },
    update: { isActive: true },
    create: {
      lineSaleId: lineSale2.id,
      schemeListId: standardVolumeScheme.id,
      isActive: true,
    },
  });

  console.log('\nSeed completed successfully.');
  console.log('\nFoundational IDs:');
  console.log(`  Super Admin : ${superAdmin.id} (${superAdmin.loginId})`);
  console.log(`  Depot Person: ${depotPerson.id} (${depotPerson.loginId})`);
  console.log(`  Sales Officer: ${salesOfficer.id} (${salesOfficer.loginId})`);
  console.log(`  Depot 1     : ${depot1.id} (${depot1.code})`);
  console.log(`  Depot 2     : ${depot2.id} (${depot2.code})`);
  console.log(`  Product 1   : ${product1.id} (${product1.materialCode})`);
  console.log(`  Product 2   : ${product2.id} (${product2.materialCode})`);
  console.log(`  Product 3   : ${product3.id} (${product3.materialCode})`);
  console.log(`  Price List 1: ${standardPriceList.id} (${standardPriceList.code})`);
  console.log(`  Price List 2: ${wholesalePriceList.id} (${wholesalePriceList.code})`);
  console.log(`  Scheme 1    : ${summerScheme.id} (${summerScheme.code})`);
  console.log(`  Scheme 2    : ${standardVolumeScheme.id} (${standardVolumeScheme.code})`);
  console.log(`  Line Sale 1 : ${lineSale1.id} (${lineSale1.partyCode})`);
  console.log(`  Line Sale 2 : ${lineSale2.id} (${lineSale2.partyCode})`);

  console.log('\nDevelopment credentials:');
  console.log('  Super Admin : Akshay / value from DEV_ADMIN_PASSWORD');
  console.log('  Depot Person: DepotManager / DEPOT001');
  console.log('  Sales Officer: Ramesh / SALES001');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });