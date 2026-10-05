CREATE TYPE "public"."cost_period" AS ENUM('annual', 'total', 'semester', 'monthly');--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "tuition_period" "cost_period";--> statement-breakpoint
UPDATE "courses" SET "tuition_period" = 'annual' WHERE "tuition_period" IS NULL;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "tuition_period" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "living_cost_period" "cost_period";--> statement-breakpoint
UPDATE "courses" SET "living_cost_period" = 'annual' WHERE "living_cost_amount" IS NOT NULL AND "living_cost_period" IS NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "work_experience_months_required" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_work_experience_months_non_negative" CHECK ("courses"."work_experience_months_required" >= 0);--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_living_cost_amount_period_consistency" CHECK (("courses"."living_cost_amount" IS NULL) = ("courses"."living_cost_period" IS NULL));