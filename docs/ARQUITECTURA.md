# Arquitectura

## Stack final

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind | Identidad visual propia ("NOC de fibra") |
| Backend | NestJS + TypeScript | Modular, un módulo por dominio |
| Base de datos | PostgreSQL + Prisma | Migraciones versionadas |
| Tiempo real | Socket.IO (`@nestjs/websockets`) | Namespace `/noc` |
| Tareas programadas | `@nestjs/schedule` (cron) | Suspensión automática, backups, monitoreo |
| MikroTik | `node-routeros-v2` | Comandos oficiales de RouterOS API |
| OLT | `net-snmp` (genérico) + drivers por fabricante (pendientes) | Nunca OIDs inventados |
| PDF | `pdfkit` | Facturas |
| Email | `nodemailer` | Canal de notificaciones |
| Seguridad | `helmet`, `bcrypt`, JWT, rate limiting | Ver `docs/SEGURIDAD.md` |

## Modelo de datos (resumen)

```
Organization (tenant) ──< User ──< UserRole >── Role ──< RolePermission >── Permission
Organization ──< Customer, Plan, Router, Olt, Nap, Ticket, InventoryItem,
                  Invoice, ApiKey, Alert, NetworkEvent, Notification, Setting

Customer ──< Service >── Plan
Customer ──< Invoice ──< Payment
Customer ──< Ticket ──< TicketComment
Service >── Router (MikroTik)

Olt ──< Onu
InventoryItem ──< InventoryMovement
```

## Multi-tenancy (SaaS como WispHub)

Cada ISP que usa la plataforma es su propia **Organización**, creada vía
`POST /api/v1/auth/register` (sin necesidad de que nadie más lo haga por
ellos — es un signup público, igual que WispHub). A partir de ahí:

- Todo dato de negocio (`Customer`, `Plan`, `Router`, `Olt`, `Invoice`,
  `Ticket`, `InventoryItem`, `Nap`, `Alert`, `ApiKey`, `Setting`, etc.)
  tiene una columna `organizationId` y **toda consulta la filtra**.
- Las credenciales de MikroTik/OLT de cada ISP se cargan desde la interfaz
  (`POST /mikrotik/routers`, `POST /olt`) y se guardan **encriptadas en la
  base de datos**, nunca en `.env`. El `.env` solo contiene secretos del
  motor (JWT, clave de cifrado, conexión a Postgres, SMTP) — jamás
  credenciales de un cliente de la plataforma.
- El JWT de cada usuario lleva su `organizationId`; cada controlador lo
  toma de `req.user.organizationId` y lo pasa a su servicio, que lo aplica
  en cada `where` de Prisma.
- El canal de tiempo real (Socket.IO, namespace `/noc`) autentica el mismo
  JWT al conectar y une al socket a una sala `org:<id>` — las alertas de
  una organización nunca llegan a otra.
- El motor de suspensión automática y el monitoreo corren para **todas**
  las organizaciones activas (son crons de la plataforma), pero cada
  iteración opera exclusivamente sobre los datos y el router/OLT de esa
  organización puntual.


## Principio de adapters

Dos interfaces desacoplan la lógica de negocio del hardware:

- `RouterProvider` (`packages/network-drivers/src/router-provider.interface.ts`)
- `OltProvider` (`packages/network-drivers/src/olt-provider.interface.ts`)

Cada una tiene:
1. Un **Mock** funcional (desarrollo/demo, sin hardware real)
2. Un driver **real** solo para lo que está verificado contra documentación oficial:
   - MikroTik: `RouterOsProvider` (Fase 4) — comandos RouterOS API documentados
   - OLT genérico: `GenericSnmpOltProvider` (Fase 5) — solo OIDs MIB-II estándar;
     PON/ONU específicos requieren que el administrador configure `vendorOidMap`
     con los OIDs del fabricante (Huawei/ZTE/FiberHome), tomados de su documentación.
     Sin esa configuración, el sistema devuelve explícitamente "no soportado",
     nunca un dato inventado.

El mismo patrón aplica a `NotificationChannel` (Email implementado con SMTP real;
WhatsApp/SMS quedan como interfaz lista para su proveedor oficial).

## Por qué no BullMQ para el motor de suspensión

El brief sugería Redis/BullMQ para colas. Para el motor de suspensión (una
tarea diaria) se usó `@nestjs/schedule` (cron en proceso) por ser más simple
y suficiente para esa cadencia. Redis queda reservado para lo que sí necesita
colas de verdad (picos de notificaciones masivas) — el contenedor de Redis
sigue en `docker-compose.yml`, listo para ese caso de uso cuando se necesite.

## Ejecutar en producción

Ver `docs/PRODUCCION.md`.
