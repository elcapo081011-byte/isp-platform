# ISP Control — Plataforma de administración de ISP

Plataforma propia (sin código, diseño ni branding de terceros) para administrar
clientes, red, facturación y soporte de un proveedor de Internet desde un
único sistema.

## Multi-tenant: cada ISP es su propia cuenta (como WispHub)

Esta plataforma es un SaaS multi-tenant. Cualquiera puede crear su propia
cuenta de ISP en `/register` (o `POST /api/v1/auth/register`), y desde ahí
administra **su propia red**: sus clientes, sus planes, su MikroTik, su OLT.
Ningún ISP ve ni puede tocar los datos de otro — está aplicado en cada
consulta del backend, no solo en la interfaz.

**Las credenciales de MikroTik/OLT nunca van en `.env`.** Cada ISP las
carga desde la propia interfaz (`MikroTik → Nuevo router`, `OLT → Nueva
OLT`) y se guardan encriptadas en la base de datos, asociadas a su cuenta.
El `.env` solo trae secretos del motor: `JWT_SECRET`, la clave de cifrado,
la conexión a Postgres y (opcional) SMTP para notificaciones.

## Panel del dueño de la plataforma

Un usuario con `isPlatformAdmin: true` (creado por el seed:
`platform-owner@isp-control.local` / `PlatformAdmin123!`) puede entrar y
ver un ítem extra en el sidebar: **"Plataforma (todas las cuentas)"**.
Ahí se listan todas las organizaciones registradas (nombre, plan, cuántos
clientes/usuarios/routers/OLT tiene cada una) y se pueden suspender o
reactivar — por ejemplo, por falta de pago de tu propio servicio SaaS.
Este usuario NO pertenece a ningún ISP cliente; vive en una organización
interna separada (`slug: platform`) y solo tiene acceso a `/platform/*`
(protegido por `PlatformAdminGuard`, que exige el flag explícitamente y
nunca se asigna desde el signup público).

## Estado: **12 fases + multi-tenancy + panel de plataforma**

Backend (NestJS) y frontend (React) compilan sin errores (`tsc --noEmit`,
`vite build`) y la suite de tests unitarios pasa — ver `docs/ROADMAP.md`
para el detalle fase por fase, incluyendo lo que quedó fuera del alcance
de este ciclo (drivers OLT propietarios, portal del cliente, canales
WhatsApp/SMS) y por qué.

### Módulos funcionales
Autenticación (JWT + refresh) · RBAC granular · Auditoría · Clientes ·
Planes · Facturación + PDF · Motor de suspensión automática · MikroTik
(RouterOS API real) · OLT (SNMP genérico real + Onu) · NAP + mapa (Leaflet) ·
Monitoreo NOC en vivo (WebSocket) · Tickets · Inventario · Notificaciones
(Email real) · API Keys · Backups automáticos (`pg_dump`) · Settings globales.

### Principio seguido en todo el proyecto
Ninguna función se dejó como botón falso. Donde la integración real requiere
información que no se puede inventar con seguridad (comandos de un
fabricante de OLT sin documentación confirmada, un proveedor de pago o
WhatsApp específico), el sistema:
1. Define la interfaz (adapter) completa.
2. Implementa un Mock funcional para poder probar el resto del sistema.
3. Declara explícitamente, en la respuesta de la API y en la UI, qué falta
   y por qué — nunca finge que algo está conectado cuando no lo está.

## Instalación

```bash
cp .env.example .env
# edita .env: define contraseñas, JWT_SECRET y DEVICE_CREDENTIALS_ENCRYPTION_KEY reales

docker compose up -d --build

docker compose exec backend npm run migration:deploy
docker compose exec backend npm run seed
```

Accesos:
- Frontend: http://localhost:8080
- API: http://localhost:8080/api/v1
- Swagger: http://localhost:3000/api/docs

### Usuarios demo (`isDemo: true` — cámbialos antes de producción)

Estos pertenecen a la organización demo creada por el seed ("Fibra Demo ISP").
Para probar el aislamiento multi-tenant de verdad, crea una segunda cuenta
en `/register` y confirma que no ve nada de la organización demo.

| Rol | Email | Password |
|---|---|---|
| Super Admin | superadmin@demo.isp | ChangeMe123! |
| Admin | admin@demo.isp | ChangeMe123! |
| Técnico | tecnico@demo.isp | ChangeMe123! |

## Desarrollo local (sin Docker para backend/frontend)

```bash
docker compose up -d postgres redis

cd apps/backend
npm install
npm run migration:dev
npm run seed
npm run dev        # http://localhost:3000

cd ../frontend
npm install
npm run dev         # http://localhost:5173
```

### Tests

```bash
cd apps/backend
npm test
```

## Estructura del proyecto

```
apps/backend        NestJS — API REST modular (18 módulos)
apps/frontend        React + Vite + Tailwind
packages/database     Prisma schema, migraciones, seed
packages/network-drivers   Interfaces RouterProvider / OltProvider + mocks
infrastructure/       Docker, Nginx
docs/                 Arquitectura, producción, seguridad, roadmap, portal del cliente
```

## Documentación

- `docs/ARQUITECTURA.md` — stack, modelo de datos, patrón de adapters
- `docs/PRODUCCION.md` — checklist antes de salir a producción
- `docs/SEGURIDAD.md` — medidas de seguridad implementadas y pendientes
- `docs/ROADMAP.md` — estado detallado de cada una de las 12 fases
- `docs/PORTAL_CLIENTE.md` — diseño del portal del cliente (no implementado
  en este ciclo, tal como el brief original lo pidió como paso posterior)

## Limitación conocida del entorno donde se construyó

El cliente de Prisma no pudo generarse con sus binarios reales dentro del
sandbox usado para escribir este código, porque ese entorno solo permite
salida de red a dominios de npm/PyPI/GitHub (no a `binaries.prisma.sh`).
Esto no afecta al código: `npm install` en tu máquina, con acceso normal a
internet, genera el cliente completo automáticamente (es un hook de
`postinstall` de Prisma). El `docker compose up -d --build` incluido ya lo
hace por ti.
