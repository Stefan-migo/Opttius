# Design: fix-core-functionality-test

## Overview

52 vitest worker crashes make the test suite unreliable, 20 test blocks stay skipped from past SDD cycles, and 2 placeholder assertions pass without validation. This change stabilizes the infra with `pool: 'forks'` + worker limits, re-enables 5 simple assertion fixes (Group A), replaces 2 `expect(true).toBe(true)` placeholders, and tightens `expect.any()` in touched files — without modifying any source code.

## Changes by Category

### Infrastructure (vitest.config.ts)

**Current state**: `pool: undefined` (defaults to `threads`, less isolation), `maxWorkers: undefined` (Vitest spawns aggressively on dev machines), `environment: "jsdom"` (applied globally, even for pure-utility tests).

**Changes**:

| Setting | Current | New | Rationale |
|---------|---------|-----|-----------|
| `pool` | (default: threads) | `'forks'` | Child process per worker — isolates crashes, prevents worker OOM from cascading |
| `maxWorkers` | (default: CPU cores) | `3` | Hard cap on concurrent workers — keeps memory within dev machine limits |
| `environment` | `"jsdom"` (global) | Per-env via `poolOptions.forks?.executors` or inline override | Pure-utility tests under `src/__tests__/unit/` skip DOM overhead |

**Per-environment assignment**: Use `environmentMatchGlobs` on `poolOptions.forks` (or the simpler `defineConfig`-level override) to assign `"node"` for pure-utility tests under `src/__tests__/unit/` — these contain no React renders, only Zod schemas, logic, and service mocks. Component tests in `src/**/*.test.tsx` remain `"jsdom"`.

```
// ponytail: pool/worker config — per-environment via vitest poolOptions.forks.executor config
// pool: 'forks', maxWorkers: 3 bounds memory pressure from large char-test files
```

### File Cleanup

| Action | Path | Reason |
|--------|------|--------|
| Delete | `src/tests/security/phase2-security.test.ts` | Full duplicate of `src/__tests__/security/phase2-security.test.ts` (874 lines) — both match `src/**/*.test.{ts,tsx}` |
| Delete | `DproyectOpttius-appsrc__tests__unitliberrors_debug-import.test.ts` | Encoding-damaged filename at project root — Vitest may crash trying to process it |

### Timeout Reduction (3 files)

All `.import.test.tsx` files with `30000` → `10000`:

| File | Tests affected | Current timeout |
|------|---------------|-----------------|
| `src/components/admin/saas-support/__tests__/SupportMetrics.import.test.tsx` | 4 | 30000 |
| `src/app/admin/_components/__tests__/DashboardCharts.import.test.tsx` | 1 | 30000 |
| `src/app/admin/analytics/_components/__tests__/AnalyticsContent.import.test.tsx` | 6 | 30000 |

### Group A — 5 Skipped Test Fixes

| # | File | Line | Current code | Fix |
|---|------|------|-------------|-----|
| A1 | `src/__tests__/unit/components/ai/InsightCard.test.tsx` | 63 | `it.skip("should call onFeedback when rated", () => {})` — empty body | Remove `.skip`, render with `onFeedback` mock, click "Calificar" button to show stars, click star button, assert `onFeedback` called with `(score, undefined)` |
| A2 | `src/__tests__/unit/lib/ai/insights/schemas.test.ts` | 186 | `it.skip("should require at least one insight", ...)` — asserts `toThrow()` on empty `insights: []` | Remove `.skip`, rename to "should allow empty insights", change assertion to `not.toThrow()` and assert `result.insights` is empty array (schema has `.default([])`) |
| A3 | `src/__tests__/unit/lib/ai/insights/generator.test.ts` | 244 | `it.skip("should throw error if no insights generated", ...)` — asserts `rejects.toThrow()` | Remove `.skip`, rename to "should return null when no insights generated", change to `resolves.toBeNull()` (`generateSingleInsight` returns `null` for empty insights) |
| A4 | `src/__tests__/integration/ai/insights-generation.test.ts` | 55 | `it.skip("should generate insights without maturity adaptation", ...)` — asserts `insights[0].toEqual(mockLLMResponse.insights[0])` | Remove `.skip`, update assertion: Zod parse adds `metadata: {}` default, so `.toEqual` fails. Use per-field assertions or include `metadata: {}` in expected. |
| A5 | `src/lib/email/__tests__/template-variables.test.ts` | 68 | `describe.skip("getDefaultVariables", ...)` — asserts `company_name` which no longer exists | Remove `.skip`, change `company_name` to `organization_name` (2 occurrences), update `requiredKeys` test to match current output keys (replace `company_name` with `login_url`) |

### Placeholder Fixes — 2 `expect(true).toBe(true)`

| File | Line | Current | Fix |
|------|------|---------|-----|
| `src/__tests__/unit/lib/saas/tier-config.test.ts` | 44 | `expect(true).toBe(true)` — "unlimited is higher" | `expect(curr).toBe("unlimited")` — assert the value IS unlimited |
| `src/__tests__/security/phase1-security.test.ts` | 169 | `expect(true).toBe(true)` — middleware validation wrappers | Assert that `commonSchemas.pagination.safeParse(...)` returns correct shape for valid/invalid input, replacing the placeholder |

### Opportunistic `expect.any()` Tightening

In files touched for Group A, replace `expect.any(String/Number)` with specific values where the value is deterministic (not random or timestamp-based). This is scoped to the 5 files modified for R3 — no blanket audit.

## Files to Modify

| File | Action | Category |
|------|--------|----------|
| `vitest.config.ts` | Modify | Infrastructure |
| `src/__tests__/unit/components/ai/InsightCard.test.tsx` | Modify | Group A |
| `src/__tests__/unit/lib/ai/insights/schemas.test.ts` | Modify | Group A |
| `src/__tests__/unit/lib/ai/insights/generator.test.ts` | Modify | Group A |
| `src/__tests__/integration/ai/insights-generation.test.ts` | Modify | Group A |
| `src/lib/email/__tests__/template-variables.test.ts` | Modify | Group A |
| `src/__tests__/unit/lib/saas/tier-config.test.ts` | Modify | Placeholder |
| `src/__tests__/security/phase1-security.test.ts` | Modify | Placeholder |
| `src/tests/security/phase2-security.test.ts` | Delete | Cleanup |
| `DproyectOpttius-appsrc__tests__unitliberrors_debug-import.test.ts` | Delete | Cleanup |
| `src/components/admin/saas-support/__tests__/SupportMetrics.import.test.tsx` | Modify | Timeout |
| `src/app/admin/_components/__tests__/DashboardCharts.import.test.tsx` | Modify | Timeout |
| `src/app/admin/analytics/_components/__tests__/AnalyticsContent.import.test.tsx` | Modify | Timeout |

## Non-goals

- NOT fixing Groups B+D skipped tests (12 blocks — deferred)
- NOT fixing all 28 `expect.any()` instances (only touched files)
- NOT splitting large `.char.test.ts` files to fix OOM
- NOT modifying any source code files
- NOT auditing mock-that-tests-itself patterns

## Risks

| Risk | Mitigation |
|------|-----------|
| `pool: 'forks'` + 3 workers may not resolve all 52 crashes if root cause is OOM in largest files | Document remaining crashes for follow-up; file splitting as escalation |
| Fixed skipped tests (Group A) may still fail if source code changed further since ponytail comment was written | Each fix is independently verifiable with `npx vitest run <file>` — rollback per file if needed |
| `node` env for utility tests may break tests that implicitly rely on jsdom globals | Only pure-utility files get `node` env; test confirms by running individually |
| Corrupt filename deletion may affect git history if file was tracked | Check with `git ls-files` first; `git rm` if tracked, `rm` if untracked |
