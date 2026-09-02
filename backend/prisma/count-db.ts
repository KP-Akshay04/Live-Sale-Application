import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== DATABASE COUNTS ===");

  console.log("Roles:", await prisma.role.count());
  console.log("Users:", await prisma.user.count());
  console.log("Depots:", await prisma.depot.count());
  console.log("Line Sales:", await prisma.lineSaleAccount.count());
  console.log("Depot-Line Sales:", await prisma.depotLineSale.count());
  console.log("Line Sale Schemes:", await prisma.lineSaleScheme.count());

  console.log("Products:", await prisma.product.count());

  console.log("Price Lists:", await prisma.priceList.count());
  console.log("Price List Items:", await prisma.priceListItem.count());

  console.log("Scheme Lists:", await prisma.schemeList.count());
  console.log("Scheme List Items:", await prisma.schemeListItem.count());

  console.log("Freight Rates:", await prisma.freightRate.count());

  console.log("Goods Issues:", await prisma.goodsIssue.count());
  console.log("Goods Issue Items:", await prisma.goodsIssueItem.count());

  console.log("Sales:", await prisma.sale.count());
  console.log("Sale Items:", await prisma.saleItem.count());

  console.log("Payments:", await prisma.payment.count());

  console.log("Goods Returns:", await prisma.goodsReturn.count());
  console.log("Goods Return Items:", await prisma.goodsReturnItem.count());

  console.log("Audit Logs:", await prisma.auditLog.count());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
