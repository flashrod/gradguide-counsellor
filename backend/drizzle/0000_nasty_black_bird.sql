CREATE TYPE "public"."recommendation_action" AS ENUM('recommended', 'shortlisted', 'rejected', 'discussed');--> statement-breakpoint
CREATE TABLE "counselling_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"counsellor_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"name" text NOT NULL,
	"degree_type" text NOT NULL,
	"field" text NOT NULL,
	"duration_months" integer NOT NULL,
	"tuition_amount" numeric(12, 2) NOT NULL,
	"tuition_currency" varchar(3) NOT NULL,
	"living_cost_amount" numeric(12, 2),
	"living_cost_currency" varchar(3),
	"intakes" text[] DEFAULT '{}'::text[] NOT NULL,
	"min_gpa" numeric(3, 2),
	"min_ielts_overall" numeric(2, 1),
	"min_ielts_writing" numeric(2, 1),
	"min_ielts_reading" numeric(2, 1),
	"min_ielts_listening" numeric(2, 1),
	"min_ielts_speaking" numeric(2, 1),
	"work_experience_required" boolean DEFAULT false NOT NULL,
	"career_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"academic_backgrounds" text[] DEFAULT '{}'::text[] NOT NULL,
	"eligibility_notes" text DEFAULT '' NOT NULL,
	"source_url" text NOT NULL,
	"source_name" text NOT NULL,
	"last_verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"action" "recommendation_action" DEFAULT 'recommended' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_recommendations_score_range" CHECK ("session_recommendations"."score" >= 0 AND "session_recommendations"."score" <= 100)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"degree" text NOT NULL,
	"field" text NOT NULL,
	"gpa" numeric(3, 2) NOT NULL,
	"ielts_overall" numeric(2, 1),
	"ielts_writing" numeric(2, 1),
	"ielts_reading" numeric(2, 1),
	"ielts_listening" numeric(2, 1),
	"ielts_speaking" numeric(2, 1),
	"budget_amount" numeric(12, 2) NOT NULL,
	"budget_currency" varchar(3) NOT NULL,
	"career_goal" text,
	"preferred_countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"preferred_intake" text,
	"work_experience_months" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"website_url" text NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "counselling_sessions" ADD CONSTRAINT "counselling_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_session_id_counselling_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."counselling_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD CONSTRAINT "session_recommendations_session_id_counselling_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."counselling_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD CONSTRAINT "session_recommendations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "counselling_sessions_student_id_idx" ON "counselling_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_university_name_unique" ON "courses" USING btree ("university_id","name");--> statement-breakpoint
CREATE INDEX "courses_university_id_idx" ON "courses" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "courses_field_idx" ON "courses" USING btree ("field");--> statement-breakpoint
CREATE INDEX "session_notes_session_id_idx" ON "session_notes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_recommendations_session_id_idx" ON "session_recommendations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_recommendations_course_id_idx" ON "session_recommendations" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "students_name_idx" ON "students" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "universities_name_unique" ON "universities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "universities_country_idx" ON "universities" USING btree ("country");