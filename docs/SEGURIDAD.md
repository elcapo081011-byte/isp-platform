# Seguridad

- **Contraseñas de usuarios**: hash con bcrypt (factor 12), nunca en texto plano.
- **Credenciales de dispositivos** (MikroTik, OLT/SNMP): encriptadas con
  AES-256-GCM (`CredentialsEncryptionService`) usando `DEVICE_CREDENTIALS_ENCRYPTION_KEY`.
- **JWT**: access token de 15 minutos, refresh token de 7 días con rotación
  (cada refresh invalida el anterior) y hash del refresh token en BD.
- **Rate limiting**: `@nestjs/throttler` global (100 req/min) + límite
  específico de 5 intentos/min en `/auth/login`.
- **RBAC**: permisos granulares por endpoint vía `@RequirePermissions(...)`.
- **Validación de entrada**: `class-validator` + `ValidationPipe` global con
  `whitelist: true` (rechaza campos no declarados) — mitiga mass assignment.
- **Cabeceras HTTP**: `helmet()` en todos los responses.
- **Errores**: filtro global que nunca expone stack traces al cliente.
- **Auditoría**: toda acción sensible (crear/editar/suspender/eliminar) se
  registra con usuario, IP, entidad, antes/después.
- **API Keys**: se almacenan como hash SHA-256; la key completa solo se
  muestra una vez, al crearla.

## Pendiente antes de producción real

- CSRF: no aplica mientras el frontend use tokens Bearer en `Authorization`
  (no cookies) — si en el futuro se cambia a cookies de sesión, agregar
  protección CSRF explícita.
- Rotación periódica de `JWT_SECRET` y `DEVICE_CREDENTIALS_ENCRYPTION_KEY`
  con un plan de re-encriptación de credenciales existentes.
- Auditoría de dependencias (`npm audit`) como parte del pipeline de CI.
