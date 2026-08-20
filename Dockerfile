# ── Stage 1: Build Client (React 19 + Vite) ──
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
ENV VITE_ANIME_API_BASE_URL="/api"

RUN npm run build

# ── Stage 2: Build Server (Bun + Hono) ──
FROM oven/bun:1 AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN bun install

COPY server/ ./
RUN bun run build

# ── Stage 3: Production Runtime (Single Unified Container) ──
FROM oven/bun:1-alpine
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl bash

# Copy server production dependencies and distribution
COPY server/package*.json ./server/
RUN cd server && bun install --production

COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/drizzle ./server/drizzle

# Copy built static client assets
COPY --from=client-builder /app/client/dist ./client/dist

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Environment settings
ENV PORT=8000
ENV NODE_ENV=production
ENV CLIENT_DIST_PATH=/app/client/dist

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bun", "run", "server/dist/index.js"]
