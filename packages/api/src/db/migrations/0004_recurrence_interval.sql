ALTER TABLE "recurrence_rules" ADD COLUMN IF NOT EXISTS "interval" integer DEFAULT 1 NOT NULL;
