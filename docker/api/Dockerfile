# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/

# Install all workspace deps (including devDeps for build)
RUN HUSKY=0 npm ci --workspace=packages/api

# Copy source
COPY packages/api ./packages/api

# Compile TypeScript
RUN npm run build --workspace=packages/api

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace manifest for production install
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/

# Install production dependencies only
RUN HUSKY=0 npm ci --workspace=packages/api --omit=dev

# Copy compiled output
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Copy migration SQL files (drizzle-orm migrator reads them at runtime)
COPY --from=builder /app/packages/api/src/db/migrations ./packages/api/src/db/migrations

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT||3000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "packages/api/dist/index.js"]
