import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n========================================");
  console.log(" BINDU E2E DATABASE RESET");
  console.log("========================================\n");

  // --------------------------------------------------
  // SAFETY CHECK 1: Super Admin must exist
  // --------------------------------------------------
  const superAdmin = await prisma.user.findUnique({
    where: { loginId: "emp001" },
    select: {
      id: true,
      loginId: true,
      employeeName: true,
      role: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!superAdmin) {
    throw new Error(
      "ABORTED: Super Admin user emp001 was not found."
    );
  }

  if (
    superAdmin.role.code !== "SUPER_ADMIN" ||
    superAdmin.role.id !== 1
  ) {
    throw new Error(
      "ABORTED: emp001 is not assigned to the expected SUPER_ADMIN role."
    );
  }

  console.log(
    `Protected Super Admin: ${superAdmin.employeeName} (${superAdmin.loginId})`
  );

  // --------------------------------------------------
  // SAFETY CHECK 2: Products must exist
  // --------------------------------------------------
  const productCount = await prisma.product.count();

  if (productCount === 0) {
    throw new Error(
      "ABORTED: No products found. Refusing to perform E2E reset."
    );
  }

  console.log(`Protected Products: ${productCount}`);

  // --------------------------------------------------
  // SAFETY CHECK 3: Schemes must exist
  // --------------------------------------------------
  const schemeCount = await prisma.schemeList.count();
  const schemeItemCount = await prisma.schemeListItem.count();

  if (schemeCount === 0 || schemeItemCount === 0) {
    throw new Error(
      "ABORTED: Scheme data is missing. Refusing to perform E2E reset."
    );
  }

  console.log(`Protected Scheme Lists: ${schemeCount}`);
  console.log(`Protected Scheme Items: ${schemeItemCount}`);

  console.log("\nSafety checks passed.");
  console.log("Starting transactional reset...\n");

  await prisma.$transaction(async (tx) => {
    // ------------------------------------------------
    // 1. Detach users from depots
    // ------------------------------------------------
    await tx.user.updateMany({
      data: {
        depotId: null,
      },
    });

    // ------------------------------------------------
    // 2. Payments
    // ------------------------------------------------
    const payments = await tx.payment.deleteMany({});
    console.log(`Deleted Payments: ${payments.count}`);

    // ------------------------------------------------
    // 3. Sale Items
    // ------------------------------------------------
    const saleItems = await tx.saleItem.deleteMany({});
    console.log(`Deleted Sale Items: ${saleItems.count}`);

    // ------------------------------------------------
    // 4. Sales
    // ------------------------------------------------
    const sales = await tx.sale.deleteMany({});
    console.log(`Deleted Sales: ${sales.count}`);

    // ------------------------------------------------
    // 5. Goods Return Items
    // ------------------------------------------------
    const goodsReturnItems =
      await tx.goodsReturnItem.deleteMany({});

    console.log(
      `Deleted Goods Return Items: ${goodsReturnItems.count}`
    );

    // ------------------------------------------------
    // 6. Goods Returns
    // ------------------------------------------------
    const goodsReturns = await tx.goodsReturn.deleteMany({});

    console.log(
      `Deleted Goods Returns: ${goodsReturns.count}`
    );

    // ------------------------------------------------
    // 7. Goods Issue Items
    // ------------------------------------------------
    const goodsIssueItems =
      await tx.goodsIssueItem.deleteMany({});

    console.log(
      `Deleted Goods Issue Items: ${goodsIssueItems.count}`
    );

    // ------------------------------------------------
    // 8. Goods Issues
    // ------------------------------------------------
    const goodsIssues = await tx.goodsIssue.deleteMany({});

    console.log(
      `Deleted Goods Issues: ${goodsIssues.count}`
    );

    // ------------------------------------------------
    // 9. Line Sale Schemes
    // ------------------------------------------------
    const lineSaleSchemes =
      await tx.lineSaleScheme.deleteMany({});

    console.log(
      `Deleted Line Sale Schemes: ${lineSaleSchemes.count}`
    );

    // ------------------------------------------------
    // 10. Depot-Line Sale mappings
    // ------------------------------------------------
    const depotLineSales =
      await tx.depotLineSale.deleteMany({});

    console.log(
      `Deleted Depot-Line Sales: ${depotLineSales.count}`
    );

    // ------------------------------------------------
    // 11. Line Sales
    // ------------------------------------------------
    const lineSales =
      await tx.lineSaleAccount.deleteMany({});

    console.log(
      `Deleted Line Sales: ${lineSales.count}`
    );

    // ------------------------------------------------
    // 12. Price List Items
    // ------------------------------------------------
    const priceListItems =
      await tx.priceListItem.deleteMany({});

    console.log(
      `Deleted Price List Items: ${priceListItems.count}`
    );

    // ------------------------------------------------
    // 13. Price Lists
    // ------------------------------------------------
    const priceLists =
      await tx.priceList.deleteMany({});

    console.log(
      `Deleted Price Lists: ${priceLists.count}`
    );

    // ------------------------------------------------
    // 14. Freight Rates
    // ------------------------------------------------
    const freightRates =
      await tx.freightRate.deleteMany({});

    console.log(
      `Deleted Freight Rates: ${freightRates.count}`
    );

    // ------------------------------------------------
    // 15. Audit Logs
    // ------------------------------------------------
    const auditLogs =
      await tx.auditLog.deleteMany({});

    console.log(
      `Deleted Audit Logs: ${auditLogs.count}`
    );

    // ------------------------------------------------
    // 16. Delete all users except Super Admin
    // ------------------------------------------------
    const otherUsers =
      await tx.user.deleteMany({
        where: {
          id: {
            not: superAdmin.id,
          },
        },
      });

    console.log(
      `Deleted Non-Super-Admin Users: ${otherUsers.count}`
    );

    // ------------------------------------------------
    // 17. Delete all roles except SUPER_ADMIN
    // ------------------------------------------------
    const otherRoles =
      await tx.role.deleteMany({
        where: {
          id: {
            not: 1,
          },
        },
      });

    console.log(
      `Deleted Non-Super-Admin Roles: ${otherRoles.count}`
    );

    // ------------------------------------------------
    // 18. Delete Depots
    // ------------------------------------------------
    const depots =
      await tx.depot.deleteMany({});

    console.log(
      `Deleted Depots: ${depots.count}`
    );
  });

  console.log("\n========================================");
  console.log(" TRANSACTION COMMITTED SUCCESSFULLY");
  console.log("========================================\n");

  // --------------------------------------------------
  // FINAL VERIFICATION
  // --------------------------------------------------
  console.log("=== FINAL DATABASE COUNTS ===");

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

  // --------------------------------------------------
  // FINAL PROTECTION VERIFICATION
  // --------------------------------------------------
  const protectedAdmin =
    await prisma.user.findUnique({
      where: { loginId: "emp001" },
      select: {
        id: true,
        loginId: true,
        employeeName: true,
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

  console.log("\n=== PROTECTED DATA CHECK ===");
  console.dir(protectedAdmin, { depth: null });

  console.log("\nE2E database reset complete.");
}

main()
  .catch((error) => {
    console.error("\n!!! RESET FAILED !!!");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
