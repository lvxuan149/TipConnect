# Quickstart – Solana Transaction & Reflect Integration

## Prerequisites
- Node.js 20.x (per repo engines) and `pnpm` 10.
- Solana RPC access via Helius: obtain `HELIUS_API_KEY`.
- Reflect API sandbox key: `REFLECT_API_KEY`.
- Dynamic walletless sandbox credentials: `DYNAMIC_ENV_ID`, `DYNAMIC_API_KEY`.
- Optional: Set `USE_*_SANDBOX=true` flags when using local mocks.

## Environment Variables
Create/extend `.env`:

```bash
WEBHOOK_SECRET=dev-shared-secret
HELIUS_API_KEY=helius-sandbox-key
REFLECT_API_BASE=https://api.reflect.money/v1
REFLECT_API_KEY=reflect-sandbox-key
DYNAMIC_ENV_ID=dynamic-env-id
DYNAMIC_API_KEY=dynamic-api-key
USE_HELIUS_SANDBOX=true
USE_REFLECT_SANDBOX=true
USE_DYNAMIC_SANDBOX=true
```

Sandbox flags instruct the system to use mock adapters seeded with deterministic fixtures while keeping diagnosis strict about required vars.

## One-Command Setup
Run:

```bash
pnpm dev:up
```

This executes:
1. `.specify/scripts/bash/setup-plan.sh` (already run during planning).
2. `tsx scripts/diagnose.ts` – updated to ensure all new env vars or sandbox toggles are present.
3. `drizzle-kit generate && drizzle-kit migrate` – applies new tables (`event_verifications`, `reflect_payouts`, `dynamic_sessions`).
4. `tsx scripts/seed.ts` – seeds deterministic verification & payout records plus Dynamic sessions.
5. `next dev` – launches the development server with updated APIs.

## Local Testing

- Contract tests: `pnpm test:contract`
- Idempotency tests: `pnpm test:idempotency`
- E2E/API smoke: `pnpm test:e2e`
- Optional verification worker tests (to be added) should cover:
  - Successful Helius verification flow (mocked RPC response).
  - Reflect payout retries and failure handling.
  - Dynamic walletless onboarding lifecycle.

## Manual Verification Steps
1. Hit `POST /api/webhooks/solana/tx` with sandbox signature using `WEBHOOK_SECRET`. Confirm `202 Accepted`.
2. Check `/api/ops/payouts/{eventId}` to see `verification.status=verified`, `payout.status=queued/settled`.
3. Review `/api/reflect/payouts` for aggregated payout list.
4. Validate UI flow:
   - Use Dynamic SDK widget on `/story/[id]` (to be implemented) to initiate walletless tip.
   - Ensure resulting event surfaces in `/discover` with verified totals only.

## Deployment Checklist
- Ensure production `.env` contains real Helius/Reflect/Dynamic credentials.
- Update `docs/Contract.md`, `docs/API.md`, `docs/QA*.md`, and `docs/Runbook.md` with final payloads and procedures.
- Confirm observability dashboards ingest structured logs for verification latency and payout retries.
