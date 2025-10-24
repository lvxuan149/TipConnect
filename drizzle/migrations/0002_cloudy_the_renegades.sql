CREATE TABLE "host_metrics" (
	"host_id" varchar(64) PRIMARY KEY NOT NULL,
	"total_tip_value_sol" numeric(18, 9) DEFAULT '0',
	"unique_supporters" numeric(10, 0) DEFAULT '0',
	"share_count" numeric(10, 0) DEFAULT '0',
	"stories_count" numeric(10, 0) DEFAULT '0',
	"updated_at" timestamp with time zone DEFAULT now()
);
