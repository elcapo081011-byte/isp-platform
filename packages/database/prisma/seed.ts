import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Catálogo de permisos granulares (punto 22 del brief). Son globales al
// motor (no pertenecen a ninguna organización) — cada Role sí es propio
// de cada organización que se registre.
const PERMISSIONS: { key: string; module: string; description: string }[] = [
  { key: 'clients.view', module: 'clients', description: 'Ver clientes' },
  { key: 'clients.create', module: 'clients', description: 'Crear clientes' },
  { key: 'clients.edit', module: 'clients', description: 'Editar clientes' },
  { key: 'clients.delete', module: 'clients', description: 'Eliminar clientes' },
  { key: 'plans.view', module: 'plans', description: 'Ver planes de Internet' },
  { key: 'plans.manage', module: 'plans', description: 'Crear/editar planes de Internet' },
  { key: 'billing.view', module: 'billing', description: 'Ver facturación' },
  { key: 'billing.create', module: 'billing', description: 'Crear facturas' },
  { key: 'billing.edit', module: 'billing', description: 'Editar facturación' },
  { key: 'mikrotik.view', module: 'mikrotik', description: 'Ver routers MikroTik' },
  { key: 'mikrotik.manage', module: 'mikrotik', description: 'Administrar MikroTik' },
  { key: 'olt.view', module: 'olt', description: 'Ver OLT' },
  { key: 'olt.manage', module: 'olt', description: 'Administrar OLT' },
  { key: 'onu.view', module: 'onu', description: 'Ver ONU/ONT' },
  { key: 'onu.manage', module: 'onu', description: 'Administrar ONU/ONT' },
  { key: 'inventory.view', module: 'inventory', description: 'Ver inventario' },
  { key: 'inventory.manage', module: 'inventory', description: 'Administrar inventario' },
  { key: 'tickets.view', module: 'tickets', description: 'Ver tickets' },
  { key: 'tickets.manage', module: 'tickets', description: 'Administrar tickets' },
  { key: 'users.manage', module: 'users', description: 'Administrar usuarios y roles' },
  { key: 'settings.manage', module: 'settings', description: 'Administrar configuración global' },
  { key: 'audit.view', module: 'audit', description: 'Ver auditoría' },
];

const ROLES: { name: string; description: string; permissionKeys: string[] | '*' }[] = [
  { name: 'SUPER_ADMIN', description: 'Acceso total a la cuenta', permissionKeys: '*' },
  {
    name: 'ADMIN',
    description: 'Administración operativa del ISP',
    permissionKeys: PERMISSIONS.filter((p) => p.key !== 'settings.manage').map((p) => p.key),
  },
  {
    name: 'SOPORTE',
    description: 'Atención al cliente y tickets',
    permissionKeys: ['clients.view', 'tickets.view', 'tickets.manage'],
  },
  {
    name: 'TECNICO',
    description: 'Técnicos de campo',
    permissionKeys: ['clients.view', 'tickets.view', 'tickets.manage', 'onu.view', 'inventory.view'],
  },
  {
    name: 'FACTURACION',
    description: 'Gestión de cobros',
    permissionKeys: ['clients.view', 'billing.view', 'billing.create', 'billing.edit'],
  },
  {
    name: 'MONITORING',
    description: 'Solo lectura de estado de red',
    permissionKeys: ['mikrotik.view', 'olt.view', 'onu.view'],
  },
];

async function main() {
  console.log('🌱 Sembrando permisos y roles (compartidos por el motor)...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: perm.key }, update: {}, create: perm });
  }
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {},
      create: { name: roleDef.name, description: roleDef.description, isSystem: true },
    });
    const permKeys = roleDef.permissionKeys === '*' ? PERMISSIONS.map((p) => p.key) : roleDef.permissionKeys;
    for (const key of permKeys) {
      const permission = await prisma.permission.findUnique({ where: { key } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('🌱 Sembrando cuenta del dueño de la plataforma (isPlatformAdmin)...');
  const isProduction = process.env.NODE_ENV === 'production';
  const seedDemo = !isProduction || process.env.SEED_DEMO_DATA === 'true';
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  const ownerPassword = process.env.PLATFORM_OWNER_PASSWORD;

  const platformOrg = await prisma.organization.upsert({
    where: { slug: 'platform' },
    update: {},
    create: { name: 'Plataforma (interno)', slug: 'platform', plan: 'INTERNAL' },
  });

  if (ownerEmail && ownerPassword) {
    if (ownerPassword.length < 12) throw new Error('PLATFORM_OWNER_PASSWORD debe tener al menos 12 caracteres.');
    await prisma.user.upsert({
      where: { email: ownerEmail },
      update: { isPlatformAdmin: true, isActive: true },
      create: {
        organizationId: platformOrg.id,
        email: ownerEmail,
        firstName: process.env.PLATFORM_OWNER_FIRST_NAME || 'Dueño',
        lastName: process.env.PLATFORM_OWNER_LAST_NAME || 'de la Plataforma',
        passwordHash: await bcrypt.hash(ownerPassword, 12),
        isPlatformAdmin: true,
        isDemo: false,
      },
    });
    console.log(`   Dueño de la plataforma: ${ownerEmail}`);
  } else if (!isProduction) {
    // Solo desarrollo local: credencial pública y conocida, marcada isDemo.
    await prisma.user.upsert({
      where: { email: 'platform-owner@isp-control.local' },
      update: {},
      create: {
        organizationId: platformOrg.id,
        email: 'platform-owner@isp-control.local',
        firstName: 'Dueño',
        lastName: 'de la Plataforma',
        passwordHash: await bcrypt.hash('PlatformAdmin123!', 12),
        isPlatformAdmin: true,
        isDemo: true,
      },
    });
    console.log('   (dev) Dueño demo: platform-owner@isp-control.local / PlatformAdmin123!');
  } else {
    console.log('   ⚠️  Producción sin PLATFORM_OWNER_EMAIL/PASSWORD: no se creó ningún dueño de plataforma.');
  }

  if (!seedDemo) {
    console.log('✅ Seed completado (solo permisos, roles y dueño; sin datos demo en producción).');
    return;
  }

  console.log('🌱 Sembrando organización demo (ISP de ejemplo)...');
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-isp' },
    update: {},
    create: { name: 'Fibra Demo ISP', slug: 'demo-isp', plan: 'TRIAL' },
  });

  console.log('🌱 Sembrando usuarios demo de esa organización...');
  const demoUsers = [
    { email: 'superadmin@demo.isp', role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin' },
    { email: 'admin@demo.isp', role: 'ADMIN', firstName: 'Admin', lastName: 'Demo' },
    { email: 'tecnico@demo.isp', role: 'TECNICO', firstName: 'Técnico', lastName: 'Demo' },
  ];
  const defaultPasswordHash = await bcrypt.hash('ChangeMe123!', 12);

  for (const u of demoUsers) {
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (!role) continue;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        organizationId: organization.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: defaultPasswordHash,
        isDemo: true,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  console.log('🌱 Sembrando planes demo...');
  const planDefs = [
    { name: 'Plan 50 Mbps', downloadMbps: 50, uploadMbps: 20, price: 20, technology: 'FTTH', mikrotikProfile: 'plan-50m' },
    { name: 'Plan 100 Mbps', downloadMbps: 100, uploadMbps: 50, price: 30, technology: 'FTTH', mikrotikProfile: 'plan-100m' },
    { name: 'Plan 200 Mbps', downloadMbps: 200, uploadMbps: 100, price: 45, technology: 'FTTH', mikrotikProfile: 'plan-200m' },
  ];
  const createdPlans = [];
  for (const p of planDefs) {
    const plan = await prisma.plan.upsert({
      where: { id: `demo-${p.mikrotikProfile}` },
      update: {},
      create: { id: `demo-${p.mikrotikProfile}`, organizationId: organization.id, ...p, isDemo: true },
    });
    createdPlans.push(plan);
  }

  console.log('🌱 Sembrando clientes demo...');
  const technicianUser = await prisma.user.findUnique({ where: { email: 'tecnico@demo.isp' } });
  const firstNames = ['Carlos', 'María', 'Luis', 'Ana', 'Pedro', 'Rosa', 'Juan', 'Carmen', 'José', 'Laura'];
  const lastNames = ['Pérez', 'Gómez', 'Rodríguez', 'Martínez', 'Hernández', 'López', 'García', 'Díaz', 'Reyes', 'Cruz'];
  const statuses: ('ACTIVE' | 'SUSPENDED' | 'PENDING_INSTALLATION')[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED', 'PENDING_INSTALLATION'];

  for (let i = 0; i < 10; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const documentId = `DEMO-DOC-${1000 + i}`;
    const customer = await prisma.customer.upsert({
      where: { organizationId_documentId: { organizationId: organization.id, documentId } },
      update: {},
      create: {
        organizationId: organization.id,
        firstName,
        lastName,
        documentId,
        phone: `809555${1000 + i}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.isp`,
        address: `Calle Demo #${i + 1}, Santo Domingo`,
        latitude: 18.4861 + (Math.random() - 0.5) * 0.05,
        longitude: -69.9312 + (Math.random() - 0.5) * 0.05,
        status: statuses[i % statuses.length],
        technicianId: technicianUser?.id,
        billingDay: (i % 28) + 1,
        isDemo: true,
      },
    });

    const plan = createdPlans[i % createdPlans.length];
    await prisma.service.upsert({
      where: { pppoeUsername: `demo_user_${1000 + i}` },
      update: {},
      create: {
        customerId: customer.id,
        planId: plan.id,
        pppoeUsername: `demo_user_${1000 + i}`,
        status: customer.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      },
    });
  }

  console.log('✅ Seed completado.');
  console.log(`   Organización demo: "${organization.name}" (slug: ${organization.slug})`);
  console.log('   Usuarios demo — contraseña por defecto: ChangeMe123! (cámbiala de inmediato)');
  console.log('   Para probar el multi-tenant real, usa POST /api/v1/auth/register para crear otra organización.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
