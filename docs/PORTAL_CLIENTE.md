# Portal del cliente (diseño, no implementado)

El brief original marca esto explícitamente como algo a construir **después**
del sistema administrativo (punto 24: "Crear posteriormente un portal
separado para clientes"). Por eso, en este ciclo de 12 fases se dejó
diseñado pero no construido — para no restarle tiempo a los módulos
administrativos que sí eran el objetivo principal.

## Por qué no es solo "reusar el frontend actual"

El panel administrativo autentica **usuarios del sistema** (`User` + RBAC).
El portal del cliente necesita autenticar **clientes** (`Customer`), que hoy
no tienen contraseña ni sesión propia. Construirlo bien requiere:

1. Agregar `passwordHash` (o autenticación sin contraseña vía OTP a
   email/WhatsApp) al modelo `Customer`.
2. Un `AuthModule` paralelo con su propio guard (`CustomerJwtAuthGuard`),
   separado del de staff — un cliente nunca debe poder alcanzar endpoints
   de `/customers`, `/billing`, etc. con permisos de administrador.
3. Endpoints de solo lectura/acción limitada, expuestos bajo un prefijo
   propio (ej. `/api/v1/portal/*`): ver factura propia, pagar, ver consumo,
   abrir ticket, ver sus tickets, cambiar contraseña, ver su conexión,
   descargar facturas — exactamente lo que pide el punto 24.
4. Un frontend separado (`apps/customer-portal`) con su propio branding
   (más simple, orientado a móvil).

## Recomendación de implementación

Cuando se aborde esta fase:
- Reutilizar `BillingService`, pero envolver sus métodos en endpoints que
  filtren siempre por `req.customer.id` (nunca reciban un `customerId`
  arbitrario del cliente).
- Reutilizar el adapter de `PaymentProvider` ya previsto en la arquitectura
  para que el cliente pueda pagar en línea (Fase 15, no iniciada — requiere
  elegir una pasarela con documentación oficial confirmada).
