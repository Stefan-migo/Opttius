# Tasks: Phase 2 — Structural Debt

**Change**: `phase-2-structural-debt`
**Strategy**: Single PR (all 4 items stack into one, auto-chain stacked-to-main)
**Budget**: ~380 lines total diff — well under 400-line cap
**Session**: Single session (~4-6h actual, not 8h)

---

## PR Split Recommendation

**Single PR** — all 4 items touch disjoint files, zero merge conflicts between them. Splitting would add overhead (stack setup, CI wait, review lag) for zero benefit. Total net diff is ~380 lines, safely under the 400-line budget.

| Item      | Files Touched                                                             | Est. Lines Changed | Overlap? |
| --------- | ------------------------------------------------------------------------- | ------------------ | -------- |
| 2.1       | `errors.ts` + test                                                        | -50 net            | None     |
| 2.2       | 4 importers + `database.ts` delete                                        | -269 net           | None     |
| 2.3       | `comprehensive-handler.ts`, `logger/index.ts`, `error-reporting/index.ts` | +0 net             | None     |
| 2.6       | `page.tsx`                                                                | -1 net             | None     |
| **Total** | **10 files**                                                              | **~-320 net**      | **None** |

---

## Task 2.1 — Unify Error Hierarchies

**Estimate**: 1h
**Risk**: Low. The `ValidationError.details` type change (`Array<{field,message}>` → `Record<string, unknown>`) is pre-accepted in the spec. One test must be removed.

### Steps

- [x] **2.1.1** — Edit `src/lib/api/errors.ts`:
  - Replace `APIError extends Error` (lines 11-30) with `APIError extends ApplicationError` that wraps positional args `(msg, statusCode, code)` into `ApplicationError`'s options bag `{code, statusCode, isOperational: true}`
  - Delete these 7 local class definitions (lines 32-91): `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `PaymentError` — callers get them from `comprehensive-handler.ts` via the existing `export *` on line 8
  - Update `createErrorResponse` (line 109): `instanceof APIError` → `instanceof ApplicationError`
  - Add JSDoc `@deprecated` on `APIError` class — "Use ApplicationError directly"
  - Keep all other exports (`ErrorResponse`, `SuccessResponse`, `createSuccessResponse`, `withErrorHandler`, `asyncHandler`) unchanged

- [x] **2.1.2** — Edit `src/__tests__/unit/lib/api/errors.test.ts`:
  - Remove test "ValidationError — accepts details array" (lines 58-62) — `Record<string, unknown>` no longer supports array-type details
  - Remove test "ValidationError — converts string details to array" (lines 64-67) — string-to-array conversion was local to the old `ValidationError`
  - Verify all remaining tests pass: the `APIError instanceof` tests (lines 34-47), subclass status/code tests, `createErrorResponse` tests, `withErrorHandler`, `asyncHandler`

### Files Changed

| File                                        | Action | Lines                  |
| ------------------------------------------- | ------ | ---------------------- |
| `src/lib/api/errors.ts`                     | Modify | ~20 added, ~60 removed |
| `src/__tests__/unit/lib/api/errors.test.ts` | Modify | ~0 added, ~10 removed  |

### Verification

```bash
npm run type-check  # catches instanceof/import mismatches
npm run test:run    # specifically errors.test.ts + response.test.ts
```

---

## Task 2.2 — Kill `database.ts`

**Estimate**: 30min
**Risk**: Low. All 3 tables (`profiles`, `user_favorites`, `products`) confirmed present in generated types at `supabase.generated.ts`. `@/types/supabase` barrel re-exports `Tables`, `Database` from generated types + helpers.

### Steps

- [x] **2.2.1** — Update import in `src/contexts/AuthContext.tsx`:
  - Line 13: `import { Tables } from "@/types/database"` → `import { Tables } from "@/types/supabase"`

- [x] **2.2.2** — Update import in `src/hooks/useAuth.ts`:
  - Line 6: `import { Tables } from "@/types/database"` → `import { Tables } from "@/types/supabase"`

- [x] **2.2.3** — Update import in `src/components/profile/tabs/OverviewTab.tsx`:
  - Line 17: `import { Tables } from "@/types/database"` → `import { Tables } from "@/types/supabase"`

- [x] **2.2.4** — Update import in `src/__tests__/integration/helpers/test-setup.ts`:
  - Line 10: `import type { Database } from "@/types/database"` → `import type { Database } from "@/types/supabase"`

- [x] **2.2.5** — Delete `src/types/database.ts` (273 lines)

### Files Changed

| File                                              | Action | Lines          |
| ------------------------------------------------- | ------ | -------------- |
| `src/contexts/AuthContext.tsx`                    | Modify | 1 line changed |
| `src/hooks/useAuth.ts`                            | Modify | 1 line changed |
| `src/components/profile/tabs/OverviewTab.tsx`     | Modify | 1 line changed |
| `src/__tests__/integration/helpers/test-setup.ts` | Modify | 1 line changed |
| `src/types/database.ts`                           | Delete | -273 lines     |

### Verification

```bash
grep -r 'from "@/types/database"' src/ --include="*.ts" --include="*.tsx"
# Expected: 0 matches (exit code 1)

npm run type-check  # import paths resolve correctly
```

---

## Task 2.3 — Connect Sentry to Error Handler

**Estimate**: 30min
**Risk**: Low. `@sentry/nextjs` already installed and initialized (DSN-gated in `sentry.client.config.ts` + `sentry.server.config.ts`). Sentry SDK handles uninitialized state as a no-op. The `SentryIntegration` placeholder has zero consumers (confirmed: `grep` returns only the definition).

### Steps

- [x] **2.3.1** — Edit `src/lib/errors/comprehensive-handler.ts`:
  - Add `import * as Sentry from "@sentry/nextjs";` at top (after line 12 `import { appLogger }`)
  - In `handleApiError()` (after line 300 `logError(appError, { requestId })`), add:
    ```typescript
    // Capture non-operational errors in Sentry
    if (!appError.isOperational) {
      Sentry.captureException(appError, { extra: { requestId } });
    }
    ```
    **Why after logError**: ensures Sentry failure cannot block the primary error path (logging + response).

- [x] **2.3.2** — Edit `src/lib/logger/index.ts`:
  - Add `import * as Sentry from "@sentry/nextjs";` at top (after line 1 `import pino`)
  - In `appLogger.error()` — when an `Error` object is detected (after line 83's `error instanceof Error` check and the pino logging block but before the closing `}` of that branch), add:
    ```typescript
    // Capture errors in Sentry for monitoring
    Sentry.captureException(error);
    ```
    **Why inside the `error instanceof Error` branch**: only `Error` instances carry useful stack traces for Sentry. String/non-Error data is low-value noise.

- [x] **2.3.3** — Edit `src/lib/error-reporting/index.ts`:
  - Delete lines 10-21 (the entire `SentryIntegration` placeholder object + its comment)

### Files Changed

| File                                      | Action | Lines                          |
| ----------------------------------------- | ------ | ------------------------------ |
| `src/lib/errors/comprehensive-handler.ts` | Modify | +5 lines (import + capture)    |
| `src/lib/logger/index.ts`                 | Modify | +6 lines (import + capture)    |
| `src/lib/error-reporting/index.ts`        | Modify | -11 lines (remove placeholder) |

### Verification

```bash
grep -r 'SentryIntegration' src/ --include="*.ts" --include="*.tsx"
# Expected: 0 matches

npm run type-check  # @sentry/nextjs is installed
npm run test:run    # existing error handler tests still pass
```

---

## Task 2.6 — Landing Page to Server Component

**Estimate**: 5min
**Risk**: None. Zero client-side logic in `page.tsx`. All 9 child components retain their own `"use client"` directives. The page only composes static children.

### Steps

- [x] **2.6.1** — Edit `src/app/page.tsx`:
  - Delete line 1: `"use client";`

### Files Changed

| File               | Action | Lines   |
| ------------------ | ------ | ------- |
| `src/app/page.tsx` | Modify | -1 line |

### Verification

```bash
grep '"use client"' src/app/page.tsx
# Expected: 0 matches (exit code 1)

npm run dev  # visual check — page renders identically
```

---

## Integration Verification (Post-All Tasks)

Run these in order after all 4 items are implemented:

```bash
# 1. Type-check first — catches 90% of issues
npm run type-check

# 2. Run all tests
npm run test:run

# 3. Dead code checks
grep -r 'from "@/types/database"' src/ --include="*.ts" --include="*.tsx"  # → 0
grep '"use client"' src/app/page.tsx                                       # → 0
grep -r 'SentryIntegration' src/ --include="*.ts" --include="*.tsx"        # → 0

# 4. Production build (verifies tree-shaking, module resolution)
npm run build
```

---

## Execution Order

Recommended sequence (lowest risk / most independent first):

| Order | Item                              | Rationale                                                                    |
| ----- | --------------------------------- | ---------------------------------------------------------------------------- |
| 1     | **2.6** — Landing page            | 1-line change, zero risk, instant win                                        |
| 2     | **2.2** — Kill database.ts        | Import-only changes, compiler-verified                                       |
| 3     | **2.3** — Connect Sentry          | Additive code, cannot break existing paths                                   |
| 4     | **2.1** — Unify error hierarchies | Touches most files (indirectly via exports), higher risk, test needs updates |

This order ensures that if 2.1 has unexpected issues, the other 3 items are already committed.

---

## Risk Register

| Risk                                                                                            | Item | Likelihood | Mitigation                                                                                        |
| ----------------------------------------------------------------------------------------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------- |
| `ValidationError.details` type change breaks callers expecting array                            | 2.1  | Low        | Spec pre-accepts; 94 importers use these types at compile time — `npm run type-check` catches all |
| `@sentry/nextjs` not initialized on edge runtime                                                | 2.3  | Low        | DSN-gated init in all 3 runtimes (client/server/edge); Sentry no-ops without DSN                  |
| Generated `Database` type has extra fields (`__InternalSupabase`) that break `Tables<T>` lookup | 2.2  | Low        | `supabase-helpers.ts` already uses `Omit<Database, "__InternalSupabase">` — no change needed      |
| Landing page child component secretly depends on parent being client boundary                   | 2.6  | None       | All 9 children have their own `"use client"`; verified by reading each child's source header      |

---

## Lines Budget Summary

| Item                    | Added   | Removed  | Net      |
| ----------------------- | ------- | -------- | -------- |
| 2.1 — Error hierarchies | ~20     | ~70      | -50      |
| 2.2 — Kill database.ts  | ~4      | ~273     | -269     |
| 2.3 — Connect Sentry    | ~11     | ~11      | 0        |
| 2.6 — Landing page      | 0       | ~1       | -1       |
| **Total**               | **~35** | **~355** | **-320** |

Well within the 400-line budget. The majority of the diff is deletions (`database.ts` alone is 273 lines removed). The 400-line estimate in the design was conservative — actual is ~320 lines.
