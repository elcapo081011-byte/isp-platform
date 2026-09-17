FROM node:20-alpine AS builder
WORKDIR /app
# Prisma necesita OpenSSL para detectar qué motor de query usar. Sin esto,
# en Alpine falla la deteccion de libssl y carga un engine incorrecto.
RUN apk add --no-cache openssl libc6-compat
COPY apps/backend/package.json ./apps/backend/
COPY packages/database ./packages/database
RUN cd apps/backend && npm install
COPY apps/backend ./apps/backend
RUN cd apps/backend && npx prisma generate --schema=../../packages/database/prisma/schema.prisma
RUN cd apps/backend && npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client openssl libc6-compat
# Se preserva la MISMA estructura relativa que en el monorepo (apps/backend
# + packages/database) para que los scripts npm (migration:deploy, seed)
# funcionen igual aquí que en desarrollo local, sin rutas distintas por entorno.
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY packages/database ./packages/database
# packages/database no tiene su propio node_modules (no es un workspace npm
# real); este symlink deja que scripts como seed.ts, que viven ahí pero usan
# @prisma/client y bcrypt, los resuelvan subiendo hacia apps/backend/node_modules.
RUN ln -sfn /app/apps/backend/node_modules /app/packages/database/node_modules
COPY infrastructure/docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
WORKDIR /app/apps/backend
EXPOSE 3000
# Las migraciones se aplican al arrancar, antes de levantar Nest, para que
# el $connect() de PrismaService encuentre el esquema ya creado.
CMD ["/app/entrypoint.sh"]
