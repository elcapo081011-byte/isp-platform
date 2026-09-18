# Roadmap de implementación

Cada fase se entregó como código real y ejecutable, verificado con
`tsc --noEmit`, `vite build` y una suite de tests unitarios — nunca como
maqueta visual.

- [x] **Fase 1** — Arquitectura, base de datos base, autenticación, RBAC, auditoría, dashboard live.
- [x] **Fase 2** — Clientes, planes, servicios. CRUD completo + perfil de cliente.
- [x] **Fase 3** — Facturación, pagos, PDF de factura, motor de suspensión automática (cron diario).
- [x] **Fase 4** — MikroTik real (`node-routeros-v2`, comandos RouterOS API oficiales), PPPoE.
- [x] **Fase 5** — OLT: modelos Olt/Onu, driver SNMP genérico real (OIDs MIB-II estándar);
      drivers propietarios (Huawei/ZTE/FiberHome) declarados explícitamente no soportados
      hasta verificar su documentación oficial — nunca simulados como si funcionaran.
- [x] **Fase 6** — NAP (registro para el mapa de red).
- [x] **Fase 7** — Monitoreo NOC: WebSocket en vivo + cron de chequeo cada 5 min + alertas.
- [x] **Fase 8** — Tickets (con comentarios/prioridad/estado) e Inventario (con movimientos).
- [x] **Fase 9** — Notificaciones (canal Email real vía SMTP) + API Keys para integraciones.
- [x] **Fase 10** — Hardening (Helmet, rate limiting, cifrado de credenciales) + backups
      automáticos/manuales con `pg_dump` real y retención configurable.
- [x] **Fase 11** — Suite de tests unitarios (auth, RBAC, suspensión/reactivación de clientes).
- [x] **Fase 12** — Documentación completa (`docs/ARQUITECTURA.md`, `docs/PRODUCCION.md`,
      `docs/SEGURIDAD.md`), diseño del portal del cliente (`docs/PORTAL_CLIENTE.md` — no
      implementado, tal como el brief original lo pidió como paso posterior).
- [x] **Fase 13** — Facturación SaaS de la plataforma (lo que el dueño de la plataforma le
      cobra a cada ISP, no lo que cada ISP le cobra a sus clientes): escalones de precio fijo
      mensual calcados de los planes reales de WispHub (gratis hasta 15 clientes, luego
      escalones de pago por rango de clientes — ver `PLATFORM_TIERS` en
      `platform-billing.service.ts`), facturación mensual automática según el escalón que
      corresponda, vencimiento y suspensión automática de la cuenta por falta de pago (mismo
      motor de cron que la Fase 3), y reactivación al pagar. El único método de pago real hoy
      es manual (el dueño de la plataforma marca la factura como pagada); conectar un gateway
      automático (Stripe/MercadoPago/etc.) queda pendiente de definir país y proveedor —
      declarado explícitamente, no simulado.

## Lo que queda fuera de este ciclo, honestamente

- Drivers OLT específicos por fabricante (requieren documentación oficial del cliente).
- Portal del cliente (diseñado, no construido — ver `docs/PORTAL_CLIENTE.md`).
- Canales WhatsApp/SMS (interfaz lista, falta un proveedor con documentación oficial).
- Subida de backups a almacenamiento externo (hoy quedan en el volumen local).
- Pasarela de pago automática para cobrar la suscripción SaaS (Fase 13 deja el motor de
  facturación/suspensión listo; falta conectar Stripe/MercadoPago/dLocal u otro proveedor
  una vez definido país y moneda).
