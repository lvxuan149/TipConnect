# PR Review Checklist (Human + AI)

## Contract-First Delivery
- [ ] `/docs/Contract.md` and `/docs/API.md` updated (fields, semantics, constraints)
- [ ] Drizzle migrations included; `scripts/seed.ts` + QA docs in sync
- [ ] Idempotency guard (`UNIQUE(tx_signature, type)`) preserved and tested

## Single-Command Environment
- [ ] `pnpm dev:up` passes end-to-end from clean state
- [ ] `scripts/diagnose.ts` covers new env requirements
- [ ] Any manual setup encoded in `/scripts` and documented in `docs/Runbook.md`

## Deterministic Data Baselines
- [ ] Seeds produce expected metrics (compare against `docs/QA*.md`)
- [ ] Tests consume shared fixtures (no ad-hoc records)
- [ ] Release checklist captures data/backfill steps if required

## Test-Gated Releases
- [ ] `pnpm test:contract` green with new assertions
- [ ] `pnpm test:idempotency` verifies repeat events leave aggregates unchanged
- [ ] `pnpm test:e2e` (or focused story suite) passes

## Blink-First Observability & Performance
- [ ] Logs include `ingested_total`, `duplicates_total`, `dlq_total`, latency metrics
- [ ] Endpoint p95 targets met (`/api/overview` < 300 ms, `/api/discover` < 500 ms, `/api/creators/*` < 400 ms)
- [ ] Monitoring/alerts updated for new fields or failure modes

## Security & Integrations
- [ ] `WEBHOOK_SECRET` validation intact (HMAC or shared secret)
- [ ] External Solana links validate transaction signatures
- [ ] Third-party dependencies reviewed for compatibility with Node 18-20

## Docs & Release
- [ ] README or feature docs updated when UX/API changes surface
- [ ] `docs/Runbook.md` describes replay/rollback steps
- [ ] `docs/Release.md` checklist ticked with owner initials
