# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/

# Install all workspace deps (including devDeps for build)
RUN npm ci --workspace=packages/api

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
RUN npm ci --workspace=packages/api --omit=dev

# Copy compiled output
COPY --from=builder /app/packages/api/dist ./packages/api/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "packages/api/dist/index.js"]
