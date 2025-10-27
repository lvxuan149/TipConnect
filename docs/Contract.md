# TipConnect × Reflect 集成契约文档（V2）

**阶段：**Step 2 - Contract  
**目标：**统一 TipConnect ↔ Reflect ↔ Neon 三方的字段口径与数据一致性。

---

## 1️⃣ Core Concepts（核心概念）

Any change here must be accompanied by migration + seed + tests updates.

---

## Section: Helius Transaction Verification Contract

### 1️⃣ Purpose

实现从 Helius Webhook 接收到交易数据后，对交易合法性与签名进行验证，并写入数据库记录验证状态。

### 2️⃣ Data Entities

#### Table: event_verifications

| **字段名**          | **类型**  | **描述**                               | **约束**                       |
| ------------------- | --------- | -------------------------------------- | ------------------------------ |
| id                  | uuid      | 主键                                   | primary key                    |
| tx_signature        | text      | Solana 交易签名                        | unique not null                |
| event_id            | uuid      | 对应 events.id 外键                    | not null references events(id) |
| verification_status | text      | 验证状态 (pending / verified / failed) | not null                       |
| verified_at         | timestamp | 验证完成时间                           | nullable                       |
| helius_response     | jsonb     | Helius 原始响应                        | nullable                       |
| error_message       | text      | 验证失败原因                           | nullable                       |
| created_at          | timestamp | 创建时间                               | default now()                  |
| updated_at          | timestamp | 更新时间                               | default now()                  |

### 3️⃣ State Transitions

| **前状态** | **触发事件**                | **后状态**         | **备注**                     |
| ---------- | --------------------------- | ------------------ | ---------------------------- |
| pending    | 后台任务拉取交易详情        | verified           | 验签通过，交易上链且金额匹配 |
| pending    | 后台任务拉取失败 / 签名无效 | failed             | 验证失败，记录 error_message |
| verified   | （终态）                    | -                  | 可触发后续 Reflect 结算      |
| failed     | 可重试                      | pending → verified | 支持重试机制                 |

### 4️⃣ Contractual Rules

- 每个 events.tx_signature **唯一对应** 一条 event_verifications 记录。
- 交易验证只允许从 pending → (verified 或 failed)。
- 所有验证请求都必须经过 lib/helius.ts 封装（禁止直接调 RPC）。
- 失败原因需结构化（如：rpc_timeout、invalid_signature、amount_mismatch）。

### 5️⃣ Example (DB Row Snapshot)

```json
{
  "id": "b72f1a7d-2c94-4e54-a412-90728cd9f05d",
  "event_id": "7ac15db0-903b-41a8-b02f-d818a6b3b1a5",
  "tx_signature": "3hbS2gRjPn1RyGgYYA9m4TkmR1q7XG9c12mRzcxVRU5qQp6A9LDy6Ac",
  "verification_status": "verified",
  "verified_at": "2025-10-28T12:30:12.233Z",
  "helius_response": { "slot": 31782345, "amount": 0.2, "source": "helius-rpc" },
  "error_message": null,
  "created_at": "2025-10-28T12:29:50.233Z",
  "updated_at": "2025-10-28T12:30:12.233Z"
}
```
