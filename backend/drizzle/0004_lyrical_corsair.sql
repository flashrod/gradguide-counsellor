CREATE TABLE "session_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"courses" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"field" text NOT NULL,
	"priority" text NOT NULL,
	"impact_score" integer NOT NULL,
	"affected_count" integer NOT NULL,
	"affected_percentage" integer NOT NULL,
	"question" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"overrides" jsonb NOT NULL,
	"baseline" jsonb NOT NULL,
	"simulated" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_recommendations" DROP CONSTRAINT "session_recommendations_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "counselling_sessions" ADD COLUMN "student_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD COLUMN "rank" integer;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD COLUMN "eligibility" text;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD COLUMN "breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD COLUMN "evidence" jsonb;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD COLUMN "course_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD COLUMN "estimated_cost" jsonb;--> statement-breakpoint
ALTER TABLE "session_comparisons" ADD CONSTRAINT "session_comparisons_session_id_counselling_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."counselling_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_session_id_counselling_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."counselling_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_simulations" ADD CONSTRAINT "session_simulations_session_id_counselling_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."counselling_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_comparisons_session_id_idx" ON "session_comparisons" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_questions_session_id_idx" ON "session_questions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_simulations_session_id_idx" ON "session_simulations" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD CONSTRAINT "session_recommendations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;