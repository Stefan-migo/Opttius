# Proposal: Phase 2 — Structural Debt

## Intent

Execute 4 items from the Production Readiness Roadmap (Phase 2) that address the dual error hierarchy (`instanceof` breaks between `APIError` and `ApplicationError`), the zombie `database.ts` with stale hand-written types, missing Sentry capture in production error paths, and an `"use client"` landing page that costs performance for zero benefit.

## Scope

### In Scope

- **2.1** — Unify error hierarchies: make `api/errors.ts` a backward-compat shim over `comprehensive-handler.ts`
- **2.2** — Kill `database.ts`: migrate 4 importers to `@/types/supabase`, delete the file
- **2.3** — Connect Sentry to error handler: `captureException()` in `handleApiError` + `appLogger.error()`
- **2.6** — Convert landing page to Server Component: remove `"use client"` from `src/app/page.tsx`

### Out of Scope

- **2.4** Split top-10 largest files (2-3 day item, deferred)
- **2.5** Consolidate API response layer (depends on 2.1, deferred)
- No behavioral changes — type-only and structural cleanup
- No refactoring of child landing components (they stay Client Components)

## Capabilities

**New Capabilities**: None (pure refactor)
**Modified Capabilities**: None (no spec-level behavior changes)

## Approach

| Item    | Approach                                                                                                                                                                                                                                                                                                    | Est. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **2.1** | Make `APIError extends ApplicationError`. Delete duplicate `ValidationError`, `AuthenticationError` (etc.) from `api/errors.ts` — they are already re-exported from `comprehensive-handler.ts`. Update `createErrorResponse` to use `ApplicationError` `instanceof`. Add `@deprecated` JSDoc to `APIError`. | 1h   |
| **2.2** | `src/types/database.ts` has 3 stale tables (profiles, user_favorites, products). `src/types/supabase` already exports `Tables` (from `supabase-helpers.ts`, backed by generated types). Migrate 4 files: `AuthContext.tsx`, `useAuth.ts`, `OverviewTab.tsx`, `test-setup.ts`. Delete `database.ts`.         | 1h   |
| **2.3** | `@sentry/nextjs` is installed and used in `global-error.tsx`. Stale `SentryIntegration` placeholder in `error-reporting/index.ts`. Add `Sentry.captureException(err)` to `handleApiError` in `comprehensive-handler.ts` and to `appLogger.error()` in `logger/index.ts`. Remove placeholder.                | 1h   |
| **2.6** | `page.tsx` wraps Server-Component-compatible children. ONLY `page.tsx` has `"use client"`. Remove it — children keep their own `"use client"` directives.                                                                                                                                                   | 5min |

## Affected Areas

| Area                                              | Impact   | Description                                                                      |
| ------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `src/lib/api/errors.ts`                           | Modified | Remove duplicate error classes, rename `APIError` base, update instanceof checks |
| `src/lib/errors/comprehensive-handler.ts`         | Modified | Add `Sentry.captureException()` in `handleApiError`                              |
| `src/lib/logger/index.ts`                         | Modified | Add `Sentry.captureException()` in `appLogger.error()`                           |
| `src/lib/error-reporting/index.ts`                | Modified | Remove stale placeholder, re-export real Sentry                                  |
| `src/types/database.ts`                           | Removed  | Deleted after import migration                                                   |
| `src/contexts/AuthContext.tsx`                    | Modified | Import `Tables` from `@/types/supabase`                                          |
| `src/hooks/useAuth.ts`                            | Modified | Import `Tables` from `@/types/supabase`                                          |
| `src/components/profile/tabs/OverviewTab.tsx`     | Modified | Import `Tables` from `@/types/supabase`                                          |
| `src/__tests__/integration/helpers/test-setup.ts` | Modified | Import `Database` from `@/types/supabase`                                        |
| `src/app/page.tsx`                                | Modified | Remove `"use client"`                                                            |

## Risks

| Risk                                                                                                      | Likelihood | Mitigation                                                                 |
| --------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `APIError` constructor differs from `ApplicationError` — callers passing `(msg, status, code)` positional | Low        | `APIError extends ApplicationError` wraps positional args into options bag |
| `@sentry/nextjs` lazy-loads and may not init before first `captureException`                              | Low        | Already initialized in `sentry.config.ts` (standard Next.js pattern)       |
| 4 importers of `@/types/database` might use types not in generated schema                                 | Low        | Only 3 tables — verified all exist in `supabase.generated.ts`              |

## Rollback Plan

Per-item revert:

- **2.1**: Revert `src/lib/api/errors.ts` and restore deleted class definitions
- **2.2**: Restore `src/types/database.ts` from git, revert 4 import files
- **2.3**: Revert `comprehensive-handler.ts` and `logger/index.ts`
- **2.6**: Revert `src/app/page.tsx`
  All changes are scoped to individual files — no schema or data migration involved.

## Dependencies

- `@sentry/nextjs` already in `package.json` (`^10.38.0`)
- Generated Supabase types already exist at `src/types/supabase.generated.ts`

## Success Criteria

- [ ] Zero files importing from `@/types/database` (grep exits 1)
- [ ] `src/types/database.ts` deleted
- [ ] `comprehensive-handler.ts` + `logger/index.ts` call `Sentry.captureException` on error paths
- [ ] `src/app/page.tsx` has no `"use client"` directive
- [ ] All existing tests pass (no behavioral changes)
