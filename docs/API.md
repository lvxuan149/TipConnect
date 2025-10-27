# TipConnect × Reflect 集成 API 文档（V2）

**阶段：**Step 2 - Contract  
**目标：**定义 TipConnect 与 Reflect API 的交互接口及示例请求。

---

## 1️⃣ Reflect API 调用

### 1.1 检查服务健康（Health Check）

**Endpoint:** `GET /health`

**示例响应：**
```json
{ "success": true, "message": "API is running" }
```

---

### 1.2 获取报价（Get Quote）

**Endpoint:** `POST /stablecoin/get-quote-for-mint-or-redeem`

**请求示例：**

```json
{
  "symbol": "USDC",
  "amount": 1.5,
  "action": "mint"
}
```

**响应示例：**

```json
{
  "id": "quote_123",
  "symbol": "USDC",
  "amount": 1.5,
  "rate": 1.0,
  "expiresAt": "2025-10-28T00:00:00Z"
}
```

---

### 1.3 生成打赏交易（Generate Mint Transaction）

**Endpoint:** `POST /stablecoin/generate-mint-transaction`

**请求示例：**

```json
{
  "recipient": "ReceiverPubkey",
  "amount": 1.5,
  "symbol": "USDC",
  "quoteId": "quote_123"
}
```

**响应示例：**

```json
{
  "success": true,
  "reflectTxId": "tx_reflect_456",
  "signature": "5vY8...kNq",
  "status": "submitted"
}
```

---

## 2️⃣ TipConnect 内部 API

### 2.1 `/api/reflect/health`

检查 Reflect 服务是否可用。

**响应：**

```json
{
  "success": true,
  "timestamp": "2025-10-27T12:00:00Z"
}
```

---

### 2.2 `/api/tip`

触发一次打赏行为，调用 Reflect 完成稳定币交易并入库。

**请求：**

```json
{
  "fromWallet": "SenderPubkey",
  "toWallet": "ReceiverPubkey",
  "amount": 1.5,
  "symbol": "USDC",
  "storyId": "story_abc"
}
```

**响应：**

```json
{
  "success": true,
  "txSig": "5vY8...kNq",
  "reflectTxId": "tx_reflect_456",
  "status": "submitted"
}
```

---

### 2.3 `/api/overview`

返回全局统计数据。

**响应：**

```json
{
  "total_amount": 123.4,
  "supporters": 45,
  "shares": 18
}
```

---

## 3️⃣ 错误码约定（Error Codes）

| Code | 含义               | 说明                       |
| ---- | ------------------ | -------------------------- |
| 400  | InvalidRequest     | 请求字段缺失或格式错误     |
| 502  | ReflectUnavailable | Reflect API 无响应         |
| 504  | TransactionTimeout | 链上交易未确认             |
| 409  | DuplicateTxSig     | 重复交易签名（幂等性冲突） |

---

## 4️⃣ Headers 规范

```
Content-Type: application/json
Authorization: Bearer ${REFLECT_API_KEY}
```

---

## ✅ QA 目标

| 测试项                   | 预期结果 |
| ------------------------ | -------- |
| /reflect/health 返回成功 | ✅        |
| /api/tip 正常返回 txSig  | ✅        |
| Reflect 铸造交易可验证   | ✅        |
| Neon 数据库落库成功      | ✅        |

---

## 5️⃣ Reflect 扩展接口说明（V3 Update）

新增两个 Reflect 集成相关端点：

---

### 5.1 `/api/webhooks/solana/tx`

**用途：**  
接收来自 Solana/Helius 的交易回调，验证签名后更新 `solana_verifications` 状态。

**方法：** `POST`

**请求体示例：**

```json
{
  "signature": "5vY8...kNq",
  "slot": 25317923,
  "meta": { "err": null },
  "transaction": { "message": { "accountKeys": ["sender", "receiver"] } }
}
```

**响应示例：**

```
{
  "success": true,
  "status": "verified",
  "eventId": "evt_123",
  "slot": 25317923
}
```

**错误码：**

| **Code** | **说明**          |
| -------- | ----------------- |
| 400      | Invalid Signature |
| 409      | Duplicate Event   |
| 502      | Helius Down       |
| 504      | Timeout           |

---

### **5.2**

### **/api/reflect/payouts**

**用途：**

查询 Reflect 支付状态或触发结算重试。

#### **GET /api/reflect/payouts**

返回所有 Reflect 结算记录（分页）

**响应示例：**

```
{
  "success": true,
  "data": [
    {
      "eventId": "evt_123",
      "status": "settled",
      "amount": 1.5,
      "currency": "USDC",
      "reflectTipId": "tx_reflect_456",
      "updatedAt": "2025-10-27T15:10:00Z"
    }
  ]
}
```

#### **POST /api/reflect/payouts/retry**

**请求示例：**

```
{
  "eventId": "evt_123"
}
```

**响应示例：**

```
{
  "success": true,
  "status": "queued",
  "attemptCount": 2
}
```

---

### **5.3**

### **/api/reflect/health**

###  **扩展**

增加对 payout 和 verification 服务的连通性检测。

**响应：**

```
{
  "success": true,
  "reflect": "ok",
  "helius": "ok",
  "updatedAt": "2025-10-27T12:00:00Z"
}
```

---

### **5.4 更新后的错误码表**

| **Code** | **含义**            | **来源**           |
| -------- | ------------------- | ------------------ |
| 400      | Invalid Request     | TipConnect         |
| 409      | DuplicateTxSig      | DB 幂等约束        |
| 502      | ReflectUnavailable  | Reflect API        |
| 503      | VerificationFailed  | Helius 验签错误    |
| 504      | TransactionTimeout  | Reflect 或链上超时 |
| 507      | PayoutRetryExceeded | 多次结算失败       |

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

