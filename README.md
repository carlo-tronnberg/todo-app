# Todo Tracker

A full-stack recurring todo list application with expiry highlighting, completion history, and a calendar view. Built with XP + TDD + BDD methodology.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify + TypeScript + Drizzle ORM |
| Frontend | Vue 3 + Vite + Pinia |
| Database | PostgreSQL |
| Testing | Vitest (unit/integration) + Playwright + Cucumber.js (BDD/E2E) |
| CI/CD | GitHub Actions |
| Deployment | Docker on Asustor NAS |

## Quick Start (Development)

```bash
# 1. Clone and install
git clone <repo>
cd todo-app
npm install

# 2. Start services (Postgres + API + Web)
docker compose -f docker/docker-compose.dev.yml up

# 3. Run migrations (first time or after schema changes)
npm run db:migrate --workspace=packages/api

# 4. Open in browser
open http://localhost:5173
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values before production deployment.

## Development

```bash
# API dev server (hot-reload)
npm run dev:api

# Web dev server (hot-reload)
npm run dev:web

# Run all unit tests
npm test

# Run with coverage
npm run test:coverage --workspace=packages/api

# Lint
npm run lint

# Format
npm run format
```

## Database Migrations

```bash
# Generate migration after schema change
npm run db:generate --workspace=packages/api

# Apply migrations
npm run db:migrate --workspace=packages/api

# Open Drizzle Studio (visual DB browser)
npm run db:studio --workspace=packages/api
```

## Testing

```bash
# Unit tests (no DB required)
npx vitest run packages/api/test/unit

# Integration tests (requires DB)
docker compose -f docker/docker-compose.test.yml up --abort-on-container-exit

# BDD / E2E tests (requires running app)
npm run test:e2e --workspace=packages/web
```

## Production Deployment (Asustor NAS)

```bash
# 1. Pull latest images from registry
docker compose -f docker/docker-compose.prod.yml pull

# 2. Set required env vars (POSTGRES_PASSWORD, JWT_SECRET, etc.)
export POSTGRES_PASSWORD=your-secret
export JWT_SECRET=your-very-long-jwt-secret

# 3. Start
docker compose -f docker/docker-compose.prod.yml up -d

# 4. Run migrations
docker compose -f docker/docker-compose.prod.yml exec api node packages/api/dist/db/migrate.js
```

## Versioning

This project uses [Changesets](https://github.com/changesets/changesets).

```bash
# Add a changeset (describe what changed)
npm run changeset

# Bump versions based on changesets
npm run version-packages
```

## Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add weekly recurrence type
fix: correct month-end date clamping
test: add recurrence unit tests
docs: update README
```

## Urgency Color Logic

| Days until due | Level | Background |
|---------------|-------|-----------|
| > 7 days | Low | Green |
| 4–7 days | Medium | Yellow |
| 1–3 days | High | Orange |
| Today / overdue | Overdue | Red |
| No due date | None | Transparent |
