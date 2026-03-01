# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
docker compose -f docker/docker-compose.dev.yml up   # full stack (API + DB)
npm run dev:api                                       # API hot-reload only
npm run dev:web                                       # Vite dev server only
```

### Testing

Run tests from the **package directory** — the root `npm test` mixes environments and may behave unexpectedly.

```bash
# Frontend unit tests
cd packages/web
npx vitest run                          # all tests
npx vitest run --coverage               # with coverage
npx vitest run test/unit/views/App.test.ts          # single file
npx vitest run -t "renders the heading"             # by test name

# Backend unit + integration tests
cd packages/api
npx vitest run
npx vitest run test/unit/services/recurrence.service.test.ts
npx vitest run -t "advance due date"

# E2E (requires running stack)
cd packages/web && npm run test:e2e
```

### Linting & Formatting

```bash
npm run lint          # ESLint across all packages (0 warnings allowed)
npm run lint:fix      # auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check (used in CI)
```

### Database (from packages/api)

```bash
npm run db:generate   # generate Drizzle migrations from schema changes
npm run db:migrate    # apply migrations
npm run db:push       # push schema directly (dev only)
npm run db:studio     # open Drizzle Studio UI
```

## Architecture

### File structure

```
packages/
  api/src/
    app.ts                        # buildApp() — registers plugins + routes
    index.ts                      # server entrypoint
    db/
      schema.ts                   # Drizzle table definitions + relations
      index.ts                    # db connection instance
    plugins/
      auth.ts                     # @fastify/jwt registration
      cors.ts
      db.ts                       # decorates fastify with db instance
    routes/
      auth/index.ts               # register, login, GET/PATCH /auth/me, PATCH /auth/password
      lists/index.ts              # CRUD /api/lists + /api/lists/:id/items
      items/index.ts              # PATCH/DELETE /api/items/:id, complete, duplicate, comments
      completions/index.ts        # DELETE /api/completions/:id (undo)
      comments/index.ts           # DELETE /api/comments/:commentId
      calendar/index.ts           # GET /api/calendar/range, /api/calendar/ical
      audit/index.ts              # GET /api/audit (paginated, user-scoped)
    services/
      auth.service.ts             # register, login, updateProfile, changePassword
      lists.service.ts
      items.service.ts            # duplicate, move (listId in update)
      comments.service.ts         # findByItemId, create, delete
      audit.service.ts            # log(), findByUser() — called fire-and-forget in routes
      calendar.service.ts
      recurrence.service.ts       # pure domain logic — no I/O, fully unit-tested
    utils/
      date.ts
      hash.ts                     # bcrypt helpers
      ics.ts                      # iCalendar file generation
    types/index.ts

  web/src/
    App.vue                       # root: nav bar, theme toggle, router-view
    main.ts
    router/index.ts               # route definitions + beforeEach auth guard
    api/
      client.ts                   # Axios instance with JWT + 401 interceptors
      auth.api.ts
      lists.api.ts
      items.api.ts
      calendar.api.ts
    stores/
      auth.store.ts
      lists.store.ts
      items.store.ts
    composables/
      useUrgency.ts               # computeUrgencyLevel(dueDate) → urgency string
      useTheme.ts                 # dark/light toggle, persisted to localStorage
    components/todo/
      TodoItem.vue                # renders one item with urgency, recurrence, actions
    views/
      DashboardView.vue           # list of todo lists, create/edit/delete
      ListDetailView.vue          # items within a list, comments, move-to-list
      CalendarView.vue            # monthly grid; modals use <Teleport to="body">
      HistoryView.vue             # completion log for one item, undo support
      ProfileView.vue             # personal details form + change-password section
      AuditLogView.vue            # change log table, load-more pagination
      LoginView.vue
      RegisterView.vue
    types/index.ts

  web/test/unit/                  # mirrors src/ structure
  web/e2e/                        # Cucumber + Playwright BDD scenarios

docker/
  docker-compose.dev.yml
  docker-compose.test.yml
  docker-compose.prod.yml
.github/workflows/
  ci.yml                          # lint + test
  cd.yml                          # build + push to ghcr.io
```

---

### Backend (packages/api)

**Entry:** `src/index.ts` calls `buildApp()` from `src/app.ts`, which registers all Fastify plugins and routes. Integration tests import `buildApp()` directly.

**Auth:** JWT via `@fastify/jwt`. Token is verified by a `preHandler` hook on protected routes. Passwords hashed with `bcryptjs`.

**Database:** Drizzle ORM + PostgreSQL. Schema is in `src/db/schema.ts`. Seven tables:

- `users` (firstName, lastName, phone) → `todo_lists` (defaultCurrency) → `todo_items` (amount, currency, startDate/Time, endTime) ← `recurrence_rules`
- `todo_items` → `completions` (snapshot `due_date` at completion time for accurate history)
- `item_comments` (itemId FK, userId FK, content)
- `audit_logs` (userId FK, action, entityType, entityId, summary, createdAt)

**Audit logging:** `AuditService.log()` is called fire-and-forget (`.catch(() => {})`) at the end of each mutating route handler so it never blocks or surfaces errors to the client.

**Recurrence types** (pgEnum `recurrence_type`): `none`, `daily`, `weekly`, `weekly_on_day`, `monthly_on_day`, `custom_days`, `yearly`. Weekly bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64.

**Key domain logic:** `src/services/recurrence.service.ts` — pure functions, no I/O, fully unit-tested. Handles advancing `dueDate` after a completion and computing urgency.

**Urgency levels:** `overdue` (≤0 days), `high` (1–3d), `medium` (4–7d), `low` (>7d), `none` (no due date).

---

### Frontend (packages/web)

**State:** Three Pinia stores using composition API style (`defineStore('name', () => { ... })`):

- `auth.store.ts` — token persisted in `localStorage`, `isAuthenticated` computed from `token`
- `lists.store.ts` — array of `TodoList[]`, exposes `fetchLists/createList/updateList/deleteList`
- `items.store.ts` — `itemsByList: Record<string, TodoItem[]>`, keyed by list ID

**HTTP:** Axios instance in `src/api/client.ts` with two interceptors:

1. Request — attaches `Authorization: Bearer <token>` from `localStorage`
2. Response — on 401, clears token and redirects to `/login`

**Routing** (`src/router/index.ts`): `beforeEach` guard uses `meta: { public: true }` to distinguish public routes (login, register). Unauthenticated users are sent to Login; authenticated users hitting public routes are redirected to Dashboard.

**Teleport pattern:** Modals, the month picker, and hover popups in `CalendarView.vue` all use `<Teleport to="body">`. They are rendered as siblings of the app root in the DOM, not as descendants.

---

### Frontend testing conventions

**Mock hoisting** — required for any variable referenced inside a `vi.mock()` factory:

```ts
const { mockApi } = vi.hoisted(() => ({ mockApi: { method: vi.fn() } }))
vi.mock('../../../src/api/foo.api', () => ({ fooApi: mockApi }))
```

**Pinia** — create a fresh store per test:

```ts
beforeEach(() => setActivePinia(createPinia()))
```

**Teleport / modals** — mount with `attachTo: document.body`; use `afterEach` to unmount so stale Teleport slots don't accumulate across tests:

```ts
let currentWrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  currentWrapper?.unmount()
  currentWrapper = null
})

// Query teleported content via document.body, not wrapper
expect(document.body.textContent).toContain('Modal heading')
const btn = document.body.querySelector('.modal-actions button.btn-secondary') as HTMLElement
btn.click()
await flushPromises()
```

**Dispatching form submit inside a Teleport:**

```ts
const form = document.body.querySelector('form') as HTMLFormElement
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
await flushPromises()
```

**Router warnings in tests** — `[Vue Router warn]: No match found` appears when a `router-link` target or the memory history's initial `/` path has no matching route. Fix by adding stub routes for all targets the component links to, or a catch-all redirect:

```ts
{ path: '/:pathMatch(.*)*', redirect: '/the-view-under-test' }
```

**Passing `null` in test overrides** — `??` treats `null` as nullish and returns the default. Use explicit key presence check when `null` is a valid override:

```ts
summary: 'summary' in overrides ? overrides.summary : 'default value'
```

**Coverage thresholds:** statements 90%, lines 90%, functions 85%, branches 80% (both packages).
