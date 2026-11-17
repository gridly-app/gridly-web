FROM oven/bun:1.4.4-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY index.html tsconfig.app.json vite.config.ts ./
COPY tsconfig.app.json ./tsconfig.json
COPY src/ ./src/
ARG VITE_API_BASE_URL
ARG VITE_ADMIN_GUEST_LINK_REPLAY
RUN bun run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
