CREATE TABLE IF NOT EXISTS "list_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "list_id" uuid NOT NULL REFERENCES "todo_lists"("id") ON DELETE CASCADE,
  "shared_with_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "shared_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(20) NOT NULL DEFAULT 'editor',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE("list_id", "shared_with_user_id")
);
