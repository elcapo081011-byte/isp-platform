/**
 * Catálogo ÚNICO de permisos y roles del motor. Lo usan el registro de
 * organizaciones, el módulo de usuarios (staff) y el arranque de la
 * plataforma, para que ningún camino dependa de que el seed haya corrido.
 * (packages/database/prisma/seed.ts mantiene su propia copia porque vive
 * fuera del build de NestJS; si agregas un permiso aquí, agrégalo allá.)
 */
export const DEFAULT_PERMISSIONS: { key: string; module: string; description: string }[] = [
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

export interface DefaultRole {
  name: string;
  description: string;
  permissionKeys: string[] | '*';
}

export const DEFAULT_ROLES: DefaultRole[] = [
  { name: 'SUPER_ADMIN', description: 'Acceso total a la cuenta', permissionKeys: '*' },
  {
    name: 'ADMIN',
    description: 'Administración operativa del ISP',
    permissionKeys: DEFAULT_PERMISSIONS.filter((p) => p.key !== 'settings.manage').map((p) => p.key),
  },
  { name: 'SOPORTE', description: 'Atención al cliente y tickets', permissionKeys: ['clients.view', 'tickets.view', 'tickets.manage'] },
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
  { name: 'MONITORING', description: 'Solo lectura de estado de red', permissionKeys: ['mikrotik.view', 'olt.view', 'onu.view'] },
];

/** Roles que solo puede asignar alguien que ya sea SUPER_ADMIN de la cuenta. */
export const PRIVILEGED_ROLES = ['SUPER_ADMIN'];

/**
 * Asegura que existan todos los permisos y roles por defecto (idempotente).
 * Acepta el PrismaService o un cliente de transacción (`tx`).
 */
export async function ensureDefaultRoles(db: any): Promise<void> {
  for (const perm of DEFAULT_PERMISSIONS) {
    await db.permission.upsert({ where: { key: perm.key }, update: {}, create: perm });
  }
  const allPermissions: { id: string; key: string }[] = await db.permission.findMany();

  for (const def of DEFAULT_ROLES) {
    const role = await db.role.upsert({
      where: { name: def.name },
      update: {},
      create: { name: def.name, description: def.description, isSystem: true },
    });
    const wanted = def.permissionKeys === '*' ? allPermissions : allPermissions.filter((p) => def.permissionKeys.includes(p.key));
    for (const permission of wanted) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}
