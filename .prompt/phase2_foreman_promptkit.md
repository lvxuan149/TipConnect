# TipConnect Phase 2 - AI Foreman Prompt Kit

## Goal
Enable an AI Foreman to independently deliver Phase 2 (Helius Verification + Reflect Payout + Dynamic Walletless) from contract definition through release, with self-healing and QA checkpoints.

## How to Use
1. Provide the downstream AI with the **Phase** name and business context.
2. Feed the relevant prompt block verbatim at each step.
3. After every step, capture:
   - Files changed with brief summaries
   - Commands executed (include results if relevant)
   - QA/acceptance notes

## Execution Order
1. Plan & Contract
2. Scaffold & Data
3. Implement & Self-heal
4. Accept & Replay
5. Release & Ops
6. Continuous Observability

---

## Step 1 - Plan & Contract

### Prompt for `/docs/Contract.md`
````markdown
You are TipConnect's AI Foreman.
Mission: Author `/docs/Contract.md` for Phase 2 (Helius Verification + Reflect Payout + Dynamic Walletless).

Deliverables:
1. Define every new entity with fields, types, constraints, boundary rules:
   - `event_verifications`
   - `reflect_payouts`
   - `dynamic_sessions`
2. For each field specify:
   - Type (TypeScript and SQL perspectives where relevant)
   - Uniqueness / foreign key requirements / nullability
   - Validation or formatting rules
3. Clarify key business semantics:
   - When does `status = verified`?
   - When does `status = settled`?
4. Call out idempotency and replay safeguards:
   - Natural unique keys (`txSignature`, `payoutId`, etc.)
   - DLQ and replay mechanics
5. Produce an **Acceptance Baseline** section containing:
   - 3-5 fixed sample `txSignature` values
   - QA baseline metrics: `overview = { total_sol, supporters, shares }`

Close the document with the validation command:
```bash
pnpm test:contract
```
````

### Prompt for `/docs/API.md`
````markdown
You are TipConnect's AI Foreman.
Mission: Using the freshly minted `Contract.md`, produce `/docs/API.md` for Phase 2.

Include for each endpoint:
- `POST /api/webhooks/solana/tx`
- `POST /api/reflect/payouts`
- `GET  /api/reflect/payouts`
- `GET  /api/ops/payouts/{eventId}`

For every endpoint document:
1. Request JSON example
2. Response JSON example
3. Status codes (200, 202, 404, 422, 500)
4. Idempotency / safety notes

Acceptance conditions to restate:
- Webhook latency < 750 ms
- Reflect settlement < 2 s

Wrap up with a **Verification Steps** section containing:
- Three `curl` demonstrations
- Expected output assertions

Append the validation commands:
```
pnpm test:contract
pnpm test:e2e
```
````

---

## Step 2 - Scaffold & Data
Tasks:
- Extend `drizzle/schema.ts` with the new tables and generate migrations.
- Update `scripts/seed.ts` to insert fixed `txSignature` samples and QA baseline data.

Verification:
- `pnpm dev:up`
- `pnpm test:contract`
- Confirm `/api/overview` returns HTTP 200 in the empty state.

Definition of Done:
- Local services boot successfully and overview baseline matches the contract.

---

## Step 3 - Implement & Self-heal
Tasks:
- Create `lib/helius.ts` for Helius `getTransaction` lookups inserting into `event_verifications`.
- Create `lib/reflect.ts` for Reflect REST integration persisting `reflect_payouts`.
- Create `lib/dynamic.ts` encapsulating Dynamic walletless sessions.
- Update `/app/api/webhooks/solana/tx/route.ts` to validate and write to the database.
- Create `/app/api/reflect/payouts/route.ts` (settlement + status querying).
- Write `tests/webhook-verify.test.ts` and `tests/reflect-payout.test.ts`.

Verification:
- `pnpm test:idempotency`
- `pnpm test:e2e`

Definition of Done:
- Repeated POSTs avoid duplicate rows.
- `/api/overview` metrics return to the QA baseline.

---

## Step 4 - Accept & Replay
Tasks:
- Enhance `/api/ops/replay?limit&dryRun` to surface ingest, duplicates, and DLQ counts.
- Add an Ops card to `/dashboard` summarizing replay health.
- Update `/docs/Runbook.md` with replay instructions and screenshots.

Verification:
- `pnpm test:e2e`
- Confirm `overview` equals the QA baseline.

Definition of Done:
- Replay tooling operates with clear observability and documentation.

---

## Step 5 - Release & Ops
Tasks:
- Produce a health-check script that probes `/api/overview`, `/api/discover`, and `/api/ops/replay`.
- Document a 10 RPS x 30 s load test workflow in `README`.
- Record ingest-to-overview latency P95.

Definition of Done:
- All health checks return 2xx.
- Latency P95 remains below 3 s.

---

## Continuous Observability
Track the following metrics continuously:

| metric | description |
| --- | --- |
| `ingested_total` | Successfully persisted events |
| `duplicates_total` | Deduplicated submissions |
| `dlq_total` | Dead-lettered payloads |
| `overview_latency_ms_p95` | P95 aggregation latency |

---

## Quick Start Prompt
```
按 .phase2_foreman_promptkit 执行 Phase 2
```

This single instruction directs an AI agent to execute Phase 2 end-to-end using the prompts and guardrails in this kit.
