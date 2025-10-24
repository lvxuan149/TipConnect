# QA Baseline

Fixed sample (see `/scripts/seed.ts`):

```
overview = { total_sol: 3.1, supporters: 2, shares: 1 }
```
Latency SLO (dev): `ingest→overview P95 < 3000ms`


# 🧪 `/docs/QA.md`
> 定义测试样本、基线值、验证标准。

```markdown
# TipConnect • QA Baseline（Creators Module • V0.1）

---

## 1. 样本数据（固定）
| creator | wallet | story_id | actions |
|----------|---------|-----------|---------|
| Wenwen | C_WEN | story-1 | 3 tips, 1 share |
| Jay | C_JAY | story-2 | 1 tip |
| Lin | C_LIN | story-3 | 2 shares |

---

## 2. 预期聚合结果
```json
{
  "Wenwen": { "total_tip_value_sol": 3.2, "unique_supporters": 14, "share_count": 5 },
  "Jay": { "total_tip_value_sol": 1.0, "unique_supporters": 4, "share_count": 0 },
  "Lin": { "total_tip_value_sol": 0.0, "unique_supporters": 0, "share_count": 2 }


### 🧪 `/docs/QA_Discover.md`
> 定义测试基线。

```markdown
# TipConnect • QA Baseline（Discover Module • V0.1）

## 1. 样本数据
stories: 3  
blink_events: 8 （含 tip/share 混合）

## 2. 预期结果
/api/overview
```json
{ "total_sol": 3.1, "total_supporters": 2, "total_shares": 1 }



