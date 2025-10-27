CREATE TABLE "dynamic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"wallet_address" varchar(128),
	"status" varchar(20) DEFAULT 'created' NOT NULL,
	"metadata" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dynamic_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "event_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(72) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"signature" varchar(128) NOT NULL,
	"slot" bigint,
	"helius_response" text NOT NULL,
	"error_code" varchar(64),
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_verifications_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "reflect_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(72) NOT NULL,
	"reflect_tip_id" varchar(128),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"amount_sol" numeric(18, 9) NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"reflect_response" text,
	"retry_count" numeric(10, 0) DEFAULT '0' NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reflect_payouts_reflect_tip_id_unique" UNIQUE("reflect_tip_id")
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
DROP INDEX "idx_story";--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "story_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_verifications" ADD CONSTRAINT "event_verifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflect_payouts" ADD CONSTRAINT "reflect_payouts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sessions_status" ON "dynamic_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sessions_session_id" ON "dynamic_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "dynamic_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_verifications_status" ON "event_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_verifications_event" ON "event_verifications" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_verifications_signature" ON "event_verifications" USING btree ("signature");--> statement-breakpoint
CREATE INDEX "idx_payouts_status" ON "reflect_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payouts_event" ON "reflect_payouts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_payouts_reflect_id" ON "reflect_payouts" USING btree ("reflect_tip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_story_date" ON "story_metrics_daily" USING btree ("story_id","date");--> statement-breakpoint
CREATE INDEX "idx_story_metrics_story_id" ON "story_metrics_daily" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_date" ON "story_metrics_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_events_story_id" ON "events" USING btree ("story_id");