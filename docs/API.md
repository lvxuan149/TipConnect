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

---

## Section: Helius Verification API

### 1️⃣ Endpoint: /api/webhooks/helius

**Purpose:** 接收 Helius 推送的交易事件（Webhook Source）

#### Method: POST

#### Auth: HMAC-SHA256 校验头（**x-helius-signature**）

#### ✅ Request Sample

```json
{
  "type": "transaction",
  "signature": "3hbS2gRjPn1RyGgYYA9m4TkmR1q7XG9c12mRzcxVRU5qQp6A9LDy6Ac",
  "accountData": {
    "from": "A1d5sFaAb3bF...d6",
    "to": "B8eD7cFeEaC1...zQ",
    "amount": 0.2,
    "slot": 31782345
  }
}
```

#### ✅ Response Sample

```json
{
  "status": "accepted",
  "message": "transaction stored and verification pending"
}
```

#### 🔁 Processing Logic

1. Validate Helius webhook signature
2. Insert into event_verifications (pending)
3. Trigger background worker /jobs/verifyTx.ts
4. Worker fetches transaction detail from Helius API
5. Update verification_status (verified or failed)

### 2️⃣ Background Worker: /jobs/verifyTx.ts

#### Purpose: **异步拉取交易详情并校验签名**

#### Frequency: **每 5 分钟或由 webhook 触发**

#### Pseudocode

```typescript
import { getHeliusTx } from "@/lib/helius";
import { db } from "@/db";
import { eventVerifications } from "@/db/schema";

export async function verifyTx(signature: string) {
  const tx = await getHeliusTx(signature);
  if (!tx) {
    await db.update(eventVerifications)
      .set({ verification_status: "failed", error_message: "tx_not_found" })
      .where(eq(eventVerifications.tx_signature, signature));
    return;
  }

  const isValid = verifyTransactionSignature(tx);
  await db.update(eventVerifications)
    .set({
      verification_status: isValid ? "verified" : "failed",
      verified_at: new Date(),
      helius_response: tx
    })
    .where(eq(eventVerifications.tx_signature, signature));
}
```

### 3️⃣ Helius Client: lib/helius.ts

#### Contract

```typescript
export interface HeliusTxResponse {
  signature: string;
  slot: number;
  amount: number;
  from: string;
  to: string;
  timestamp: number;
}

export async function getHeliusTx(signature: string): Promise<HeliusTxResponse | null>;
export function verifyTransactionSignature(tx: HeliusTxResponse): boolean;
```

### 4️⃣ Environment Variables

```
HELIUS_API_KEY="your_helius_api_key"
HELIUS_WEBHOOK_SECRET="your_helius_webhook_secret"
```

### 5️⃣ Expected QA Baseline

| **测试用例**     | **输入**   | **期望输出**         |
| ---------------- | ---------- | -------------------- |
| ✅ valid tx       | 有效签名   | status = verified    |
| ❌ invalid tx     | 签名不存在 | status = failed      |
| ⚡ duplicate tx   | 已存在签名 | 忽略并返回 409       |
| 🔁 webhook replay | 同签名重发 | 幂等处理，无重复写入 |

