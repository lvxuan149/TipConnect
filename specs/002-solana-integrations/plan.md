# Implementation Plan: Solana Transaction & Reflect Integration

**Branch**: `002-solana-integrations` | **Date**: 2025-10-27 | **Spec**: `/specs/002-solana-integrations/spec.md`  
**Input**: Feature specification from `/specs/002-solana-integrations/spec.md`

## Summary

Deliver Phase 2 capabilities so TipConnect ingests Solana gratitude tips end-to-end with verification and settlement. We must (1) validate webhook payloads against Helius before persisting, (2) orchestrate Reflect stablecoin payouts for those verified tips, and (3) support walletless supporters through Dynamic SDK while keeping dashboards, contracts, and seeds deterministic.

## Technical Context

- Base stack: Node.js 18.18–20.x, Next.js 14 App Router, TypeScript 5.9, Drizzle ORM over Neon Postgres, SWR-driven UI, Vitest test suites.  
- Data persistence will add `event_verifications`, `reflect_payouts`, and `dynamic_sessions` tables (Drizzle migrations) to track verification, payout, and walletless onboarding lifecycles.  
- Webhook validation flow: existing `app/api/webhooks/solana/tx` enqueues verification using Helius `getTransaction` RPC (JSON-RPC request to `https://rpc.helius.xyz/?api-key=$HELIUS_API_KEY`), marking rows `pending → verified|failed`.  
- Reflect integration: REST client in `lib/reflect.ts` calling `POST /tips/settle` and `GET /tips/{id}` with env vars `REFLECT_API_BASE`, `REFLECT_API_KEY`.  
- Dynamic walletless: client provider via `@dynamic-labs/sdk-react-core` plus server-side session helper in `lib/dynamic.ts`; env vars `DYNAMIC_ENV_ID`, `DYNAMIC_API_KEY`.  
- Seeds & QA: deterministic fixtures extend `scripts/seed.ts`, `docs/QA*.md`, and tests with static verification/payout JSON snapshots.  
- Observability: structured logs capturing `{eventId, verificationStatus, payoutStatus, latencyMs}` and extended `/api/ops/replay` metrics with SLOs (webhook p95 < 750 ms, payout polling p95 < 2 s).

## Constitution Check

- [x] **Contract-First Delivery** — Planned updates: `/docs/Contract.md` (new sections for verification & payout lifecycle), `/docs/API.md` (documented endpoints per `contracts/solana-reflect.yaml`), migrations adding new tables, and seed/QA adjustments captured in research & data-model docs.  
- [x] **Single-Command Environment Health** — `pnpm dev:up` flow documented in `quickstart.md`, with sandbox flags + new env validations slated for `scripts/diagnose.ts`.  
- [x] **Deterministic Data Baselines** — Seeds and QA docs will include fixed verification/payout fixtures; decisions detailed in `research.md` and `data-model.md`.  
- [x] **Test-Gated Releases** — Each user story maps to failing tests: webhook verification contract test, payout retry/idempotency test, Dynamic onboarding e2e; to be authored before implementation.  
- [x] **Blink-First Observability & Performance** — Structured logging + extended `/api/ops/replay` metrics defined, with SLO targets recorded in `research.md`.

All gates satisfied for planning; implementation must follow documented actions.

## Project Structure

### Documentation (this feature)

```text
specs/002-solana-integrations/
├── plan.md            # implementation plan (this file)
├── research.md        # Phase 0 output
├── data-model.md      # Phase 1 output
├── quickstart.md      # Phase 1 output
├── contracts/         # API/schema contracts generated in Phase 1
└── tasks.md           # Phase 2 execution tasks (created later)
```

### Source Code (repository root)

```text
app/                      # Next.js routes & API handlers
components/               # Shared UI
lib/                      # Utilities (db, external service clients)
drizzle/                  # Schema & migrations
scripts/                  # diagnose, seed, helper scripts
tests/                    # Vitest suites (contract/idempotency/e2e)
docs/                     # Contract, API, QA, Runbook, Release references
```

**Structure Decision**: Expect to touch `app/api/webhooks/solana/tx`, introduce new API routes for payout status if required, extend `lib/` with Helius/Reflect/Dynamic clients, add Drizzle migrations under `drizzle/`, update `scripts/diagnose.ts`, `scripts/seed.ts`, and documentation/test assets per constitution.

## Complexity Tracking

> None yet. Populate only if constitution violations must be justified.
