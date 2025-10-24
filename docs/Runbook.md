# Runbook

## 🔄 Data Replay & Metrics

### Manual Replay Operations

#### 1. Creators Metrics Replay
```bash
# Dry-run: Preview aggregation without updating database
curl "http://localhost:3001/api/ops/replay?scope=creators&dry-run=true"

# Live: Update host_metrics table with latest calculations
curl "http://localhost:3001/api/ops/replay?scope=creators"
```

**Response Format:**
```json
{
  "success": true,
  "scope": "creators",
  "dryRun": true,
  "result": {
    "ingested_total": 6,
    "duplicates_total": 0,
    "overview_latency_ms": 1302,
    "creators_processed": 4,
    "details": [
      {
        "host_id": "creator-alice",
        "host_name": "Alice Chen",
        "total_tip_value_sol": 6.7,
        "unique_supporters": 3,
        "share_count": 1,
        "stories_count": 2
      }
    ]
  },
  "logs": [
    "2025-10-24T19:09:15.917Z Starting creators replay operation",
    "Dry-run: true",
    "Found 4 hosts, 6 stories, 13 events",
    "Alice Chen: 6.70 SOL, 3 supporters, 1 shares, 2 stories",
    "Dry-run mode: skipping database update",
    "Replay completed in 1302ms"
  ]
}
```

### 2. QA Baseline Comparison

#### Run Replay
```bash
# Perform a dry-run to see current state
curl "http://localhost:3001/api/ops/replay?scope=creators&dry-run=true" | jq '.result.details'

# Get current API response for comparison
curl -s "http://localhost:3001/api/creators" | jq '.items'
```

#### Compare Against Baseline
Save a baseline and compare:
```bash
# Save current baseline
curl "http://localhost:3001/api/creators" | jq '.items' > baseline.json

# Compare after changes
curl "http://localhost:3001/api/creators" | jq '.items' | diff baseline.json -
```

### 3. Data Consistency Validation

#### Event Replay Testing
```bash
# POST duplicates (should be ignored by unique constraint)
curl -X POST http://localhost:3000/api/webhooks/solana/tx \
  -H "Content-Type: application/json" \
  -d '{"signature": "duplicate_test", "type": "tip", "amount": "1.0"}'

# Verify no duplicate entries created
curl "http://localhost:3000/api/overview" | jq '.duplicates_total'
```

## 🔧 Troubleshooting

### Metrics Monitoring
Watch these key metrics in logs:
- `ingested_total`: Number of stories processed
- `duplicates_total`: Duplicate transactions detected
- `overview_latency_ms`: Replay operation duration
- `creators_processed`: Number of hosts with updated metrics

### Common Issues

#### 1. Metrics Drift
**Symptoms**: API totals don't match expectations
**Solution**: Run replay to refresh host_metrics table
```bash
curl "http://localhost:3000/api/ops/replay?scope=creators"
```

#### 2. Aggregation Latency
**Symptoms**: Slow response from `/api/creators`
**Check**: Look for `overview_latency_ms` > 3000ms in logs
**Solution**: Database indexing or query optimization

#### 3. Webhook Secret Issues
**Symptoms**: Webhook failures or missing events
**Check**: `WEBHOOK_SECRET` environment variable matches request header
```bash
echo $WEBHOOK_SECRET
```

### 4. Database Consistency
**Check**: Verify foreign key relationships
```sql
-- Stories without valid hosts
SELECT COUNT(*) FROM stories s LEFT JOIN hosts h ON s.host_id = h.id WHERE h.id IS NULL;

-- Events without valid stories
SELECT COUNT(*) FROM events e LEFT JOIN stories s ON e.story_id = s.id WHERE s.id IS NULL;
```

## 📊 Expected Metrics (Sample Data)

Based on seed data:
- **Total SOL**: ~16.1 SOL across all creators
- **Stories**: 6 total stories across 4 hosts
- **Events**: 13 events (tips + shares)
- **Supporters**: 2-3 unique supporters per creator
- **Processing Time**: < 2000ms for replay

## 🚨 Safety Checks

Before running live operations:
1. Always use `dry-run=true` first
2. Check `ingested_total` matches expected story count
3. Verify `duplicates_total` is 0 (or expected)
4. Ensure `overview_latency_ms` is reasonable (< 5000ms)
5. Compare results against known baseline
