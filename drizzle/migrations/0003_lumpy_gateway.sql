CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'failed');--> statement-breakpoint
CREATE TABLE "event_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tx_signature" varchar(128) NOT NULL,
	"event_id" varchar(72) NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"helius_response" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_verifications_tx_signature_unique" UNIQUE("tx_signature")
);
--> statement-breakpoint
CREATE TABLE "story_metrics_daily" (
	"id" varchar(72) PRIMARY KEY NOT NULL,
	"story_id" varchar(64) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"total_tip_value_sol" numeric(18, 9) DEFAULT '0',
	"unique_supporters" numeric(10, 0) DEFAULT '0',
	"share_count" numeric(10, 0) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "story_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_verifications" ADD CONSTRAINT "event_verifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_verification_tx_signature" ON "event_verifications" USING btree ("tx_signature");--> statement-breakpoint
CREATE INDEX "idx_verification_event" ON "event_verifications" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_verification_status" ON "event_verifications" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_story_date" ON "story_metrics_daily" USING btree ("story_id","date");--> statement-breakpoint
CREATE INDEX "idx_story_metrics_story" ON "story_metrics_daily" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_metrics_date" ON "story_metrics_daily" USING btree ("date");