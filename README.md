# Todo Tracker

A full-stack recurring todo list application with expiry highlighting, completion history, a calendar view with iCal export, and dark mode. Built with XP + TDD + BDD methodology.

## Stack

| Layer      | Technology                                                     |
| ---------- | -------------------------------------------------------------- |
| Backend    | Fastify + TypeScript + Drizzle ORM                             |
| Frontend   | Vue 3 + Vite + Pinia                                           |
| Database   | PostgreSQL                                                     |
| Testing    | Vitest (unit/integration) + Playwright + Cucumber.js (BDD/E2E) |
| CI/CD      | GitHub Actions                                                 |
| Deployment | Docker on Asustor NAS                                          |

## Features

- **Todo lists** — create and manage multiple named lists, each with an optional description
- **Todo items** — title, description, due date, and optional per-item colour override
- **Recurrence** — seven recurrence types (see table below); due date advances automatically on completion
- **Urgency highlighting** — items colour-coded by days until due (see table below)
- **Completion history** — every completion is recorded with a timestamp, optional note, and a snapshot of the due date at the time of completion
- **Undo completion** — delete the most recent completion to revert an item's due date back to what it was
- **Calendar view** — monthly grid showing upcoming items and completions; items are colour-coded by urgency, completed items are shown with a strikethrough ✓ chip; **Today** button snaps back to the current month; click the month/year heading to jump to any month via a quick picker
- **Create from calendar** — add items directly from the calendar, with a list selector and due date pre-filled from the clicked day; `dayOfMonth` / `weekdayMask` defaults are auto-derived from the selected due date when choosing `monthly_on_day` or `weekly_on_day` recurrence
- **Hover detail popup** — hover over any calendar chip to see the full title, list, description, recurrence info, and last completion time
- **iCal / Google Calendar** — subscribe to a live `.ics` feed or download a snapshot; works with Google Calendar, Apple Calendar, and Outlook
- **Completion history view** — per-item history page showing all past completions with the ability to undo any of them
- **Dark mode** — default dark theme, togglable via the theme button; preference persisted in `localStorage`
- **JWT auth** — access + refresh token pair, bcrypt password hashing

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

Copy `.env.example` to `.env` and fill in the values before first run or production deployment. Key variables:

| Variable             | Description                                      |
| -------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                     |
| `JWT_SECRET`         | Secret used to sign access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens               |
| `POSTGRES_PASSWORD`  | Password for the `postgres` user (Docker)        |
| `VITE_API_BASE_URL`  | Full URL of the API as seen from the browser     |
| `CORS_ORIGIN`        | Allowed CORS origin for the API                  |

## Development

```bash
# API dev server (hot-reload via ts-node-dev)
npm run dev:api

# Web dev server (Vite HMR)
npm run dev:web

# Run all unit + integration tests
npm test

# Run with coverage report (API — target: 100% all metrics)
npm run test:coverage --workspace=packages/api

# Run with coverage report (Web — target: 100% all metrics)
npm run test:coverage --workspace=packages/web

# Lint (ESLint)
npm run lint

# Format (Prettier)
npm run format
```

## Database Migrations

```bash
# Generate a new migration after editing packages/api/src/db/schema.ts
npm run db:generate --workspace=packages/api

# Apply pending migrations
npm run db:migrate --workspace=packages/api

# Open Drizzle Studio (visual DB browser at http://localhost:4983)
npm run db:studio --workspace=packages/api
```

> **Note:** After adding a new value to a PostgreSQL enum (e.g. a new recurrence type), you must apply the corresponding hand-written migration in `packages/api/src/db/migrations/` before the API will accept the new value. Drizzle cannot `ALTER TYPE … ADD VALUE` automatically for enums.

## Testing

```bash
# Unit tests — no DB required (recurrence logic, utils, etc.)
npx vitest run packages/api/test/unit

# Integration tests — spins up a real Postgres via Docker
docker compose -f docker/docker-compose.test.yml up --abort-on-container-exit

# BDD / E2E tests — requires a running full stack
npm run test:e2e --workspace=packages/web
```

The recurrence service (`packages/api/src/services/recurrence.service.ts`) is pure domain logic with no database dependency — it is the primary TDD anchor for this project.

## API Routes

### Auth

| Method | Path                 | Description                                     |
| ------ | -------------------- | ----------------------------------------------- |
| `POST` | `/api/auth/register` | Create a new account                            |
| `POST` | `/api/auth/login`    | Sign in, returns access + refresh tokens        |
| `POST` | `/api/auth/refresh`  | Exchange a refresh token for a new access token |
| `GET`  | `/api/auth/me`       | Return the authenticated user's profile         |

### Lists

| Method   | Path             | Description                        |
| -------- | ---------------- | ---------------------------------- |
| `GET`    | `/api/lists`     | Get all lists for the current user |
| `POST`   | `/api/lists`     | Create a new list                  |
| `GET`    | `/api/lists/:id` | Get a single list                  |
| `PATCH`  | `/api/lists/:id` | Update title / description         |
| `DELETE` | `/api/lists/:id` | Delete a list and all its items    |

### Items

| Method   | Path                         | Description                                                     |
| -------- | ---------------------------- | --------------------------------------------------------------- |
| `GET`    | `/api/lists/:id/items`       | Get all active (non-archived) items in a list                   |
| `POST`   | `/api/lists/:id/items`       | Create an item; optionally include a `recurrenceRule`           |
| `GET`    | `/api/items/:id`             | Get a single item (with recurrence rule)                        |
| `PATCH`  | `/api/items/:id`             | Update an item; pass `recurrenceRule: null` to clear recurrence |
| `DELETE` | `/api/items/:id`             | Archive an item (soft delete)                                   |
| `POST`   | `/api/items/:id/complete`    | Record a completion; advances due date for recurring items      |
| `GET`    | `/api/items/:id/completions` | List all completions for an item                                |

### Completions

| Method   | Path                   | Description                                                                             |
| -------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `DELETE` | `/api/completions/:id` | Undo a completion; reverts due date if it was the latest completion of a recurring item |

### Calendar

| Method | Path                        | Description                                                                                  |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| `GET`  | `/api/calendar?from=&to=`   | Returns `{ items, completions }` for the given date range                                    |
| `GET`  | `/api/calendar/ical?token=` | Returns a live `.ics` file; authenticates via JWT query param for calendar app compatibility |

## Database Schema

```
users
  └── todo_lists (user_id → users.id)
        └── todo_items (list_id → todo_lists.id)
              ├── recurrence_rules (recurrence_rule_id → recurrence_rules.id)
              └── completions (item_id → todo_items.id)
```

| Table              | Key Columns                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `users`            | `id`, `email`, `username`, `password_hash`                                                                               |
| `todo_lists`       | `id`, `user_id`, `title`, `description`                                                                                  |
| `todo_items`       | `id`, `list_id`, `recurrence_rule_id`, `title`, `description`, `due_date`, `color_override`, `is_archived`, `sort_order` |
| `recurrence_rules` | `id`, `type`, `day_of_month`, `interval_days`, `weekday_mask`, `anchor_date`                                             |
| `completions`      | `id`, `item_id`, `due_date_snapshot`, `completed_at`, `note`                                                             |

## Recurrence Types

| Type                   | `recurrenceRule.type` | Extra fields               | Behaviour                                                               |
| ---------------------- | --------------------- | -------------------------- | ----------------------------------------------------------------------- |
| No recurrence          | `none`                | —                          | Due date never advances                                                 |
| Daily                  | `daily`               | —                          | Advances by 1 day on completion                                         |
| Weekly (single day)    | `weekly_on_day`       | `weekdayMask` (single bit) | Next occurrence on the same weekday, next week                          |
| Weekly (multiple days) | `weekly`              | `weekdayMask` (bitmask)    | Next occurrence on the earliest selected weekday after today            |
| Monthly on day         | `monthly_on_day`      | `dayOfMonth` (1–31)        | Next occurrence on the same day of the next month; clamped to month end |
| Every N days           | `custom_days`         | `intervalDays`             | Advances by N days on completion                                        |
| Yearly                 | `yearly`              | —                          | Advances by 1 year; Feb 29 clamps to Feb 28 on non-leap years           |

**Weekday bitmask convention** (used by `weekly` and `weekly_on_day`):

| Bit value | Day       |
| --------- | --------- |
| `1`       | Sunday    |
| `2`       | Monday    |
| `4`       | Tuesday   |
| `8`       | Wednesday |
| `16`      | Thursday  |
| `32`      | Friday    |
| `64`      | Saturday  |

Example: `weekdayMask = 42` (= 2 + 8 + 32) means Mon + Wed + Fri.

## Urgency Levels

Items in list views and the calendar are colour-coded based on the number of days until their due date.

| Days until due  | Level   | Colour      |
| --------------- | ------- | ----------- |
| > 7 days        | Low     | Green       |
| 4–7 days        | Medium  | Yellow      |
| 1–3 days        | High    | Orange      |
| Today / overdue | Overdue | Red         |
| No due date     | None    | Transparent |

## Frontend Routes

| Path               | View             | Description                                                                                                   |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `/login`           | `LoginView`      | Sign-in page (public)                                                                                         |
| `/register`        | `RegisterView`   | Account creation (public)                                                                                     |
| `/`                | `DashboardView`  | All lists; create / delete lists                                                                              |
| `/lists/:listId`   | `ListDetailView` | Items in a list; add / edit / complete / archive items                                                        |
| `/calendar`        | `CalendarView`   | Monthly calendar grid; Today button; month/year picker; create items from any cell; hover popups; iCal export |
| `/history/:itemId` | `HistoryView`    | Completion history for an item with undo support                                                              |

Navigation is context-aware: if you open a list from the calendar, the back button returns to the calendar rather than the dashboard.

## Production Deployment (Asustor NAS)

```bash
# 1. Pull latest images from registry
docker compose -f docker/docker-compose.prod.yml pull

# 2. Set required env vars
export POSTGRES_PASSWORD=your-secret
export JWT_SECRET=your-very-long-jwt-secret
export JWT_REFRESH_SECRET=your-other-long-secret

# 3. Start
docker compose -f docker/docker-compose.prod.yml up -d

# 4. Run migrations
docker compose -f docker/docker-compose.prod.yml exec api node packages/api/dist/db/migrate.js
```

## Versioning

This project uses [Changesets](https://github.com/changesets/changesets).

```bash
# Describe what changed (creates a changeset file)
npm run changeset

# Bump versions based on pending changesets
npm run version-packages
```

## Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add yearly recurrence type
fix: revert due date correctly on undo for recurring items
test: add recurrence unit tests for weekly_on_day
docs: update README
```
