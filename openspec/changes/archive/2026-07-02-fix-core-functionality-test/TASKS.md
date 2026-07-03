# Tasks: fix-core-functionality-test

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130–215 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes (force-chained per delivery strategy) |
| Suggested split | PR 1 (infra) → PR 2 (Group A) → PR 3 (placeholders + timeouts) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal | PR | Base | Notes |
|------|------|----|------|-------|
| 1 | Test Infrastructure (config + cleanup) | PR 1 | main | vitest.config.ts, delete 2 files |
| 2 | Group A Skipped Tests + expect.any tightening | PR 2 | main | 5 assertion fixes + tighten matchers in same files |
| 3 | Placeholder assertions + Timeout reduction | PR 3 | main | 2 placeholder replacements, 3 `.import.test.tsx` timeouts |

---

### Unit 1: Test Infrastructure (config + cleanup)
**Goal**: Stabilize vitest with `pool: 'forks'` + worker limits and remove duplicate/corrupt files that crash test discovery.
**PR**: PR 1
**Base**: main

#### Tasks
 1. [x] Set `pool: 'forks'` and `maxWorkers: 3` in `vitest.config.ts` — contains worker crashes from OOM
 2. [x] Add per-environment config: `jsdom` for React tests, `node` for `src/__tests__/unit/` — reduces DOM overhead in pure-utility tests
 3. [x] Delete duplicate `src/tests/security/phase2-security.test.ts` — identical copy of `src/__tests__/security/phase2-security.test.ts`
 4. [x] Delete corrupt root-level file (encoding-damaged filename) — vitest may crash trying to parse it

### Unit 2: Group A Skipped Tests + expect.any() Tightening
**Goal**: Re-enable 5 skipped test blocks with correct assertions and tighten `expect.any()` matchers in touched files.
**PR**: PR 2
**Base**: main

#### Tasks
 1. [x] `InsightCard.test.tsx:63` — remove `.skip`, render with `onFeedback` mock, click star, assert called
 2. [x] `schemas.test.ts:186` — remove `.skip`, assert `not.toThrow()` (schema now allows empty via `.default([])`)
 3. [x] `generator.test.ts:244` — remove `.skip`, change `rejects.toThrow()` → `resolves.toBeNull()`
 4. [x] `insights-generation.test.ts:55` — remove `.skip`, update assertion to match current output shape with `metadata: {}`
 5. [x] `template-variables.test.ts:68` — remove `.skip`, update `company_name` → `organization_name`, fix `requiredKeys`
 6. [x] Tighten `expect.any(String/Number)` → specific values in each touched Group A file where deterministic

### Unit 3: Placeholder Assertions + Timeout Reduction
**Goal**: Replace 2 `expect(true).toBe(true)` placeholders with real validation and speed up import tests.
**PR**: PR 3
**Base**: main

#### Tasks
 1. [x] `tier-config.test.ts:44` — replace `expect(true).toBe(true)` with `expect(curr).toBe("unlimited")`
 2. [x] `phase1-security.test.ts:169` — replace `expect(true).toBe(true)` with actual schema behavior assertion
 3. [x] `SupportMetrics.import.test.tsx` — reduce timeout `30000` → `10000`
 4. [x] `DashboardCharts.import.test.tsx` — reduce timeout `30000` → `10000`
 5. [x] `AnalyticsContent.import.test.tsx` — reduce timeout `30000` → `10000`
