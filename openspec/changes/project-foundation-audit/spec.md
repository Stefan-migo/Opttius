# Spec: project-foundation-audit

## Purpose

Define preservation invariants, characterization test expectations, and quality gates for a pure-restructuring codebase rescue (5 phases, zero behavior changes). These specs replace behavioral scenarios with **invariant rules** — things that MUST stay true before, during, and after each refactor pass.

## Requirements

### Phase 0 — Stabilize Test Baseline

The test suite MUST exit 0 before any refactoring begins.

#### Quality Gate: Full test suite passes

- GIVEN the current codebase with 96 failing tests
- WHEN Phase 0 applies fixes (env variables, imports, stale snapshots only)
- THEN `npm run test:run` MUST exit 0 (0 failures, 0 errors)
- AND test logic MUST NOT be changed — only infra/import/snapshot patches

#### Invariant: Test logic is untouchable

- GIVEN any test file in `src/__tests__/`
- WHEN Phase 0 modifies it
- THEN the only permitted changes are: env variable setup, import path fixes, snapshot regeneration
- AND assertion logic, mock behavior, and test structure MUST remain identical

#### Edge Case: Supabase-dependent tests

- GIVEN a test requiring a running Supabase local instance
- WHEN that instance is unavailable in CI
- THEN the test MUST be marked with `test.skip` and commented with the reason
- AND skips MUST be tracked in a ticket for re-enablement

### Phase 1 — Slay Megafiles

Each megafile extraction MUST preserve existing behavior exactly.

#### Quality Gate: Characterization test before extraction

- GIVEN a megafile targeted for extraction (e.g. POSAdvancedSale at 3122 lines)
- WHEN Phase 1 begins work on that file
- THEN a characterization test MUST be written FIRST that captures the file's current I/O surface
- AND the test MUST pass before any extraction begins

#### Invariant: One cohesive module per pass

- GIVEN a megafile with multiple responsibilities
- WHEN extracting a module
- THEN exactly ONE cohesive concern MUST be extracted per pass
- AND all existing tests MUST pass after each extraction pass
- AND the source file MUST remain functional (shorter but not broken)

#### Invariant: Megafile size ceiling

- GIVEN the top 6 megafiles outside auto-gen
- WHEN Phase 1 completes
- THEN each MUST be reduced below 500 lines
- AND POS checkout workflow MUST function identically (manual smoke test required)

### Phase 2 — Unify Service Layers

Service consolidation MUST preserve all service interfaces visible to consumers.

#### Quality Gate: Zero import cycles

- GIVEN 2 detected import cycles (`rate-limiting/index.ts <-> middleware.ts`, `security/index.ts <-> integration.ts`)
- WHEN Phase 2 resolves them
- THEN `npx madge --circular src/` MUST return zero cycles
- AND all existing tests MUST pass unchanged

#### Invariant: Consumer transparency

- GIVEN a service being renamed or relocated (e.g. `lib/api/services/` -> `lib/services/`)
- THEN either all consumers MUST be updated together in the same PR
- OR a re-export alias MUST be left at the old path
- AND broken imports for more than 1 commit are NOT allowed

### Phase 3 — Update Documentation

Documentation changes MUST NOT reference code that no longer exists.

#### Quality Gate: No dead references

- GIVEN the `docs/` directory (162 .md files)
- WHEN Phase 3 prunes stale docs
- THEN no remaining doc file MUST reference a deleted file, renamed function, or removed directory
- AND architecture diagrams MUST reflect the current service layer structure

#### Invariant: Stale deletion only

- GIVEN agent-era docs, out-of-date architecture descriptions
- WHEN Phase 3 removes them
- THEN only truly stale content MUST be deleted (cross-reference with actual codebase)
- AND any ambiguous doc MUST be moved to `docs/_archive/` instead of deleted

### Phase 4 — Professionalize Workflows

Engineering workflow changes MUST NOT affect application runtime.

#### Quality Gate: Orphaned dir removal

- GIVEN `.agent/`, `.qoder/`, `.mcp/` directories
- WHEN Phase 4 removes them
- THEN `npm run build` MUST still pass
- AND `npm run test:run` MUST still exit 0
- AND no runtime import or config reference MUST point into these directories

#### Invariant: Engram architecture capture

- GIVEN any architecture decision made during this change
- WHEN the decision is finalized
- THEN Engram MUST have >= 5 architecture memory entries (type: `architecture`, scope: `project`)
- AND each entry MUST include What/Why/Where/Learned

## Quality Gates Summary

| Phase | Gate | Measure |
|-------|------|---------|
| 0 | Green CI | `npm run test:run` exits 0 |
| 1 | Characterization tests | Written before each extraction, pass before+after |
| 1 | Megafile size | Top 6 below 500 lines each |
| 2 | Import cycles | Zero cycles (`madge --circular`), all tests pass |
| 3 | Doc references | No dead code references in docs/ |
| 4 | Build + tests | `npm run build` and `npm run test:run` pass |
| Cross | No regressions | `npm run build` passes at every phase exit state |
