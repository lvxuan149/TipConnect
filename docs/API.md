# API (Minimal)

- `GET /api/overview` -> `{ total_sol, supporters, shares }`
- `GET /api/discover` -> `{ items: [{ id, title, summary, total_sol, supporters, shares }] }`
- `GET /api/creators` -> `{ items: [{ id, name, avatar_url, headline, total_sol }] }`
- `GET /api/creators/[id]` -> `{ id, name, avatar_url, headline, stories: [{ id, title, total_sol }] }`
- `GET /api/story/[id]` -> `{ id, title, description, creator: { id, name }, totals: { sol, supporters, shares }, blinks: BlinkAction[] }`
- `POST /api/blinks/create` (draft) -> `{ ok } // accepts BlinkAction payload; schema TBD`
- `GET /api/ops/replay?fromSlot=&limit=&dryRun=` -> `{ ok, processed, dryRun }`
- `POST /api/webhooks/solana/tx` (header: x-webhook-secret) -> `{ ok, idempotent }`
pnpm tsx scripts/seed.ts


# TipConnect • API Spec（Creators Module • V0.1）

---

## 1. GET /api/creators
> 返回主理人列表（聚合指标 + 基本资料）

### Query
| 参数 | 类型 | 说明 |
|------|------|------|
| search | string? | 名称搜索 |
| sort | enum('total','supporters','shares') | 排序字段 |
| order | enum('asc','desc') | 排序方向 |
| cursor | string? | 分页游标 |

### Response
```json
{
  "items": [
    {
      "id": "c_001",

      "display_name": "Wenwen",
      "avatar_url": "https://...",
      "metrics": {
        "total_tip_value_sol": 3.2,
        "unique_supporters": 14,
        "share_count": 5
      },
      "story_count": 6
    }
  ],
  "nextCursor": null
}

# TipConnect • API Spec（Discover Module • V0.1）

## 1. GET /api/overview
返回协议级汇总。

Response:
```json
{
  "total_sol": 123.45,
  "total_supporters": 678,
  "total_shares": 901
}

### Cache
Cache: s-maxage=30, stale-while-revalidate=300

## 2. GET /api/discover

Query:
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| actionType | enum | all | 分类过滤 |
| sort | enum | latest | 排序 |
| range | enum | 7d | 时间窗 |
| cursor | string? | null | 分页游标 |
| limit | number | 12 | 每页条数 |

Response:
```json
{
  "items": [
    {
      "id": "story_abc",
      "title": "Thank you, Taipei Builders Meetup",
      "summary": "Gratitude for volunteers.",
      "host": { "id": "host_1", "name": "Alice", "avatarUrl": null },
      "actionTypes": ["tip","share"],
      "metrics": { "sol": 3.2, "supporters": 14, "shares": 5, "lastActivityAt": "2025-10-24T15:12Z" },
      "blink": { "cta": "Share Blink", "url": "https://blink.tipconnect.so/s/story_abc" }
    }
  ],
  "nextCursor": null
}

### Cache

Cache: s-maxage=15, stale-while-revalidate=120

