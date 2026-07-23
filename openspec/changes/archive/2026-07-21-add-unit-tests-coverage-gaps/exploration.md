# Exploration: add-unit-tests-coverage-gaps (Fase 6.2)

## CRITICAL Finding: Already Completed

This change was **already implemented and archived** on 2026-07-04 at `openspec/changes/archive/2026-07-04-coverage-gaps-6-2/`. All 6 test files exist and 96 tests pass.

## Current State

### Group A: Supabase Utils (5 source files → 4 test files)

| Source File       | Stmts | Branch | Funcs | Lines | Uncovered                                 | Test File                   | Tests |
| ----------------- | ----- | ------ | ----- | ----- | ----------------------------------------- | --------------------------- | ----- |
| `client.ts`       | 100%  | 100%   | 100%  | 100%  | —                                         | `client.test.ts`            | 2     |
| `cron.ts`         | 100%  | 75%    | 100%  | 100%  | L16 (`\|\| ""`)                           | `cron.test.ts`              | 2     |
| `server.ts`       | 87.5% | 68.75% | 75%   | 87.5% | L18 (`\|\| ""`), L87-88 (cookie getUser)  | `server.test.ts`            | 8     |
| `webhook.ts`      | 100%  | 100%   | 100%  | 100%  | —                                         | `webhook.test.ts`           | 4     |
| `service-role.ts` | 0%\*  | 0%\*   | 0%\*  | 0%\*  | re-export (uncovered by unit test import) | tested via `server.test.ts` | —     |

_\*service-role.ts is a 1-line re-export `export { createServiceRoleClient } from "./server"`. The function is tested, but the re-export line isn't covered because `server.test.ts` imports from `./server` not `./service-role`. Technically uncovered but trivial._

### Group B: Validation Schemas (2 source files → 2 existing test files)

| Source File      | Stmts  | Branch | Funcs | Lines  | Uncovered                            | Test File             | Tests |
| ---------------- | ------ | ------ | ----- | ------ | ------------------------------------ | --------------------- | ----- |
| `quotes.ts`      | 84.61% | 75%    | 100%  | 90%    | L49, L72 (preprocessor `return val`) | `quotes.test.ts`      | 37    |
| `work-orders.ts` | 73.91% | 73.07% | 100%  | 88.23% | L56, L79 (preprocessor `return val`) | `work-orders.test.ts` | 43    |

### Aggregate Coverage (includes deps)

The 38%/34% user-mentioned numbers include `base.ts` (37%) and `rut.ts` (0%) which are imported dependencies. The **source-level** coverage for the 7 target files is already high.

## Remaining Gaps to 80%+

### Per-file gap analysis

#### `quotes.ts` — 84.61% Stmts, need ~+2 tests

- Lines 49, 72: preprocessors `return val` fallthrough — when input is not null/undefined/number/string
- **Fix**: 1 test passing a boolean as `far_lens_cost` to hit `typeof val === "number"` fails, `typeof val === "string"` fails, falls through to `return val` (the boolean itself)

#### `work-orders.ts` — 73.91% Stmts, need ~+2 tests

- Lines 56, 79: same preprocessor fallthrough
- **Fix**: 1 test passing boolean as `far_lens_cost` → covers both far and near paths simultaneously

#### `server.ts` — 87.5% Stmts, need ~+2 tests

- Line 18: `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""` — when env not set
- Lines 87-88: cookie fallback `getUser()` (without token)
- **Fix**: 1 test for unset env vars, 1 test asserting cookie getUser behavior

#### `cron.ts` — 100% Stmts, 75% Branch, need ~+1 test

- Line 16: `process.env.NEXT_PUBLIC_SUPABASE_URL || ""` — when env not set
- **Fix**: 1 test with empty URL to hit the `|| ""` branch

#### `service-role.ts` — trivial re-export, ignore

### Summary of remaining work

| File                  | New Tests Needed | Lines Added | Effort  |
| --------------------- | ---------------- | ----------- | ------- |
| `quotes.test.ts`      | 1                | ~15         | Low     |
| `work-orders.test.ts` | 1                | ~15         | Low     |
| `server.test.ts`      | 2                | ~30         | Low     |
| `cron.test.ts`        | 1                | ~15         | Low     |
| **Total**             | **~5**           | **~75**     | **Low** |

All the heavy lifting (test infrastructure, mock patterns, main test cases) is already done. Remaining gaps are minor edge-case branches.

## Test Patterns (Established)

### Supabase Utils Pattern

```typescript
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ browser: true })),
}));

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
// ... test ...
vi.unstubAllEnvs();
```

### Validation Schema Pattern

```typescript
const result = createQuoteSchema.safeParse({ ...valid, field: value });
expect(result.success).toBe(true / false);
if (result.success) expect(result.data.field).toBe(expected);
```

## Approaches

1. **Close the remaining 5 gaps** (recommended)
   - Pros: Minimal effort (~75 lines), targets only uncovered branches, completes the archived work
   - Cons: Leaves base.ts (37%) and rut.ts (0%) untouched
   - Effort: Low

2. **Also add base.ts and rut.ts coverage**
   - Pros: Would lift aggregate coverage above global thresholds (50% lines)
   - Cons: Significantly more work, those are shared utilities used across many schemas
   - Effort: High

## Recommendation

**Approach 1** — close the remaining 5 test gaps in the 4 existing test files. The change is 95% complete from the previous archive. Adding ~75 lines across `quotes.test.ts`, `work-orders.test.ts`, `server.test.ts`, and `cron.test.ts` will push all 7 target files to 80%+ branch coverage.

Then consider a separate change for `base.ts` and `rut.ts` coverage if the aggregate thresholds are a hard requirement.

## Risks

- None. These are test-only additions following established patterns. All existing tests pass (96/96).
- The `frame_name` min/trim order bug in `work-orders.ts` was documented in the previous archive but not fixed (out of scope for test-only change).

## Ready for Proposal

**Yes** — proceed with closing the minor remaining gaps. The fundamental test infrastructure is already in place.
