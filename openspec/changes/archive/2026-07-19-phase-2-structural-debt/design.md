# Design: Phase 2 — Structural Debt

## Technical Approach

Four independent structural refactors. Zero behavioral changes. Each item is a self-contained file change set with type-only or additive modifications. No schema, migration, or runtime behavior changes.

---

## Item 2.1 — Unify Error Hierarchies

### Current State

Two parallel error hierarchies:

- `comprehensive-handler.ts` — `ApplicationError` (options-bag constructor) + subclasses (`ValidationError`, `AuthenticationError`, etc.) with `details?: Record<string, unknown>`
- `api/errors.ts` — `APIError extends Error` (positional constructor `(msg, statusCode, code)`) + duplicate subclasses with `details?: Array<{field, message}>`. These LOCALLY SHADOW the identical names re-exported via `export *` on line 8.

94 files import from `@/lib/api/errors`. `createErrorResponse()` uses `instanceof APIError` — does NOT match `ApplicationError`.

### Target Architecture

```typescript
// api/errors.ts — backward-compat shim
export class APIError extends ApplicationError {
  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message, { code, statusCode, isOperational: true });
    this.name = "APIError";
  }
}

// Remove local class: ValidationError, AuthenticationError, AuthorizationError,
// NotFoundError, ConflictError, RateLimitError, PaymentError
// → callers get them from comprehensive-handler via export *

// createErrorResponse: change instanceof APIError → instanceof ApplicationError
```

`APIError` extends `ApplicationError` — both `instanceof` checks now work. All 94 importers continue to import same-named classes from the same path. No caller changes.

### File Changes

| File                    | Action | Description                                                                                                                                          |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api/errors.ts` | Modify | `APIError extends ApplicationError` with positional wrapper; delete 7 duplicate subclasses; `createErrorResponse` uses `instanceof ApplicationError` |

### Risk Assessment

**Low**. `APIError` constructor signature `(msg, statusCode, code)` maps directly to `ApplicationError`'s options bag. `instanceof ApplicationError` is a superset of `instanceof APIError`. The `ValidationError.details` type narrows from `Array<{field, message}>` to `Record<string, unknown>` — compile-only change, runtime untouched.

### Design Decision

Make `APIError` extend `ApplicationError` with a positional-to-options wrapper; delete local subclass duplicates; flip `instanceof` to `ApplicationError`.

---

## Item 2.2 — Kill `database.ts`

### Current State

`src/types/database.ts` — 273 lines of hand-written types for 3 tables (`profiles`, `user_favorites`, `products`) plus generic `Tables`/`TablesInsert`/`TablesUpdate`/`Enums` helpers. 4 importers:

| File                                              | Import     | Target             |
| ------------------------------------------------- | ---------- | ------------------ |
| `src/contexts/AuthContext.tsx`                    | `Tables`   | `@/types/supabase` |
| `src/hooks/useAuth.ts`                            | `Tables`   | `@/types/supabase` |
| `src/components/profile/tabs/OverviewTab.tsx`     | `Tables`   | `@/types/supabase` |
| `src/__tests__/integration/helpers/test-setup.ts` | `Database` | `@/types/supabase` |

`@/types/supabase` barrel already exports `Database`, `Json`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`, `Constants` from generated types.

The inline `Tables<T>` in `test-setup.ts` (`type Tables<T> = Database["public"]["Tables"][T]["Row"]`) remains — only the `Database` type source changes.

### File Changes

| File                                              | Action | Description                                  |
| ------------------------------------------------- | ------ | -------------------------------------------- |
| `src/types/database.ts`                           | Delete | Remove 273 lines of stale hand-written types |
| `src/contexts/AuthContext.tsx`                    | Modify | `@/types/database` → `@/types/supabase`      |
| `src/hooks/useAuth.ts`                            | Modify | `@/types/database` → `@/types/supabase`      |
| `src/components/profile/tabs/OverviewTab.tsx`     | Modify | `@/types/database` → `@/types/supabase`      |
| `src/__tests__/integration/helpers/test-setup.ts` | Modify | `@/types/database` → `@/types/supabase`      |

### Risk Assessment

**Low**. All 3 tables exist in generated types. `Tables<"profiles">` yields same `Row` shape. `Database` from generated type has identical `public.Tables` structure — the `__InternalSupabase` field doesn't affect `["public"]["Tables"]` access. TypeScript compilation is the sole correctness check.

### Design Decision

Replace 4 import paths from `@/types/database` to `@/types/supabase`, delete `database.ts`.

---

## Item 2.3 — Connect Sentry to Error Handler

### Current State

- `@sentry/nextjs@^10.38.0` installed, initialized in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — all DSN-gated
- `handleApiError()` in `comprehensive-handler.ts` logs errors via `logError()` → `appLogger` but never calls Sentry
- `appLogger.error()` in `logger/index.ts` logs via pino but never calls Sentry
- `error-reporting/index.ts` has a dead `SentryIntegration` placeholder (zero imports or references)

### Target Architecture

Additive — `captureException()` fires AFTER existing logging, never before. Fire-and-forget; if Sentry is uninitialized (no DSN), SDK no-ops.

```typescript
// comprehensive-handler.ts — in handleApiError(), after logError():
import * as Sentry from "@sentry/nextjs";

// Inside handleApiError, after logError(appError, { requestId }):
if (!appError.isOperational) {
  Sentry.captureException(appError, { extra: { requestId } });
}
```

```typescript
// logger/index.ts — in appLogger.error(), when error is an instance of Error:
import * as Sentry from "@sentry/nextjs";

// After pino logging:
if (error instanceof Error) {
  // existing pino logging...
  Sentry.captureException(error);
}
```

### File Changes

| File                                      | Action | Description                                                                            |
| ----------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `src/lib/errors/comprehensive-handler.ts` | Modify | Add `Sentry.captureException(appError)` in `handleApiError` for non-operational errors |
| `src/lib/logger/index.ts`                 | Modify | Add `Sentry.captureException(error)` in `appLogger.error()` when `Error` object passed |
| `src/lib/error-reporting/index.ts`        | Modify | Remove `SentryIntegration` placeholder object                                          |

### Risk Assessment

**Low**. Sentry SDK already initialized; `captureException` is fire-and-forget. If DSN is unset, SDK is no-op. Additions happen after primary logging paths — cannot block them. The `SentryIntegration` placeholder has zero consumers.

### Design Decision

Add `Sentry.captureException()` in `handleApiError` (non-operational errors) and `appLogger.error()` (Error objects); delete dead `SentryIntegration` placeholder.

---

## Item 2.6 — Landing Page to Server Component

### Current State

`src/app/page.tsx` — 35 lines. Has `"use client"` on line 1 but uses no client features: no state (`useState`), no effects (`useEffect`), no event handlers, no browser APIs, no hooks. It renders a static composition of 9 child components (e.g., `HeroSection`, `FeaturesSection`, `PricingSection`).

Each child component already has its own `"use client"` directive.

### File Changes

| File               | Action | Description                   |
| ------------------ | ------ | ----------------------------- |
| `src/app/page.tsx` | Modify | Remove line 1 `"use client";` |

### Risk Assessment

**None**. Zero client-side logic in `page.tsx`. Children retain their `"use client"` directives. Identical DOM output, identical runtime behavior.

### Design Decision

Remove `"use client"` — the page is a pure Server Component composition layer with no client-side logic.

---

## Testing Strategy

| Layer      | What        | How                                                                                                        |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| Type-check | All 4 items | `npm run type-check` — catches import errors and instanceof mismatches                                     |
| Unit       | 2.3 Sentry  | Verify `handleApiError` and `appLogger.error()` still work (Sentry is additive, covered by existing tests) |
| Build      | All 4 items | `npm run build` — ensures production build compiles                                                        |

## Verification

- `grep 'from "@/types/database"' src/ --include="*.ts"` → 0 matches (2.2)
- `grep '"use client"' src/app/page.tsx` → 0 matches (2.6)
- `grep 'SentryIntegration' src/ --include="*.ts"` → 0 matches (2.3)

## Rollout

All 4 items in a single PR. Revert per-item via `git revert <commit>` — each item touches disjoint files, no cascading conflicts.

## Open Questions

None.
