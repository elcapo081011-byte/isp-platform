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

## Panel del dueño de la plataforma (tú)

El dueño es un usuario con `isPlatformAdmin: true`. **No pertenece a ningún ISP** y
por eso NO opera clientes, planes ni red de nadie: al entrar solo ve el menú
de plataforma (`/platform`):

- **Cuentas de ISP** — todas las organizaciones, su dueño, plan/prueba, cuántos
  clientes/usuarios/routers/OLT tienen; crear una cuenta nueva; suspender/reactivar.
- **Usuarios (todas)** — todos los usuarios de todas las cuentas; dar de alta uno
  en la cuenta que elijas (soporte, o si un dueño perdió el acceso).
- **Cobros y suscripciones** — facturas que tú le cobras a cada ISP, los pagos que
  ellos avisan, marcar como pagada, y el texto de "cómo pagar" que ellos ven.

### Cómo crear TU usuario dueño

Se crea al arrancar el backend con variables de entorno (no hay ningún registro
público que pueda dar este permiso):

```env
PLATFORM_OWNER_EMAIL=tu@correo.com
PLATFORM_OWNER_PASSWORD=una-contraseña-larga-de-12+-caracteres
```

Reinicia el backend y entra por `/login` con esos datos. Si olvidas la
contraseña: pon `PLATFORM_OWNER_RESET_PASSWORD=true`, reinicia, y vuelve a `false`.
Si ese correo ya existía como usuario de un ISP, se promueve a dueño.

> Importante: `/register` **solo** crea cuentas de ISP. Si te registras ahí,
> eres dueño de un ISP (con "Mi suscripción", "Usuarios", etc.), no de la plataforma.

## Usuarios (staff) de cada ISP

Cada ISP administra su equipo en **Usuarios** (`/usuarios`, permiso `users.manage`):
crear, cambiar rol, resetear contraseña, desactivar. Roles: Super administrador,
Administrador, Soporte, Técnico, Facturación, Solo monitoreo. Reglas: solo un
Super administrador puede crear/modificar a otro; no puedes desactivarte ni dejar
la cuenta sin ningún Super administrador; nadie ve usuarios de otra cuenta.

## MikroTik: agregar un router (como en WispHub)

**MikroTik → Agregar router** abre una pantalla con las mismas 4 pestañas que WispHub:

| Pestaña | Qué hace hoy |
|---|---|
| **Información general** | Nombre, IP/DDNS, **failover** (si el principal no responde se prueba el alterno), puertos API/WWW, versión de RouterOS, coordenadas, comentarios, rangos IP y *External ID*. Interruptor **"Agregar cliente en MikroTik"** (real). El **tipo de corte** puede ser *deshabilitar el usuario PPPoE* o *address list moroso* (el script agrega la regla de firewall que bloquea la lista). Los modos de control que aún no existen (Simple Queue, PCQ, HotSpot, IP Bindings, DHCP, IPv6…) aparecen **deshabilitados con la etiqueta "pronto"**. |
| **Facturación - Zona** | Por router: crear factura (día/hora), día de pago, recordatorio, día de corte, "suspender tras N facturas vencidas", impuestos, y los interruptores de facturas/recordatorios/corte automáticos y correos. **Todo esto lo ejecuta el motor** (`ZoneBillingEngine`, cada hora). Un router sin zona guardada sigue con las reglas globales de la cuenta. |
| **Script de conexión** | El sistema **genera el usuario y la clave de API** y te da un script para pegar en el terminal del MikroTik (usuario con permisos limitados, servicio API habilitado y, si defines `PLATFORM_PUBLIC_IP`, acceso solo desde esa IP). Botón **Verificar conexión** con el motivo legible si falla, y **Regenerar credenciales**. |
| **Eventos API personalizados** | Webhooks por router: cuando un cliente de ese router se **agrega, edita, elimina, suspende o reactiva**, se envía un `POST` JSON a las URLs que registres (con botón **Probar** y último resultado). Solo `https` público (443/8443), sin redirecciones, con firma opcional `X-ISP-Signature` (HMAC-SHA256) y sin contraseñas en el cuerpo. |

Flujo completo: **router → cliente → factura → corte**.
1. Creas el router y pegas el script.
2. **Nuevo cliente** ahora pide *Router/zona*, usuario y contraseña PPPoE: si el router tiene "Agregar cliente en MikroTik", su usuario PPPoE se crea en el equipo con el **perfil de MikroTik del plan** (el plan debe tener uno definido).
3. Según la zona, el motor emite las facturas, recuerda el pago y **corta** (deshabilita el PPPoE) al llegar el día de corte.
4. Al pagar, la factura reactiva al cliente en el router.

> Antes de esta versión, crear un cliente **nunca** le asignaba un router, así que el corte y la reactivación contra MikroTik no se ejecutaban para nadie. Para los clientes que ya existían: **Perfil del cliente → Servicio → Cambiar plan / router** los lleva a un router (crea su usuario PPPoE en el equipo y lo quita del anterior; si están suspendidos queda deshabilitado). Necesitas escribir su contraseña PPPoE una vez, porque antes no se guardaba.

**Corte por address list:** usa la IP fija del servicio o, si no tiene, la de su sesión PPPoE activa al momento del corte; con IP dinámica un cliente que se reconecte con otra IP podría quedar fuera de la lista.

**Sin VPN:** el script no crea una VPN (WispHub sí, con sus propios servidores). El router debe ser alcanzable por IP pública o DDNS desde el servidor de la plataforma.

## Suscripción a la plataforma ("Mi suscripción")

Cada ISP ve sus planes (Gratis hasta 15 clientes · Básico · Pro · Ilimitado), su
uso, sus facturas, las instrucciones de pago que tú publicas y un botón
**"Ya pagué"** para avisarte con su referencia. **No hay cobro automático con
tarjeta**: falta elegir país/proveedor (Stripe, MercadoPago, dLocal…). Hoy tú
verificas el pago y lo marcas pagado; al hacerlo la cuenta se reactiva sola.

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
# edita .env: contraseñas, JWT_SECRET, DEVICE_CREDENTIALS_ENCRYPTION_KEY
# y PLATFORM_OWNER_EMAIL / PLATFORM_OWNER_PASSWORD (tu usuario dueño)

docker compose up -d --build
# Las tablas se crean solas al arrancar el backend (ver "Base de datos" abajo).
# El seed es OPCIONAL (solo roles + datos demo en desarrollo):
# docker compose exec backend npm run seed
```

Accesos:
- Frontend: http://localhost:8080
- API: http://localhost:8080/api/v1
- Swagger: http://localhost:3000/api/docs

### Usuarios demo (solo desarrollo; con `NODE_ENV=production` el seed NO los crea salvo `SEED_DEMO_DATA=true`)

Estos pertenecen a la organización demo creada por el seed ("Fibra Demo ISP").
Para probar el aislamiento multi-tenant de verdad, crea una segunda cuenta
en `/register` y confirma que no ve nada de la organización demo.

| Rol | Email | Password |
|---|---|---|
| Super Admin | superadmin@demo.isp | ChangeMe123! |
| Admin | admin@demo.isp | ChangeMe123! |
| Técnico | tecnico@demo.isp | ChangeMe123! |

## Base de datos y migraciones

El repo aún no trae carpeta `packages/database/prisma/migrations/`. Mientras no
exista, el arranque del contenedor sincroniza el esquema con `prisma db push`
(nunca con `--accept-data-loss`). Cuando quieras historial versionado, genera la
migración inicial una vez en tu máquina y súbela al repo:

```bash
cd apps/backend
npx prisma migrate dev --name init --schema=../../packages/database/prisma/schema.prisma
```

A partir de ahí el arranque usa `prisma migrate deploy` automáticamente.

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
apps/backend        NestJS — API REST modular (19 módulos, incl. usuarios)
apps/frontend        React + Vite + Tailwind
packages/database     Prisma schema, migraciones, seed
apps/backend/src/network-drivers   Interfaces RouterProvider / OltProvider + mocks
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
