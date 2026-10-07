CREATE TABLE "visa_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"counsellor_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"country" text NOT NULL,
	"item_key" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visa_checklist" ADD CONSTRAINT "visa_checklist_counsellor_id_user_id_fk" FOREIGN KEY ("counsellor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visa_checklist" ADD CONSTRAINT "visa_checklist_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visa_checklist_counsellor_id_idx" ON "visa_checklist" USING btree ("counsellor_id");--> statement-breakpoint
CREATE INDEX "visa_checklist_student_id_idx" ON "visa_checklist" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visa_checklist_unique_item_idx" ON "visa_checklist" USING btree ("counsellor_id","student_id","country","item_key");