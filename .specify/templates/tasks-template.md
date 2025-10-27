---

description: "Task list template for TipConnect feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: `/specs/[###-feature-name]/` (plan.md, spec.md, research.md, data-model.md, contracts/)  
**Prerequisites**: Constitution Check passed in plan.md; contract/docs/migration impact documented in spec.md

**Tests**: Every user story starts with failing automated tests (`pnpm test:contract`, `pnpm test:idempotency`, `pnpm test:e2e`, or story-specific Vitest suites). Do not skip or defer tests.

**Organization**: Tasks are grouped by user story to maintain independent delivery slices.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (no shared files or migrations)
- **[Story]**: User story label (e.g., US1, US2, US3)
- Include concrete file paths (`app/`, `components/`, `lib/`, `drizzle/`, `tests/`, `docs/`)

## Path Conventions

- **Routes/UI**: `app/[route]/page.tsx`, `app/api/[name]/route.ts`, supporting components in `components/`
- **Database**: `drizzle/schema.ts`, `drizzle/migrations/*`
- **Utilities**: `lib/` (e.g., `lib/db.ts`, `lib/solana/*`)
- **Automation**: `scripts/` (e.g., `scripts/diagnose.ts`, `scripts/seed.ts`)
- **Tests**: `tests/contract/*.test.ts`, `tests/idempotency/*.test.ts`, `tests/e2e/*.test.ts`
- **Docs**: `docs/Contract.md`, `docs/API.md`, `docs/QA*.md`, `docs/Runbook.md`, `docs/Release.md`

<!--
  ============================================================================
  IMPORTANT: Replace the sample tasks below with feature-specific items.
  Keep the phase structure so compliance checks remain traceable.
  ============================================================================
-->

## Phase 0: Constitution Guardrails

**Purpose**: Confirm prerequisites before building.

- [ ] T000 [P] Validate plan.md Constitution Check entries (all five principles accounted for)
- [ ] T001 [P] Update `/docs/Contract.md` & `/docs/API.md` skeleton with planned changes (review before coding)
- [ ] T002 Ensure new migrations are drafted (placeholder filenames) and `scripts/seed.ts` deltas identified
- [ ] T003 List QA docs to refresh (`docs/QA.md`, `docs/QA_Discover.md`, etc.) and assign owners
- [ ] T004 Record monitoring/performance acceptance criteria for each touched endpoint

**Checkpoint**: Review with maintainer; do not proceed until signed off.

---

## Phase 1: Foundational (Blocking)

**Purpose**: Implement shared plumbing required by all stories.

- [ ] T010 Apply Drizzle migration in `drizzle/migrations/[timestamp]_[name].ts` and update `drizzle/schema.ts`
- [ ] T011 Refresh `scripts/seed.ts` fixtures and verify `pnpm dev:up` completes successfully
- [ ] T012 Extend `scripts/diagnose.ts` with new environment validations
- [ ] T013 Update contract/docs (`docs/Contract.md`, `docs/API.md`) with final schema/endpoint language
- [ ] T014 Regenerate QA baselines in `docs/QA*.md` to reflect new totals

**Checkpoint**: `pnpm dev:up` runs clean; baseline tests pass or intentionally fail for upcoming stories.

---

## Phase 2: User Story 1 - [Title] (Priority: P1) MVP

**Independent Test**: [Command or pattern that proves the story succeeds]

### Tests First

- [ ] T020 [US1] Add/extend contract test in `tests/contract/[feature].test.ts` (fails awaiting implementation)
- [ ] T021 [US1] Add idempotency/e2e coverage in `tests/idempotency/[feature].test.ts` or `tests/e2e/[feature].test.ts`

### Implementation

- [ ] T022 [US1] Implement API/UI changes in `app/api/[route]/route.ts` or `app/[page]/page.tsx`
- [ ] T023 [US1] Add supporting component/util updates in `components/` or `lib/`
- [ ] T024 [US1] Wire metrics/logging per observability plan
- [ ] T025 [US1] Update docs (runbook/release notes) for new behaviour

**Checkpoint**: Run targeted tests (`pnpm test:contract`, etc.) and confirm QA baselines remain consistent.

---

## Phase 3: User Story 2 - [Title] (Priority: P2)

**Independent Test**: [Command or pattern that proves the story succeeds]

### Tests First

- [ ] T030 [US2] Extend contract/idempotency tests for new scenario (`tests/contract`, `tests/idempotency`)
- [ ] T031 [US2] Add e2e coverage if UI path changes (`tests/e2e`)

### Implementation

- [ ] T032 [US2] Update relevant `app/` route or component
- [ ] T033 [US2] Adjust database/query helpers in `lib/` to support the story
- [ ] T034 [US2] Update instrumentation/alerts if metrics change

**Checkpoint**: Story-specific tests pass independently; re-run regression suite if shared code touched.

---

## Phase 4: User Story 3 - [Title] (Priority: P3)

Repeat the pattern used for earlier stories: tests first, then implementation, documentation, and instrumentation.

- [ ] T040 ... (define tests)
- [ ] T041 ... (define implementation)

---

## Phase N: Polish & Release Readiness

- [ ] T090 Re-run `pnpm dev:up` from clean environment and document results
- [ ] T091 Execute full test suite (`pnpm test:contract`, `pnpm test:idempotency`, `pnpm test:e2e`)
- [ ] T092 Update `docs/Release.md` checklist and add notes to `checklist.md` if new manual steps exist
- [ ] T093 Capture changelog entry / Sync Impact summary if constitution elements shift
- [ ] T094 Final review of logs/metrics to ensure observability coverage

---

## Dependencies & Execution Order

- Phase 0 must be complete (and approved) before coding or migrations begin.
- Phase 1 must pass before any user story work starts.
- Each user story proceeds sequentially by priority unless explicitly staffed in parallel with no file overlap.
- Tests ALWAYS precede implementation tasks for a story.

---

## Notes

- Keep tasks atomic and reference exact files.
- When modifying shared modules, flag downstream stories that must re-run tests.
- Call out follow-up QA/doc work as tasks rather than notes so ownership is clear.
