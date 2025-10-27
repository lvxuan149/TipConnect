CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tx_sig" varchar(128) NOT NULL,
	"from_wallet" varchar(128) NOT NULL,
	"to_wallet" varchar(128) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"symbol" varchar(8) NOT NULL,
	"reflect_quote_id" varchar(128),
	"reflect_tx_id" varchar(128),
	"story_id" varchar(72),
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "transactions_tx_sig_unique" UNIQUE("tx_sig")
);
--> statement-breakpoint
CREATE INDEX "idx_transactions_tx_sig" ON "transactions" USING btree ("tx_sig");--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("status");