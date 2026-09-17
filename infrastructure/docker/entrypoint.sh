#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL no esta definida. El backend no puede arrancar."
  exit 1
fi

echo "[entrypoint] Aplicando migraciones..."
npx prisma migrate deploy --schema=../../packages/database/prisma/schema.prisma

echo "[entrypoint] Iniciando backend..."
exec node dist/main.js
