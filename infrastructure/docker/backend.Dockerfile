FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/backend/package.json ./apps/backend/
COPY packages/database ./packages/database
RUN cd apps/backend && npm install
COPY apps/backend ./apps/backend
RUN cd apps/backend && npx prisma generate --schema=../../packages/database/prisma/schema.prisma
RUN cd apps/backend && npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY packages/database ./packages/database
EXPOSE 3000
CMD ["node", "dist/main.js"]
