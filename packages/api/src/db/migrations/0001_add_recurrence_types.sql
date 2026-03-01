-- Add 'yearly' and 'weekly_on_day' to the recurrence_type enum.
-- ADD VALUE IF NOT EXISTS is idempotent and safe to re-run.
ALTER TYPE "public"."recurrence_type" ADD VALUE IF NOT EXISTS 'yearly';
ALTER TYPE "public"."recurrence_type" ADD VALUE IF NOT EXISTS 'weekly_on_day';
