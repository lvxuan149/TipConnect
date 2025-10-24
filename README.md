# TipConnect • Skeleton (Solana-only, Blink-first)

> One-page bootstrap: **ENV → Diagnose → Migrate → Seed → Run**

## Quickstart
```bash
# 0) install
pnpm i

# 1) configure env
cp .env.example .env

# 2) one-shot diag + migrate + seed + dev
pnpm dev:up
```

## What you get
- **Contract-first**: `/docs/*` placeholders for Contract/API/QA/Runbook/Release
- **App Router**: `/app` with `page.tsx`, `/discover/page.tsx`, `/creators/*`, and brand styles
- **APIs**: `/app/api/overview/route.ts`, `/app/api/discover/route.ts`, `/app/api/creators/*`, `/app/api/webhooks/solana/tx/route.ts`
- **Drizzle**: `/drizzle/schema.ts`, `/drizzle.config.ts`, `/lib/db.ts`
- **Ops**: `/scripts/diagnose.ts`, `/scripts/seed.ts` with 3 sample creators
- **Tests**: `tests/contract.test.ts`, `tests/idempotency.test.ts`, `tests/e2e.test.ts`
- **Brand**: Tailwind + blue trio `#5CA8FF / #52A2ED / #A3CEFF`

## Commands
```bash
pnpm dev:up          # Diagnose → migrate → seed → dev
pnpm dev             # next dev
pnpm test:contract   # contract/fixtures checks
pnpm test:idempotency
pnpm test:e2e
```

## Pages
- `/` - Homepage
- `/discover` - Discover stories
- `/creators` - Creator directory with avatars and metrics
- `/creators/[id]` - Individual creator profile with stories and reputation

## Endpoints
- `GET /api/overview` : `{ total_sol, supporters, shares }`
- `GET /api/discover` : mock/derived list from `stories` + aggregates
- `GET /api/creators` : `{ items: [{ id, name, avatar_url, headline, total_sol }] }`
- `GET /api/creators/[id]` : `{ id, name, avatar_url, headline, reputation: { total_sol, supporters, shares }, stories: [{ id, title, total_sol }] }`
- `GET /api/creators/[id]/stories` : `{ items: [{ id, title, summary, created_at, metrics: { total_sol, supporters, shares } }] }`
- `POST /api/webhooks/solana/tx` : idempotent ingest (UNIQUE (tx_signature,type))

## Verification
```bash
# Seed sample data
pnpm tsx scripts/seed.ts

# Test API endpoints
curl http://localhost:3000/api/creators
curl http://localhost:3000/api/creators/creator-alice
curl http://localhost:3000/api/creators/creator-alice/stories

# Expected: 3 creators with aggregated metrics
# Alice: 6.7 SOL, 3 supporters, 1 share, 2 stories
# Bob: 5.5 SOL, 2 supporters, 1 share, 1 story
# Carol: 0.8 SOL, 1 supporter, 1 share, 1 story
```

## Notes
- Neon SSL quirk handled via `channel_binding=disable` in `/lib/db.ts`
- Keep **fixed sample txSignatures** in `scripts/seed.ts` and **QA baselines** in `docs/QA.md`
- Sample data includes 3 creators (Alice, Bob, Carol) with stories and tip/share events
