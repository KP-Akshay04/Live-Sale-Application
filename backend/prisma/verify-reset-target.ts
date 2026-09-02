import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
    },
  });

  console.table(roles);

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

  console.log("\n=== SUPER ADMIN CHECK ===");
  console.dir(superAdmin, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
