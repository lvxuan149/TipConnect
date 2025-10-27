<!--
Sync Impact Report
- Version: template -> 1.0.0
- Modified Principles:
  - [PRINCIPLE_1_NAME] -> Contract-First Delivery
  - [PRINCIPLE_2_NAME] -> Single-Command Environment Health
  - [PRINCIPLE_3_NAME] -> Deterministic Data Baselines
  - [PRINCIPLE_4_NAME] -> Test-Gated Releases
  - [PRINCIPLE_5_NAME] -> Blink-First Observability & Performance
- Added Sections: Platform Constraints & Tooling; Workflow & Quality Gates
- Removed Sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
- Follow-up TODOs: None
-->
# TipConnect Constitution

## Core Principles

### Contract-First Delivery
- All changes to APIs, database schema, or Solana integrations MUST be defined in `/docs/Contract.md` and `/docs/API.md` before implementation starts.
- Schema adjustments MUST land via Drizzle migrations with matching updates to `scripts/seed.ts`, QA baselines in `docs/QA*.md`, and the release checklist; direct SQL patches are forbidden.
- API handlers and shared types MUST enforce the documented contract using type-safe validators (e.g., Zod schemas) to block incompatible responses.

Rationale: Solana-facing clients and downstream analytics depend on a stable contract; defining and enforcing it first prevents breaking migrations and keeps integrations auditable.

### Single-Command Environment Health
- `pnpm dev:up` MUST remain the canonical path for local setup; diagnostics, migrations, seeding, and dev server steps integrate into this command.
- Any new environment variable or external dependency MUST be validated inside `scripts/diagnose.ts`, failing fast when misconfigured.
- Manual environment steps MUST be automated in `/scripts` and documented in `docs/Runbook.md` before merge.

Rationale: TipConnect is bootstrapped by new contributors; a single automated command preserves parity across laptops, CI, and preview deployments.

### Deterministic Data Baselines
- Sample data in `scripts/seed.ts` MUST keep stable identifiers, transaction signatures, and metric expectations so QA documents and automated tests remain reproducible.
- When seed data changes, maintainers MUST update `docs/QA*.md` and `docs/Runbook.md` with the new baselines and regenerate any monitoring snapshots.
- Contract, idempotency, and e2e tests MUST source fixtures from `/tests` or the shared seed data; ad-hoc records that drift from the published baselines are prohibited.

Rationale: Stable seeds backstop smoke tests, blink demos, and analytics verification without re-learning datasets each release.

### Test-Gated Releases
- Feature plans MUST enumerate independent acceptance tests per user story; implementation starts only after those tests exist and fail.
- Every PR MUST run `pnpm test:contract`, `pnpm test:idempotency`, and `pnpm test:e2e`; failures block merge until resolved.
- New functionality MUST add or extend automated tests that prove behaviour against the published QA baselines; manual verification alone is insufficient.

Rationale: The Solana ingest path is brittle without contract validation and idempotency guards; gated tests stop regressions before they reach production.

### Blink-First Observability & Performance
- Blink-facing endpoints (`/api/overview`, `/api/discover`, `/api/creators/*`) MUST expose the metrics defined in `docs/QA.md` with accurate totals, supporters, and shares.
- API handlers MUST maintain the latency targets in `docs/Repo_Structure.md` (p95 < 500 ms for Discover, < 300 ms for Overview); breaches require instrumentation and remediation before release.
- Logging and analytics MUST capture blink events, SOL deltas, and error states in a structured format so Ops can trace issues end-to-end.

Rationale: TipConnect's value comes from real-time blink insight; observability and SLO adherence keep creators trusted.

## Platform Constraints & Tooling
- Language runtime MUST stay within Node.js >=18.18 and <=20.x, using the Next.js 14 App Router stack defined in `package.json`.
- `pnpm` (declared in `packageManager`) is the only supported package manager; lockfile updates ship with any dependency change.
- Database access MUST flow through Drizzle ORM against Neon Postgres; direct SQL clients or alternate databases require governance approval.
- Solana remains the sole blockchain target; multi-chain functionality demands a constitution amendment.
- Shared modules and utilities live under `/lib`, `/scripts`, and `/drizzle`; new tooling requires an architecture rationale in `docs/Repo_Structure.md`.

## Workflow & Quality Gates
- All feature work begins in `/specs/[###-feature-name]/` using the provided templates; placeholders MUST be replaced with project-specific content before implementation.
- The "Constitution Check" section in `plan.md` MUST confirm compliance with every principle before Phase 0 research and be revalidated before coding starts.
- Delivery checklists in `docs/Release.md` and `checklist.md` MUST reflect current principles; updates to workflows require synchronized doc changes.
- Runtime guidance (`README.md`, `docs/Runbook.md`, feature quickstarts) MUST stay aligned whenever commands, environments, or constraints change.

## Governance
- This constitution supersedes conflicting process guidance; maintainers resolve disputes by referencing `.specify/memory/constitution.md`.
- Amendments require: (1) a pull request describing the change, (2) updated dependent templates/docs, (3) approval from two maintainers, and (4) publication of the Sync Impact Report comment.
- Versioning follows semantic rules: MAJOR for principle removal/redefinition or governance rewrites; MINOR for new principles or substantive expansions; PATCH for clarifications or typo fixes.
- Compliance reviews run before every tagged release and at least monthly; reviewers audit recent specs, plans, tasks, QA docs, and repository reports for alignment.
- Violations uncovered during review MUST have corrective work items filed within the `/specs` workflow before new features start.

**Version**: 1.0.0 | **Ratified**: 2025-10-27 | **Last Amended**: 2025-10-27
