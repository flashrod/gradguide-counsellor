CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"counsellor_id" text NOT NULL,
	"student_id" uuid,
	"title" text NOT NULL,
	"due_date" date NOT NULL,
	"note" text,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_counsellor_id_user_id_fk" FOREIGN KEY ("counsellor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deadlines_counsellor_id_idx" ON "deadlines" USING btree ("counsellor_id");--> statement-breakpoint
CREATE INDEX "deadlines_student_id_idx" ON "deadlines" USING btree ("student_id");