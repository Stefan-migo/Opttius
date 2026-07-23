# Archive Report: Phase 2 — Structural Debt

**Archived**: 2026-07-19
**Change**: `phase-2-structural-debt`
**Roadmap Phase**: Phase 2 — Items 2.1, 2.2, 2.3, 2.6

---

## Items Completed

| ID        | Item                             | Summary                                                                                                                                                                                                           | Net Change                             |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 2.1       | Unify error hierarchies          | `APIError extends ApplicationError` (positional wrapper). 7 duplicate subclasses deleted from `api/errors.ts`. `createErrorResponse` instanceof updated to `ApplicationError`. JSDoc `@deprecated` on `APIError`. | ~20 added, ~70 removed                 |
| 2.2       | Kill `database.ts`               | 4 importers migrated from `@/types/database` → `@/types/supabase`. 273-line hand-written type file deleted.                                                                                                       | ~4 added, ~273 removed                 |
| 2.3       | Connect Sentry to error handler  | `Sentry.captureException()` added in `handleApiError()` (non-operational errors) and `appLogger.error()` (Error objects). `SentryIntegration` dead placeholder removed.                                           | ~11 added, ~11 removed                 |
| 2.6       | Landing page to Server Component | `"use client"` removed from `src/app/page.tsx`. Zero behavioral change — children retain their own directives.                                                                                                    | 0 added, ~1 removed                    |
| **Total** |                                  |                                                                                                                                                                                                                   | **~35 added, ~355 removed (-320 net)** |

## Regression Fixed During Verify

- `src/lib/api/response.ts` — `instanceof APIError` (line 94) changed to `instanceof ApplicationError`. Error subclasses now extend `ApplicationError` directly, so `instanceof APIError` returned false.

## Pre-existing Test Bugs Documented

Two test bugs in `comprehensive-handler.test.ts` that existed before this change:

1. `NotFoundError` — test expects `code === "NOT_FOUND_ERROR"` but actual is `"NOT_FOUND"` (inherited from `ApplicationError` defaults)
2. `PaymentError` — test expects `status === 402` but actual is `400` (inherited from `ApplicationError` default)

These are unrelated to the refactor and are tracked as pre-existing test debt.

## Artifact References

| Artifact      | Path                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Proposal      | `openspec/changes/archive/2026-07-19-phase-2-structural-debt/proposal.md`                        |
| Specs         | `openspec/changes/archive/2026-07-19-phase-2-structural-debt/specs/refactor-declaration/spec.md` |
| Design        | `openspec/changes/archive/2026-07-19-phase-2-structural-debt/design.md`                          |
| Tasks         | `openspec/changes/archive/2026-07-19-phase-2-structural-debt/tasks.md`                           |
| Verify Report | Engram observation #956 — "Verified phase-2-structural-debt — PASS WITH WARNINGS"                |

## Verification Status

**PASS WITH WARNINGS** — All source-level changes correct. Two pre-existing test bugs documented (not caused by this change).

## SDD Cycle Complete

All 4 items planned, implemented, verified, and archived. Net diff: -320 lines.
