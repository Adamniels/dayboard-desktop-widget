CREATE TABLE "display_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active_view" text DEFAULT 'week' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
