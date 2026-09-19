#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL no esta definida. El backend no puede arrancar."
  exit 1
fi

SCHEMA=../../packages/database/prisma/schema.prisma
MIGRATIONS_DIR=../../packages/database/prisma/migrations

# `prisma migrate deploy` sin carpeta de migraciones NO crea ninguna tabla y
# termina "con éxito", dejando la base vacía. Si el proyecto aún no tiene
# migraciones versionadas, se sincroniza el esquema directamente con `db push`
# (nunca usa --accept-data-loss: si un cambio pudiera borrar datos, falla).
if [ -d "$MIGRATIONS_DIR" ] && [ -n "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  echo "[entrypoint] Aplicando migraciones versionadas..."
  npx prisma migrate deploy --schema="$SCHEMA"
else
  echo "[entrypoint] No hay migraciones versionadas; sincronizando esquema (prisma db push)..."
  npx prisma db push --skip-generate --schema="$SCHEMA"
fi

echo "[entrypoint] Iniciando backend..."
exec node dist/main.js
