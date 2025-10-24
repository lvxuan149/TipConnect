# QA Baseline - Discover Module (V0.1)

## Schema Contract
### Core Tables
- **Table Name**: `events` (NOT `blink_events`)
- **Fields**: `id, story_id, type, signer, receiver, amount, tx_signature, timestamp`
- **Unique Key**: `tx_signature UNIQUE`
- **⚠️ Important**: All APIs MUST reference `events` table, not `blink_events`

## API Endpoints
- `GET /api/overview` -> `{ total_sol, supporters, shares }`
- `GET /api/discover` -> `{ items, pagination, meta }` with advanced filtering/sorting

## Expected Results

### Seed Data Summary
```
Creators: 5 (Alice, Bob, Carol, Dave, Eve)
Stories: 8 total
  - Alice: 2 stories, 6.7 SOL, 3 supporters, 1 share
  - Bob: 2 stories, 7.7 SOL, 3 supporters, 2 shares
  - Carol: 2 stories, 2.3 SOL, 2 supporters, 2 shares
  - Dave: 1 story, 5.0 SOL, 1 supporter, 0 shares
  - Eve: 1 story, 3.7 SOL, 1 supporter, 1 share
Total Events: 16 (12 tips, 4 shares)
```

### Overview API Baseline
```
GET /api/overview
Expected: {
  total_sol: 25.4,
  supporters: 10,
  shares: 6
}
```

### Discover API Baselines

#### Default (trending sort)
```
GET /api/discover
Expected order: Alice (6.7), Bob (7.7), Eve (4.07), Dave (5.0), Carol (2.3)
Trending calculation: total_sol * (1 + shares * 0.1 + supporters * 0.05)
```

#### Filter by minimum SOL
```
GET /api/discover?min_sol=5.0
Expected: Stories with total_sol >= 5.0 (Alice, Bob, Dave, Eve)
```

#### Pagination
```
GET /api/discover?limit=2&offset=2
Expected: Return 2 items starting from position 2
```

#### Sorting options
```
?sort=trending  -> by trending score (default)
?sort=newest   -> by created_at (newest first)
?sort=total_sol -> by total_sol (highest first)
```

## Performance Targets
- API latency SLO: `GET /api/discover < 500ms`
- Overview latency SLO: `GET /api/overview < 300ms`
- Pagination efficiency: Support limit=100 maximum
- Sort correctness: All three sort modes return correctly ordered results

## Data Validation
- All tip amounts sum correctly across stories
- Supporter counts are unique per story
- Share counts are accurate
- Trending algorithm consistently ranks popular content