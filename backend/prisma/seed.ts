import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  // Optional local development seed: Create an initial Super Admin ONLY when explicitly configured via environment variables
  const devAdminPassword = process.env.DEV_ADMIN_PASSWORD;
  const devAdminLoginId = process.env.DEV_ADMIN_LOGIN_ID?.trim() || process.env.DEV_ADMIN_EMAIL?.trim();

  if (devAdminLoginId && devAdminPassword) {
    console.log('[Dev Seed] Environment variables for development admin detected. Provisioning local dev admin...');

    const superAdminRole = await prisma.role.findUnique({
      where: { code: 'SUPER_ADMIN' },
    });

    if (superAdminRole) {
      const passwordHash = await bcrypt.hash(devAdminPassword, 12);
      const devEmployeeId = process.env.DEV_ADMIN_EMPLOYEE_ID?.trim() || 'EMP-DEV-001';
      const devEmployeeName = process.env.DEV_ADMIN_NAME?.trim() || 'Development Super Admin';

      await prisma.user.upsert({
        where: { loginId: devAdminLoginId },
        update: {
          passwordHash,
          roleId: superAdminRole.id,
          employeeName: devEmployeeName,
          isActive: true,
        },
        create: {
          loginId: devAdminLoginId,
          employeeId: devEmployeeId,
          employeeName: devEmployeeName,
          passwordHash,
          roleId: superAdminRole.id,
          isActive: true,
        },
      });

      console.log(`[Dev Seed] Local development admin provisioned for loginId: ${devAdminLoginId}. (DO NOT USE IN PRODUCTION)`);
    }
  } else {
    console.log('[Dev Seed] No DEV_ADMIN_LOGIN_ID / DEV_ADMIN_PASSWORD supplied. Skipping user creation to prevent unapproved credentials.');
  }
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

