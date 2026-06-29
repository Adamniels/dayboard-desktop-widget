CREATE TABLE "google_calendar" (
	"id" text PRIMARY KEY NOT NULL,
	"summary" text NOT NULL,
	"selected" boolean DEFAULT true NOT NULL,
	"primary_write" boolean DEFAULT false NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_email" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text,
	"access_token_expires_at" timestamp with time zone,
	"scope" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "google_etag" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "google_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "deleted_at" timestamp with time zone;