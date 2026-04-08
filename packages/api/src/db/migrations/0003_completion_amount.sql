ALTER TABLE "completions" ADD COLUMN IF NOT EXISTS "amount" numeric(12, 2);
ALTER TABLE "completions" ADD COLUMN IF NOT EXISTS "currency" varchar(3);
