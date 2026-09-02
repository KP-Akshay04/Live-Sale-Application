import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      employeeId: true,
      employeeName: true,
      loginId: true,
      isActive: true,
      role: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
