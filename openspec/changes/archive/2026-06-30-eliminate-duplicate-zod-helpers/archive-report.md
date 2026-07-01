# Archive Report: Eliminate Duplicate Zod Helpers

| Field        | Value                             |
| ------------ | --------------------------------- |
| Change       | `eliminate-duplicate-zod-helpers` |
| Archive Date | 2026-06-30                        |
| Status       | **COMPLETE**                      |
| Net Diff     | -371 lines (372 deleted, 1 added) |

---

## Intent

Two identical 373-line `zod-helpers.ts` files existed — one canonical (`src/lib/validation/zod-helpers.ts`) and one duplicate (`src/lib/api/validation/zod-helpers.ts`). The only difference was the `ValidationError` import path, which caused a silent `instanceof` breakage: the canonical file imported a standalone `Error` subclass, while all consumers caught the `APIError` subclass from `@/lib/api/errors`. C9 in the 2026-06-30 audit.

## What Was Done

| File                                    | Change                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/lib/validation/zod-helpers.ts:4`   | Import `ValidationError` from `@/lib/api/errors` (fixes `instanceof` identity)               |
| `src/lib/api/validation/zod-helpers.ts` | Full content replaced with `export * from "@/lib/validation/zod-helpers"` (barrel re-export) |

**Zero consumer files modified.** All 48 existing imports of `@/lib/api/validation/zod-helpers` continue working through the barrel.

## Key Discovery: ValidationError Class Mismatch

The canonical file imported `ValidationError` from `./errors` — a simple 9-line `Error` subclass used nowhere else. All 23 consumers that catch `ValidationError` via `instanceof` import it from `@/lib/api/errors` (186-line `APIError` subclass hierarchy). Types matched structurally, but `instanceof` silently returned `false` across the two different classes. This was a latent bug: if any helper threw, the catch block in route handlers would never match.

## Verification Results

| Criterion                        | Status                                     |
| -------------------------------- | ------------------------------------------ |
| Canonical import fixed           | ✅ `@/lib/api/errors`                      |
| Barrel file is single re-export  | ✅ 1 line                                  |
| Only 2 target files modified     | ✅                                         |
| Type-check passes                | ✅ 0 errors in affected files              |
| Full test suite                  | ✅ 84/84 files, 1398 tests, **0 failures** |
| Barrel resolves for 48 consumers | ✅ All pass at runtime                     |

## Artifacts

- `proposal.md` — Original proposal with scope, approach, risk analysis
- `tasks.md` — Task breakdown (2 core + 3 verification tasks)
- `verify-report.md` — Full verification with completeness table and correctness analysis
- `archive-report.md` — This file

## Deferred

- `src/lib/validation/errors.ts` (9 lines) — The old standalone `ValidationError` is no longer imported. Removing it was explicitly deferred in the proposal.
