# TipConnect × Reflect 集成契约文档（V2）

**阶段：**Step 2 - Contract  
**目标：**统一 TipConnect ↔ Reflect ↔ Neon 三方的字段口径与数据一致性。

---

## 1️⃣ Core Concepts（核心概念）

| 名称 | 含义 | 来源 |
|------|------|------|
| **Tip Action** | 用户的打赏行为（链上 + Reflect API） | TipConnect |
| **Reflect Transaction** | Reflect 的稳定币铸造交易 | Reflect API |
| **Neon Record** | 数据库存储的交易记录 | Neon + Drizzle |
| **Overview Metrics** | 聚合统计指标（💰 / 👥 / 📣） | TipConnect |

---

## 2️⃣ 数据契约（Data Contract）

### 2.1 TipAction 对象

```ts
interface TipAction {
  fromWallet: string        // 发起者钱包
  toWallet: string          // 接收者钱包
  amount: number            // 金额
  symbol: "USDC" | "USDT"   // 稳定币类型
  storyId?: string          // 可选：关联故事ID
}
```

### 2.2 ReflectQuote 对象

```ts
interface ReflectQuote {
  id: string
  symbol: string
  amount: number
  rate: number
  expiresAt: string
}
```

### 2.3 ReflectTransaction 对象

```ts
interface ReflectTransaction {
  reflectTxId: string
  signature: string
  status: "submitted" | "confirmed" | "failed"
}
```

### 2.4 TipRecord（Neon存储对象）

```ts
interface TipRecord {
  id: string
  txSig: string
  fromWallet: string
  toWallet: string
  amount: number
  symbol: string
  reflectQuoteId: string
  reflectTxId: string
  storyId?: string
  status: "pending" | "success" | "failed"
  createdAt: Date
}
```

---

## 3️⃣ 关键约束（Contract Constraints）

| 条目         | 说明                                          |
| ------------ | --------------------------------------------- |
| **幂等性**   | 以 `txSig` 为唯一键，重复请求不重复创建记录   |
| **一致性**   | Reflect 返回的 `reflectTxId` 与数据库记录同步 |
| **透明性**   | 所有交易签名均可链上验证（Solana explorer）   |
| **可回放性** | 任意失败的交易可通过 `reflectTxId` 重试       |

---

## 4️⃣ Neon 表定义（Drizzle）

```ts
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  txSig: text("txSig").notNull().unique(),
  fromWallet: text("from_wallet").notNull(),
  toWallet: text("to_wallet").notNull(),
  amount: numeric("amount").notNull(),
  symbol: text("symbol").notNull(),
  reflectQuoteId: text("reflect_quote_id"),
  reflectTxId: text("reflect_tx_id"),
  storyId: text("story_id"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow()
})
```

---

## 5️⃣ QA 验收标准

| 项目              | 验收标准                       |
| ----------------- | ------------------------------ |
| Reflect `/health` | 返回 `{success:true}`          |
| `/api/tip`        | Reflect 成功返回 txSig，并落库 |
| `/api/overview`   | 数值与数据库聚合一致           |
| 失败回放          | Pending 交易可重试并更新状态   |

---

## 6️⃣ Reflect 扩展契约（V3 Update）

本章节补充 Reflect 集成的支付与验证生命周期定义，与现有数据库结构一致。

### 6.1 ReflectPayout 对象

```ts
interface ReflectPayout {
  id: string
  eventId: string               // 对应事件ID (FK)
  reflectTipId: string          // Reflect API 的交易ID
  currency: "USDC" | "USDT"
  amount: number
  status: "pending" | "queued" | "settled" | "failed" | "cancelled"
  attemptCount: number
  lastError?: string
  createdAt: Date
  updatedAt: Date
}
```

### **6.2 SolanaVerification 对象**

```
interface SolanaVerification {
  id: string
  eventId: string
  status: "pending" | "verified" | "failed"
  signature: string
  slot?: number
  heliusResponse: object
  errorCode?: string
  verifiedAt?: Date
  createdAt: Date
}
```

### **6.3 数据表结构扩展（Drizzle Schema）**

```
// reflect_payouts
export const reflectPayouts = pgTable("reflect_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 72 }).references(() => events.id),
  reflectTipId: text("reflect_tip_id").unique(),
  status: text("status").$type<"pending" | "queued" | "settled" | "failed" | "cancelled">(),
  currency: text("currency").notNull(),
  amount: numeric("amount").notNull(),
  attemptCount: integer("attempt_count").default(0),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
})

// solana_verifications
export const solanaVerifications = pgTable("solana_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 72 }).references(() => events.id),
  status: text("status").$type<"pending" | "verified" | "failed">(),
  signature: text("signature").notNull(),
  slot: bigint("slot"),
  heliusResponse: jsonb("helius_response").notNull(),
  errorCode: text("error_code"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
})
```

### **6.4 状态转换规则**

| **状态** | **含义**          | **触发条件**                   |
| -------- | ----------------- | ------------------------------ |
| pending  | 待验证/待支付     | 接收到 webhook 或 Reflect 请求 |
| verified | 链上交易确认      | Helius 验签成功                |
| queued   | 等待 Reflect 结算 | 已通过验证但 Reflect 尚未响应  |
| settled  | Reflect 成功支付  | Reflect 返回成功状态           |
| failed   | 任一阶段失败      | 网络错误、签名无效、API 超时等 |

---

### **6.5 QA 验证点扩展**

| **测试用例**            | **验证内容**                  | **预期结果**         |
| ----------------------- | ----------------------------- | -------------------- |
| /api/webhooks/solana/tx | Helius 验签成功               | 插入 verified 记录   |
| /api/reflect/payouts    | 返回 settlement 列表          | 状态正确且匹配数据库 |
| /api/overview           | 聚合仅包含 verified + settled | 显示准确总额         |
