# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## Contract & Data Impact *(mandatory)*

- **Contract Docs**: [Sections in `/docs/Contract.md` and `/docs/API.md` that change; link to diff or outline new entities/endpoints]
- **Migrations**: [Drizzle migration filename(s), affected tables/columns, rollback notes]
- **Seed Data**: [Updates required in `scripts/seed.ts` and expected metric deltas]
- **QA Baselines**: [Docs (e.g., `docs/QA.md`, `docs/QA_Discover.md`) to regenerate with new expectations]

## User Scenarios & Testing *(mandatory)*

Prioritize journeys (P1, P2, P3...) where each story is independently ship-ready. Every story MUST map to failing tests before implementation (`pnpm test:contract`, `pnpm test:idempotency`, `pnpm test:e2e`, or story-specific suites).

### User Story 1 - [Brief Title] (Priority: P1)

[Describe the journey and the value it delivers]

**Why this priority**: [Explain the value for creators/supporters]

**Independent Test**: [Exact command or Vitest pattern that validates the story on its own]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- What happens when Solana data is missing, duplicated, or delayed?
- How are unsupported Blink actions handled?
- What is the fallback when external services (e.g., Neon, webhooks) fail?

## Environment & Operations *(mandatory)*

- **pnpm dev:up**: [Describe impacts; list any additional scripts bundled into the command]
- **Diagnose Checks**: [New validations to add to `scripts/diagnose.ts`]
- **Runbook/Release**: [Updates required in `docs/Runbook.md`, `docs/Release.md`, or `checklist.md`]
- **Feature Flags / Config**: [Environment variables, defaults, rollout strategy]

## Observability & Performance *(mandatory)*

- **Metrics & Logging**: [New structured logs, telemetry, or dashboards required; include event fields]
- **Latency/SLOs**: [Expected p95 targets for each touched endpoint or page; mitigation plan if at risk]
- **Monitoring Hooks**: [Alerts or QA verification steps needed to keep blink insights trusted]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose contract-compliant responses for [endpoint or UI] as documented in `/docs/API.md`.
- **FR-002**: Database changes MUST be persisted through Drizzle migrations and reflect in analytics queries.
- **FR-003**: `pnpm test:contract` MUST cover [scenario]; add/extend tests if gaps exist.
- **FR-004**: `pnpm test:idempotency` MUST confirm repeat Solana events do not alter aggregates.
- **FR-005**: `pnpm test:e2e` (or equivalent) MUST validate end-to-end user behaviour for the highest priority story.

*Mark unclear requirements explicitly, e.g.:*

- **FR-006**: NEEDS CLARIFICATION - [Describe ambiguity blocking contract alignment]
- **FR-007**: NEEDS CLARIFICATION - [Describe ambiguity blocking deterministic data]

### Key Entities *(include if feature involves data)*

- **[Entity]**: [Purpose, important fields, relationship to existing tables in `drizzle/schema.ts`]
- **[Event/Metric]**: [How it is emitted, aggregated, and surfaced in APIs/UI]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Creator/supporter value metric, e.g., "Discover filters return accurate SOL totals for new action types"]
- **SC-002**: [Performance metric, e.g., "`/api/discover` p95 stays < 500 ms under [load scenario]"]
- **SC-003**: [Data integrity metric, e.g., "Idempotent replay retains identical aggregates across seeds"]
- **SC-004**: [Operational metric, e.g., "`pnpm dev:up` completes in < 2 minutes with new dependencies configured"]
