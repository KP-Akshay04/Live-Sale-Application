import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== DATABASE BASELINE ===");

  console.table({
    Users: await prisma.user.count(),
    Depots: await prisma.depot.count(),
    Products: await prisma.product.count(),
    PriceLists: await prisma.priceList.count(),
    Schemes: await prisma.schemeList.count(),
    LineSales: await prisma.lineSaleAccount.count(),
    DepotLineMappings: await prisma.depotLineSale.count(),
    LineSaleSchemes: await prisma.lineSaleScheme.count(),
    PriceListItems: await prisma.priceListItem.count(),
    SchemeItems: await prisma.schemeListItem.count(),
  });

  console.log("\n=== DEPOT ? LINE SALE ===");

  const mappings = await prisma.depotLineSale.findMany({
    orderBy: { id: "asc" },
    select: {
      depotId: true,
      lineSaleId: true,
      isActive: true,
      depot: {
        select: {
          code: true,
          name: true,
        },
      },
      lineSale: {
        select: {
          partyCode: true,
          accountName: true,
        },
      },
    },
  });

  console.table(
    mappings.map((m) => ({
      depotId: m.depotId,
      depot: m.depot.code,
      lineSaleId: m.lineSaleId,
      lineSale: m.lineSale.partyCode,
      active: m.isActive,
    }))
  );

  console.log("\n=== STANDARD PRICE LIST ===");

  const standard = await prisma.priceList.findUnique({
    where: { code: "PL-STANDARD" },
    include: {
      items: {
        orderBy: { productId: "asc" },
        select: {
          productId: true,
          rate: true,
          uom: true,
          product: {
            select: {
              materialCode: true,
            },
          },
        },
      },
    },
  });

  console.table(
    standard?.items.map((item) => ({
      productId: item.productId,
      materialCode: item.product.materialCode,
      rate: item.rate.toString(),
      uom: item.uom,
    }))
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
