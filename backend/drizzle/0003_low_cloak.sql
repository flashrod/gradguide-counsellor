ALTER TABLE "courses" ALTER COLUMN "duration_months" DROP NOT NULL;--> statement-breakpoint
UPDATE "courses" SET "duration_months" = NULL WHERE "duration_months" = 0;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "min_gpa_scale" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "gpa_scale" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "toefl_overall" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_min_gpa_scale_positive" CHECK ("courses"."min_gpa_scale" IS NULL OR "courses"."min_gpa_scale" > 0);--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_min_toefl_overall_range" CHECK ("courses"."min_toefl_overall" IS NULL OR ("courses"."min_toefl_overall" >= 0 AND "courses"."min_toefl_overall" <= 120));--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_gpa_scale_positive" CHECK ("students"."gpa_scale" IS NULL OR "students"."gpa_scale" > 0);--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_toefl_overall_range" CHECK ("students"."toefl_overall" IS NULL OR ("students"."toefl_overall" >= 0 AND "students"."toefl_overall" <= 120));