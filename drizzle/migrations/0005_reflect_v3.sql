-- Align indexes with updated schema naming
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_story') THEN
    EXECUTE 'ALTER INDEX idx_story RENAME TO idx_events_story_id';
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- index already renamed or absent
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_story_metrics_story') THEN
    EXECUTE 'ALTER INDEX idx_story_metrics_story RENAME TO idx_story_metrics_story_id';
  ELSIF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_story') THEN
    EXECUTE 'ALTER INDEX idx_story RENAME TO idx_story_metrics_story_id';
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Rename and migrate event_verifications ➜ solana_verifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'event_verifications'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'solana_verifications'
  ) THEN
    ALTER TABLE event_verifications RENAME TO solana_verifications;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'solana_verifications'
  ) THEN
    CREATE TABLE solana_verifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id varchar(72),
      status text NOT NULL DEFAULT 'pending',
      signature text NOT NULL,
      slot bigint,
      helius_response jsonb NOT NULL,
      error_code text,
      verified_at timestamptz,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Ensure column definitions match contract
ALTER TABLE solana_verifications
  ALTER COLUMN status TYPE text,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN signature TYPE text,
  ALTER COLUMN helius_response TYPE jsonb USING helius_response::jsonb,
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_verifications_event_id_unique'
  ) THEN
    ALTER TABLE solana_verifications DROP CONSTRAINT event_verifications_event_id_unique;
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_verifications_event_id_key'
  ) THEN
    ALTER TABLE solana_verifications DROP CONSTRAINT event_verifications_event_id_key;
  END IF;
END $$;

ALTER TABLE solana_verifications
  ALTER COLUMN event_id SET NOT NULL;

-- Reflect payout table remodel
ALTER TABLE reflect_payouts
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS amount numeric(18, 2),
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE reflect_payouts
SET currency = COALESCE(currency, 'USDC');

UPDATE reflect_payouts
SET amount = COALESCE(amount, amount_usd, amount_sol, 0);

UPDATE reflect_payouts
SET attempt_count = COALESCE(attempt_count, retry_count::int, 0);

UPDATE reflect_payouts
SET last_error = COALESCE(last_error, error_message);

UPDATE reflect_payouts
SET updated_at = COALESCE(updated_at, processed_at, created_at, now());

ALTER TABLE reflect_payouts
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN attempt_count SET NOT NULL,
  ALTER COLUMN attempt_count SET DEFAULT 0,
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE reflect_payouts
  DROP COLUMN IF EXISTS amount_sol,
  DROP COLUMN IF EXISTS amount_usd,
  DROP COLUMN IF EXISTS reflect_response,
  DROP COLUMN IF EXISTS retry_count,
  DROP COLUMN IF EXISTS error_message,
  DROP COLUMN IF EXISTS processed_at;

