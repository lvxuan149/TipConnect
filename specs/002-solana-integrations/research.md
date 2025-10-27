# Research – Solana Transaction & Reflect Integration

## Decision 1: Persist verification & payout state in dedicated tables
- **Decision**: Create two new tables via Drizzle migrations:
  - `event_verifications` keyed by `event_id` (FK to `events.id`) with fields: `status` (`pending|verified|failed`), `slot`, `signature`, `helius_response` (JSON), `verified_at`.
  - `reflect_payouts` keyed by `event_id` with fields: `status` (`pending|queued|settled|failed`), `payout_id`, `currency`, `amount`, `attempt_count`, `last_error`, `updated_at`.
- **Rationale**: Keeps existing `events` schema immutable for backward compatibility while allowing multiple verification or payout attempts per event. JSON column stores Helius payload deterministically for QA snapshots.
- **Alternatives considered**:
  1. **Inline columns on `events`** – rejected because multiple verification attempts would require arrays or overwrite history.
  2. **Single combined table** – rejected to avoid coupling verification lifecycle with payout retries.

## Decision 2: Verification flow powered by Helius `getTransaction` RPC
- **Decision**: Use Helius JSON-RPC endpoint (`https://rpc.helius.xyz/?api-key=$HELIUS_API_KEY`) calling `getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })`. Treat `meta.err === null` and `transaction.message.accountKeys` containing expected receiver as verified.
- **Rationale**: Helius RPC mirrors Solana mainnet data with high reliability and supports deterministic validation without adding new webhook products. We can reuse existing signer/receiver values in seeds for QA.
- **Alternatives considered**:
  1. **Helius webhook callbacks** – rejected because we already own the webhook entry point and need synchronous acknowledgement.
  2. **Solana public RPC** – rejected due to rate limits and lack of enhanced reliability compared with Helius subscription already budgeted.

## Decision 3: Reflect API integration via REST client in `lib/reflect.ts`
- **Decision**: Call Reflect's REST API using service key env vars: `REFLECT_API_BASE` (default `https://api.reflect.money/v1`) and `REFLECT_API_KEY`. Primary flows: `POST /tips/settle` with `{eventId, solAmount}` and poll `GET /tips/{id}` for payout status.
- **Rationale**: REST integration keeps dependencies minimal (no extra SDK) and can be mocked locally with static handlers for deterministic dev/test seeds.
- **Alternatives considered**:
  1. **Adopt Reflect’s Node SDK (beta)** – rejected to avoid adding unmaintained dependency and preserve bundle size.
  2. **Manual settlement without Reflect** – rejected because user input explicitly requires Reflect stablecoin payouts.

## Decision 4: Dynamic SDK walletless onboarding via server-side token + client widget
- **Decision**: Add Dynamic web SDK (`@dynamic-labs/sdk-react-core`) for client onboarding and server-side session creation with env vars `DYNAMIC_ENV_ID` and `DYNAMIC_API_KEY`. Walletless supporters sign typed payload; server exchanges session for custodial wallet that still emits Solana signature for webhook ingestion.
- **Rationale**: Aligns with Dynamic’s recommended walletless flow, integrates smoothly with Next.js App Router using providers, and maintains deterministic seeds by mocking session IDs for tests.
- **Alternatives considered**:
  1. **Manual email/pass OTP flow** – rejected because Dynamic already solves wallet abstraction.
  2. **Custodial wallet managed in-house** – rejected due to security and compliance cost.

## Decision 5: Deterministic seed & QA strategy
- **Decision**: Extend `scripts/seed.ts` to insert:
  - Verified records in `event_verifications` with static slots and serialized Helius responses (stored JSON string).
  - Matching `reflect_payouts` rows with deterministic statuses (`settled` for majority, `failed` example).
  - Document expected aggregates in `docs/QA.md` and `docs/QA_Discover.md`, ensuring tests read from these seeds.
- **Rationale**: Keeps reproducibility across environments; JSON responses can be simplified snapshots with stable fields.
- **Alternatives considered**:
  1. **Randomized verification timestamps** – rejected for breaking deterministic QA.
  2. **Omitting payout seeds** – rejected because acceptance tests need baseline data.

## Decision 6: Observability & SLO targets
- **Decision**: Instrument structured logs in webhook & payout services with fields `{eventId, signature, verificationStatus, payoutStatus, latencyMs}` and expose metrics via `/api/ops/replay` extension. Set SLOs: webhook verification ack < 750 ms p95, Reflect settlement polling < 2 s p95.
- **Rationale**: Provides measurable guardrails aligned with user requirement of trustworthy, timely gratitude flows.
- **Alternatives considered**:
  1. **Rely on existing minimal console logs** – rejected as insufficient for ops traceability.
  2. **Adopt full metrics stack (Prometheus)** – deferred; structured logs + existing dashboards suffice for this iteration.

## Decision 7: Local development & `pnpm dev:up` support
- **Decision**: Provide mock adapters toggled via env flags `USE_REFLECT_SANDBOX`, `USE_HELIUS_SANDBOX`, `USE_DYNAMIC_SANDBOX`. `scripts/diagnose.ts` validates presence of either real keys or sandbox flags; `pnpm dev:up` seeds deterministic mock data.
- **Rationale**: Maintains single-command setup without forcing contributors to provision production credentials.
- **Alternatives considered**:
  1. **Require personal API keys** – rejected due to onboarding friction.
  2. **Skip validation** – violates constitution’s Single-Command principle.
