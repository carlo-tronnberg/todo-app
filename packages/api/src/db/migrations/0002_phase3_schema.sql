-- Phase 3 schema additions
-- All ALTER TABLE statements use IF NOT EXISTS / column add patterns that are safe to re-run.

-- ── users: profile fields ──────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30);

-- ── todo_lists: default currency ───────────────────────────────────────────────
ALTER TABLE "todo_lists" ADD COLUMN IF NOT EXISTS "default_currency" varchar(3);

-- ── todo_items: timed event fields ────────────────────────────────────────────
ALTER TABLE "todo_items" ADD COLUMN IF NOT EXISTS "start_date" timestamptz;
ALTER TABLE "todo_items" ADD COLUMN IF NOT EXISTS "start_time" varchar(5);
ALTER TABLE "todo_items" ADD COLUMN IF NOT EXISTS "end_time" varchar(5);

-- ── todo_items: amount / currency ─────────────────────────────────────────────
ALTER TABLE "todo_items" ADD COLUMN IF NOT EXISTS "amount" numeric(12,2);
ALTER TABLE "todo_items" ADD COLUMN IF NOT EXISTS "currency" varchar(3);

-- ── item_comments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "item_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL REFERENCES "todo_items"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" varchar(50) NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "entity_id" uuid NOT NULL,
  "summary" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
