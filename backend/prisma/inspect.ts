import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== USERS ===");
  console.table(await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      employeeId: true,
      loginId: true,
      employeeName: true,
      roleId: true,
    },
  }));

  console.log("\n=== DEPOTS ===");
  console.table(await prisma.depot.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  }));

  console.log("\n=== PRODUCTS ===");
  console.table(await prisma.product.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      materialCode: true,
      additionalName: true,
    },
  }));

  console.log("\n=== PRICE LISTS ===");
  console.table(await prisma.priceList.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  }));

  console.log("\n=== SCHEME LISTS ===");
  console.table(await prisma.schemeList.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  }));

  console.log("\n=== LINE SALES ===");
  console.table(await prisma.lineSaleAccount.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      partyCode: true,
      accountName: true,
      salesOfficerId: true,
    },
  }));

  console.log("\n=== DEPOT ? LINE SALE ===");
  console.table(await prisma.depotLineSale.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      depotId: true,
      lineSaleId: true,
      isActive: true,
    },
  }));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
