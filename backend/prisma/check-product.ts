import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({
    where: {
      materialCode: "PROD-TEST-8742"
    }
  });

  console.log(product);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
