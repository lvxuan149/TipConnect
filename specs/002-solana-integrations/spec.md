# Feature Specification: Solana Transaction & Reflect Integration

**Feature Branch**: `002-solana-integrations`  
**Created**: 2025-10-27  
**Status**: Draft  
**Input**: User description: "Phase 2: 链上打赏与Webhook → Reflect API → Helius验证 ,优先补齐Solana 交易验证与Reflect稳定币API,Dynamic SDK"

## Contract & Data Impact *(mandatory)*

- **Contract Docs**: NEEDS CLARIFICATION – Which sections in `/docs/Contract.md` and `/docs/API.md` will document Reflect payout APIs, Solana verification responses, and Dynamic wallet onboarding hooks?
- **Migrations**: NEEDS CLARIFICATION – Do we require new tables for Reflect payouts or Helius transaction receipts (e.g., `reflect_transactions`, `helius_verifications`)?
- **Seed Data**: NEEDS CLARIFICATION – Should `scripts/seed.ts` simulate Reflect settlement states and verified Solana transactions?
- **QA Baselines**: NEEDS CLARIFICATION – Which QA docs must capture Reflect balances or verified transaction states?

## User Scenarios & Testing *(mandatory)*

Prioritize journeys (P1, P2, P3...) where each story is independently ship-ready. Every story MUST map to failing tests before implementation (`pnpm test:contract`, `pnpm test:idempotency`, `pnpm test:e2e`, or story-specific suites).

### User Story 1 - Verify Solana Tip Webhook (Priority: P1)

Organizers ingest on-chain tips through the webhook and see only Helius-verified transactions populate dashboards.

**Why this priority**: Ensures on-chain gratitude is trustworthy before we expose Reflect payouts.

**Independent Test**: NEEDS CLARIFICATION – Planned Vitest or integration suite covering webhook verification.

**Acceptance Scenarios**:

1. **Given** a Solana transaction arrives via webhook, **When** Helius confirms signature validity, **Then** the event is stored and surfaced in `/api/overview`.
2. **Given** an invalid or duplicate transaction, **When** verification fails, **Then** the webhook responds with 4xx/5xx and no duplicate event is recorded.

---

### User Story 2 - Reflect Stablecoin Settlement (Priority: P1)

Organizers trigger Reflect API to settle tips into stablecoin payouts that appear alongside Solana summaries.

**Why this priority**: Connects gratitude to actual payouts, aligning with "on-chain gratitude" promise.

**Independent Test**: NEEDS CLARIFICATION – Contract or e2e tests validating Reflect API flow.

**Acceptance Scenarios**:

1. **Given** a verified tip, **When** Reflect payout succeeds, **Then** payout status updates via API/UI.
2. **Given** Reflect API errors, **When** retries occur, **Then** the system logs failure and surfaces actionable status.

---

### User Story 3 - Walletless Dynamic Onboarding (Priority: P2)

Supporters without wallets can contribute via Dynamic SDK, with transactions still verified and settled.

**Why this priority**: Reduces friction for new supporters entering Solana ecosystem.

**Independent Test**: NEEDS CLARIFICATION – UI or integration tests simulating Dynamic walletless flow.

**Acceptance Scenarios**:

1. **Given** a supporter without a wallet, **When** they use Dynamic SDK entry point, **Then** the system provisions a wallet/session and records Reflect/Solana flow end-to-end.

---

### Edge Cases

- NEEDS CLARIFICATION – How to handle Solana transactions that verify slowly or timeout via Helius.
- NEEDS CLARIFICATION – Behavior when Reflect API is rate limited or returns partial success.
- NEEDS CLARIFICATION – Duplicate submissions from Dynamic SDK or mismatched payer identities.

## Environment & Operations *(mandatory)*

- **pnpm dev:up**: NEEDS CLARIFICATION – What mock services or secrets are required to simulate Reflect and Helius locally?
- **Diagnose Checks**: NEEDS CLARIFICATION – Which new environment variables (Reflect API keys, Helius endpoints, Dynamic keys) must be validated?
- **Runbook/Release**: NEEDS CLARIFICATION – Additional rollout steps for blockchain credentials or Reflect onboarding?
- **Feature Flags / Config**: NEEDS CLARIFICATION – Should integrations be gated behind environment flags for staged rollout?

## Observability & Performance *(mandatory)*

- **Metrics & Logging**: NEEDS CLARIFICATION – Required structured logs for Reflect payout status, Helius verification latency, Dynamic onboarding conversion.
- **Latency/SLOs**: NEEDS CLARIFICATION – Expected p95 for webhook verification and payout confirmation flows.
- **Monitoring Hooks**: NEEDS CLARIFICATION – Alerts for failed verifications, Reflect retries, or Dynamic session failures.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Webhook MUST validate Solana transactions via Helius before persisting events.
- **FR-002**: System MUST call Reflect API to settle verified tips into stablecoin payouts with auditable status.
- **FR-003**: Dynamic SDK integration MUST allow walletless supporters to submit tips that pass verification.
- **FR-004**: NEEDS CLARIFICATION – Additional endpoints or UI surfaces for Reflect payout history.
- **FR-005**: NEEDS CLARIFICATION – Required upgrades to tests (`pnpm test:*`) to cover verification and payouts.

### Key Entities *(include if feature involves data)*

- **SolanaVerification**: NEEDS CLARIFICATION – Fields linking event IDs to Helius proof (signature, slot, status, raw response).
- **ReflectPayout**: NEEDS CLARIFICATION – Fields for payout amount, currency, status, retry count, external IDs.
- **DynamicSession**: NEEDS CLARIFICATION – Fields capturing walletless onboarding state, user identifiers, and linked transactions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of ingested tip events show a verified status through Helius before displaying in dashboards.
- **SC-002**: Reflect API responses update payouts within agreed SLA (NEEDS CLARIFICATION for timing).
- **SC-003**: Dynamic SDK onboarding converts walletless supporters with <5% failure rate (NEEDS CLARIFICATION for baseline).
- **SC-004**: `pnpm dev:up` remains fully automated with mock integrations or sandbox keys to cover new dependencies (NEEDS CLARIFICATION for tooling).
