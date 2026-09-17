FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/frontend/package.json ./
RUN npm install
COPY apps/frontend .
# En Railway (o cualquier host que construya este Dockerfile), define la
# variable VITE_API_URL en el servicio del frontend con la URL pública del
# backend + "/api/v1". Vite la incrusta en el HTML/JS en este paso de build,
# no se puede cambiar después sin reconstruir la imagen.
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
