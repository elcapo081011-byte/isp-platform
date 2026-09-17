# Puesta en producción

## Checklist antes de salir a producción

1. **Variables de entorno**: reemplazar todos los valores de `.env.example` —
   especialmente `JWT_SECRET`, `DEVICE_CREDENTIALS_ENCRYPTION_KEY` y las
   contraseñas de Postgres — por valores generados aleatoriamente y únicos.
2. **HTTPS**: colocar el stack detrás de un proxy con TLS real (Nginx +
   Let's Encrypt, o un balanceador gestionado). El `nginx.conf` incluido es
   de desarrollo/LAN; en producción se le agrega el bloque `ssl_certificate`.
3. **Usuarios demo**: cambiar o eliminar los tres usuarios `isDemo: true` del
   seed antes de dar acceso a personal real.
4. **Backups**: confirmar que `BACKUP_DIR` apunta a un volumen persistente
   (no efímero del contenedor) y, idealmente, replicar esos archivos a
   almacenamiento externo (S3, otro servidor) — el sistema los genera
   localmente pero no los sube a ningún lado todavía.
5. **SMTP**: completar `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` en `.env`
   para que las notificaciones por correo (Fase 9) se envíen de verdad.
6. **OLT reales**: para cada OLT, registrar su fabricante/modelo real. Si es
   `GENERIC_SNMP`, completar `vendorOidMap` con los OIDs de su documentación
   oficial. Si es Huawei/ZTE/FiberHome, ese driver aún no está implementado —
   ver `docs/ARQUITECTURA.md`.
7. **Migraciones**: correr `npm run migration:deploy` (no `migration:dev`)
   en producción.
8. **Monitoreo de logs**: los logs de NestJS van a stdout — conectar el
   contenedor a tu stack de logging (ej. Loki, CloudWatch, etc.).

## Escalabilidad (punto 38 del brief)

- Todas las listas paginan (`skip`/`take` en Prisma).
- Los campos de búsqueda frecuente tienen índices (`@@index` en el schema).
- El monitoreo corre en un cron cada 5 minutos, no por request — no genera
  carga proporcional al tráfico de usuarios.
- Redis está disponible en `docker-compose.yml` para cuando el volumen de
  notificaciones o el número de dispositivos monitoreados justifique mover
  esas tareas a una cola (BullMQ ya es una dependencia natural a agregar
  sin rediseñar nada — los adapters ya están desacoplados).

## Qué NO está terminado (honesto, no lo escondemos)

- Drivers OLT específicos por fabricante (Huawei/ZTE/FiberHome) — requieren
  acceso a su documentación oficial de MIB/API antes de implementarse.
- Subida de backups a almacenamiento externo.
- Portal del cliente (ver `docs/PORTAL_CLIENTE.md`) — quedó como scaffold
  mínimo, no como producto terminado, tal como el brief lo marcó como un
  ítem "posterior" (punto 24).
- Canales de notificación WhatsApp/SMS (la interfaz existe, falta conectar
  un proveedor con documentación oficial).
