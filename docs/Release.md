# Release Checklist

## Pre-Flight
- [ ] ENV secrets set in platform (no `.env` in images); `WEBHOOK_SECRET` matches deploy config
- [ ] `pnpm dev:up` succeeds from clean checkout (diagnose -> migrate -> seed -> dev)
- [ ] Drizzle migrations applied and rolled forward in staging
- [ ] `scripts/seed.ts` + QA docs (`docs/QA*.md`) refreshed with release data

## Validation
- [ ] `pnpm test:contract` / `pnpm test:idempotency` / `pnpm test:e2e` green
- [ ] Health check script reports 2xx for `/api/overview`, `/api/discover`, `/api/webhooks/solana/tx`
- [ ] Endpoint latency targets met in staging (`/api/overview` p95 < 300 ms, `/api/discover` p95 < 500 ms)

## Observability & Docs
- [ ] Logs include `ingested_total`, `duplicates_total`, `dlq_total`, latency metrics post-deploy
- [ ] Monitoring/alerts updated for new metrics or error conditions
- [ ] `docs/Runbook.md` + `README.md` updated with any new workflows
- [ ] Release notes recorded (link to changelog or Sync Impact summary)
