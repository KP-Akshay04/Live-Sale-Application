import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding safe foundational roles into MySQL database...');

  const initialRoles = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Full administrative access across all depots, masters, pricing, schemes, and user management.'
    },
    {
      code: 'DEPOT_PERSON',
      name: 'Depot Person',
      description: 'Depot-level inventory manager responsible for Goods Issue, Stock Reconciliation, and vehicle dispatch.'
    },
    {
      code: 'SALES_OFFICER',
      name: 'Sales Officer',
      description: 'Field sales operator responsible for Line Sale billing, invoicing, payments, and outlet distribution.'
    }
  ];

  for (const role of initialRoles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description
      }
    });
  }

  console.log('Foundational roles seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
