CREATE TABLE "timer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"mode" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"phase" text,
	"ends_at" timestamp with time zone,
	"remaining_ms" integer,
	"work_minutes" integer,
	"break_minutes" integer,
	"long_break_minutes" integer,
	"cycles_target" integer,
	"cycles_done" integer DEFAULT 0 NOT NULL,
	"chime" boolean DEFAULT false NOT NULL,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminder" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder" ADD COLUMN "last_fired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "timer" ADD CONSTRAINT "timer_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;