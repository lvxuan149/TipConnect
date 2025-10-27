import { pgTable, text, varchar, numeric, bigint, timestamp, index, uniqueIndex, uuid, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const stories = pgTable("stories", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").default(""),
  cover_url: text("cover_url"),
  host_id: varchar("host_id", { length: 64 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const hosts = pgTable("hosts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  avatar_url: text("avatar_url"),
  headline: text("headline"),
  web2_links: text("web2_links").default("[]"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const events = pgTable("events", {
  id: varchar("id", { length: 72 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: varchar("type", { length: 16 }).notNull(), // "tip" | "airdrop" | "guess" | "vote" | "share"
  signer: varchar("signer", { length: 128 }).notNull(),
  receiver: varchar("receiver", { length: 128 }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 9 }).default("0"),
  tx_signature: varchar("tx_signature", { length: 128 }).notNull(),
  story_id: varchar("story_id", { length: 64 }),
  timestamp: bigint("timestamp", { mode: "number" }).notNull()
}, (t) => ({
  byTxType: uniqueIndex("uniq_tx_type").on(t.tx_signature, t.type),
  byStory: index("idx_events_story_id").on(t.story_id)
}));

// Keep blinkEvents for backward compatibility
export const blinkEvents = events;

// Derived host metrics snapshot table
export const hostMetrics = pgTable("host_metrics", {
  host_id: varchar("host_id", { length: 64 }).primaryKey(),
  total_tip_value_sol: numeric("total_tip_value_sol", { precision: 18, scale: 9 }).default("0"),
  unique_supporters: numeric("unique_supporters", { precision: 10, scale: 0 }).default("0"),
  share_count: numeric("share_count", { precision: 10, scale: 0 }).default("0"),
  stories_count: numeric("stories_count", { precision: 10, scale: 0 }).default("0"),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Daily story metrics aggregation for discover page
export const storyMetricsDaily = pgTable("story_metrics_daily", {
  id: varchar("id", { length: 72 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  story_id: varchar("story_id", { length: 64 }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  total_tip_value_sol: numeric("total_tip_value_sol", { precision: 18, scale: 9 }).default("0"),
  unique_supporters: numeric("unique_supporters", { precision: 10, scale: 0 }).default("0"),
  share_count: numeric("share_count", { precision: 10, scale: 0 }).default("0"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  byStoryDate: uniqueIndex("uniq_story_date").on(t.story_id, t.date),
  byStory: index("idx_story_metrics_story").on(t.story_id),
  byDate: index("idx_story_metrics_date").on(t.date)
}));

// Verification status enum for event_verifications
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "failed"]);

// Event verification tracking table
export const eventVerifications = pgTable("event_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tx_signature: varchar("tx_signature", { length: 128 }).notNull().unique(),
  event_id: varchar("event_id", { length: 72 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
  verified_at: timestamp("verified_at", { withTimezone: true }),
  helius_response: jsonb("helius_response"),
  error_message: text("error_message"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  bySignature: uniqueIndex("uniq_verification_tx_signature").on(t.tx_signature),
  byEvent: index("idx_verification_event").on(t.event_id),
  byStatus: index("idx_verification_status").on(t.verification_status)
}));

// Solana integration tables for 002-solana-integrations feature

export const solanaVerifications = pgTable("solana_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 72 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, verified, failed
  signature: text("signature").notNull(),
  slot: bigint("slot", { mode: "number" }),
  heliusResponse: jsonb("helius_response").notNull(),
  errorCode: text("error_code"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  byStatus: index("idx_verifications_status").on(t.status),
  byEvent: index("idx_verifications_event").on(t.eventId),
  bySignature: index("idx_verifications_signature").on(t.signature)
}));

export const eventVerifications = solanaVerifications;

export const reflectPayouts = pgTable("reflect_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 72 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  reflectTipId: text("reflect_tip_id").unique(),
  status: text("status").notNull().default("pending"), // pending, queued, settled, failed, cancelled
  currency: text("currency").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  byStatus: index("idx_payouts_status").on(t.status),
  byEvent: index("idx_payouts_event").on(t.eventId),
  byReflectId: index("idx_payouts_reflect_id").on(t.reflectTipId)
}));

export const dynamicSessions = pgTable("dynamic_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }),
  walletAddress: varchar("wallet_address", { length: 128 }),
  status: varchar("status", { length: 20 }).notNull().default("created"), // created, active, completed, expired
  metadata: text("metadata"), // JSON string
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  byStatus: index("idx_sessions_status").on(t.status),
  bySessionId: index("idx_sessions_session_id").on(t.sessionId),
  byExpiresAt: index("idx_sessions_expires_at").on(t.expiresAt)
}));

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  txSig: varchar("tx_sig", { length: 128 }).notNull().unique(),
  fromWallet: varchar("from_wallet", { length: 128 }).notNull(),
  toWallet: varchar("to_wallet", { length: 128 }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  symbol: varchar("symbol", { length: 8 }).notNull(),
  reflectQuoteId: varchar("reflect_quote_id", { length: 128 }),
  reflectTxId: varchar("reflect_tx_id", { length: 128 }),
  storyId: varchar("story_id", { length: 72 }),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  bySignature: index("idx_transactions_tx_sig").on(t.txSig),
  byStatus: index("idx_transactions_status").on(t.status)
}));
