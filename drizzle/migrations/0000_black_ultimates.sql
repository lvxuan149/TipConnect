CREATE TABLE "events" (
	"id" varchar(72) PRIMARY KEY NOT NULL,
	"type" varchar(16) NOT NULL,
	"signer" varchar(128) NOT NULL,
	"receiver" varchar(128) NOT NULL,
	"amount" numeric(18, 9) DEFAULT '0',
	"tx_signature" varchar(128) NOT NULL,
	"story_id" varchar(64),
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hosts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"web2_links" text DEFAULT '[]',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '',
	"host_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tx_type" ON "events" USING btree ("tx_signature","type");--> statement-breakpoint
CREATE INDEX "idx_story" ON "events" USING btree ("story_id");