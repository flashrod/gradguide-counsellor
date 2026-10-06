CREATE TABLE "resume_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"counsellor_id" text NOT NULL,
	"student_id" uuid,
	"file_name" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"page_count" integer NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"error_message" text,
	"raw_text" text DEFAULT '' NOT NULL,
	"extraction" jsonb,
	"confirmed_field_sources" jsonb,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "gpa" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "budget_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "budget_currency" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resume_extractions" ADD CONSTRAINT "resume_extractions_counsellor_id_user_id_fk" FOREIGN KEY ("counsellor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_extractions" ADD CONSTRAINT "resume_extractions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resume_extractions_counsellor_id_idx" ON "resume_extractions" USING btree ("counsellor_id");--> statement-breakpoint
CREATE INDEX "resume_extractions_student_id_idx" ON "resume_extractions" USING btree ("student_id");