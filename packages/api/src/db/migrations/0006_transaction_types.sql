CREATE TABLE IF NOT EXISTS "transaction_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "todo_items" ADD COLUMN IF NOT EXISTS "transaction_type" varchar(100);
ALTER TABLE "completions" ADD COLUMN IF NOT EXISTS "transaction_type" varchar(100);
