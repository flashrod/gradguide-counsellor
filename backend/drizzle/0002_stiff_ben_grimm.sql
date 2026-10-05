ALTER TABLE "courses" ALTER COLUMN "tuition_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "tuition_currency" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "tuition_period" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "min_toefl_overall" integer;