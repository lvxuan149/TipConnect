# PR Review Checklist (Human + AI)

## Contract & Schema
- [ ] Contract.md updated (fields, semantics, constraints)
- [ ] Migrations included; seeds & tests synchronized
- [ ] Idempotency: UNIQUE(tx_signature, type) intact

## Security & Integrity
- [ ] WEBHOOK_SECRET validated (HMAC or shared secret)
- [ ] All external links verify tx signatures (explorer)

## Observability
- [ ] Logs include: ingested_total, duplicates_total, dlq_total, overview_latency_ms_p95
- [ ] /scripts/diagnose.ts OK; /scripts/seed.ts OK

## Performance
- [ ] Devnet ingest→overview P95 < 3000ms
- [ ] test:e2e green

## Docs
- [ ] README updated
- [ ] Runbook has replay steps & screenshots
- [ ] Release checklist ticked
