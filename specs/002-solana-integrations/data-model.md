# Data Model – Solana Transaction & Reflect Integration

## Overview
This feature introduces verification and payout lifecycle tracking for each Solana tip event while supporting walletless Dynamic onboarding. We extend the existing schema with dedicated tables and relationships to keep `events` immutable and analytics deterministic.

## Entities

### 1. `event_verifications`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID (PK) | default `crypto.randomUUID()` | Unique verification record (1-to-1 with event). |
| `event_id` | VARCHAR(72) | FK → `events.id`, unique | Links verification to webhook event. |
| `status` | ENUM (`pending`, `verified`, `failed`) | NOT NULL | Reflects latest Helius verification result. |
| `signature` | VARCHAR(128) | NOT NULL | Copy of Solana transaction signature for lookup. |
| `slot` | BIGINT | NULLABLE | Slot confirmed by Helius. |
| `helius_response` | JSONB | NOT NULL | Serialized subset of Helius `getTransaction` response (deterministic). |
| `error_code` | VARCHAR(64) | NULLABLE | Populated when `status = failed`. |
| `verified_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | For metrics/latency calculations. |
| `created_at` | TIMESTAMP WITH TIME ZONE | default `now()` | Audit trail. |

**Relationships & Rules**
- Enforce unique `event_id` to prevent duplicate verification rows.
- Webhook inserts row with `pending` status, background worker updates to `verified` or `failed`.
- API consumers must treat `status` as source of truth before surfacing tip aggregates.

### 2. `reflect_payouts`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID (PK) | default `crypto.randomUUID()` | Unique payout attempt. |
| `event_id` | VARCHAR(72) | FK → `events.id` | Links payout to verified event (`status` must be `verified`). |
| `reflect_tip_id` | VARCHAR(128) | UNIQUE | External Reflect identifier for idempotency. |
| `status` | ENUM (`pending`, `queued`, `settled`, `failed`, `cancelled`) | NOT NULL | Mirrors Reflect lifecycle. |
| `currency` | VARCHAR(16) | NOT NULL | Stablecoin ticker (e.g., `USDC`). |
| `amount` | NUMERIC(18, 2) | NOT NULL | Stablecoin settlement amount. |
| `attempt_count` | INTEGER | default `0` | Retry counter. |
| `last_error` | TEXT | NULLABLE | Last Reflect error message. |
| `updated_at` | TIMESTAMP WITH TIME ZONE | default `now()` | Auto-updated on each status change. |
| `created_at` | TIMESTAMP WITH TIME ZONE | default `now()` | Audit trail. |

**Relationships & Rules**
- 1-to-1 between event and payout for MVP; future multi-settlement support can remove uniqueness.
- Inserted only after verification succeeds.
- Enforce check constraint: `amount >= 0`.

### 3. `dynamic_sessions`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID (PK) | default `crypto.randomUUID()` | Internal session identifier. |
| `external_id` | VARCHAR(128) | UNIQUE | Dynamic SDK session ID. |
| `user_identifier` | VARCHAR(128) | NULLABLE | Email/alias provided by Dynamic. |
| `custodial_wallet` | VARCHAR(128) | NULLABLE | Assigned wallet address. |
| `status` | ENUM (`initiated`, `wallet_created`, `failed`) | NOT NULL | Flow state. |
| `created_at` | TIMESTAMP WITH TIME ZONE | default `now()` | Audit trail. |
| `updated_at` | TIMESTAMP WITH TIME ZONE | default `now()` | For cleanup/expiry. |

**Relationships & Rules**
- Linked indirectly via `events.signer` when Dynamic issues custodial wallet.
- Enables reconciliation between onboarding experience and recorded tips.

## Derived Views & Aggregations
- Update materialized host metrics to join `event_verifications` filtering only `status = verified` to avoid counting pending/failed tips.
- Adjust overview queries to sum only verified events; include payout completion counts for dashboards.
- Add deterministic QA fixtures referencing the new tables with static IDs for integration tests.

## Validation & Enforcement
- Webhook handler must reject storing tips unless a verification row is created (status `pending`).
- Background job updates `event_verifications` and triggers payout creation when `status = verified`.
- Seeds populate all three entities with consistent IDs ensuring tests can assert `verified`/`settled` states.

## State Transitions
1. **Incoming tip**: `event_verifications.status = pending`.
2. **Helius success**: `status → verified`, record slot & response, enqueue payout.
3. **Helius failure**: `status → failed`, populate `error_code`, skip payout.
4. **Payout queue**: `reflect_payouts.status → queued` then `settled` or `failed`.
5. **Dynamic session**: `status` transitions from `initiated` → `wallet_created` when custodial wallet assigned; failure logs remain for troubleshooting.
