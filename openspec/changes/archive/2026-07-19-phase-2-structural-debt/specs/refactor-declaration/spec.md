# Refactor-Only Declaration — Structural Debt Phase 2

**Change**: phase-2-structural-debt
**Type**: Pure refactor — zero behavioral changes
**Scenarios**: None required

---

## Item 2.1 — Unify Error Hierarchies

### Scope

Make `src/lib/api/errors.ts` a backward-compatible shim over `src/lib/errors/comprehensive-handler.ts`. The file already has `export * from "@/lib/errors/comprehensive-handler"`. Remove the duplicate class definitions (`APIError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `PaymentError`) that shadow the re-exported ones. Adapt `createErrorResponse` and `withErrorHandler` to use `ApplicationError` `instanceof` instead of `APIError` `instanceof`.

### Invariants (Must Preserve)

- All exported classes, functions, types, interfaces from `comprehensive-handler.ts` remain available through `@/lib/api/errors` (the `export *` re-export is kept).
- `instanceof APIError` callers outside `errors.ts` — `APIError` is still a named export that can be `instanceof`-checked, either via the existing re-export or via `APIError extends ApplicationError`.
- `APIError` constructor signature `(message, statusCode, code)` — if changed to match `ApplicationError`'s options bag, the wrapper MUST convert positional args to the `{code, statusCode}` shape transparently.
- `createErrorResponse(error, requestId)` returns `NextResponse<ErrorResponse>` with identical shape.
- `withErrorHandler` middleware wrapper behavior unchanged.
- `ValidationError.details` (`Array<{field, message}>`) — if re-exported from `comprehensive-handler`, its `details` type is `Record<string, unknown>`, not `Array<{field, string}>`. This is a pre-existing type mismatch that exists today because the local `ValidationError` class in `api/errors.ts` shadows the re-exported one. The proposal's approach of removing the local class will change the type of `details`. **This is acceptable** because callers already receive whichever is imported, and the `export *` includes the comprehensive-handler version. If a caller specifically imported `ValidationError` from `@/lib/api/errors` and used `details` as `Array<{field, message}>`, the type will become `Record<string, unknown> | undefined`. This is a type-level narrowing, not a behavioral change — runtime behavior is identical.

### Files in Scope

| File                    | Change                                                                            |
| ----------------------- | --------------------------------------------------------------------------------- |
| `src/lib/api/errors.ts` | Remove duplicate class definitions; update `createErrorResponse` instanceof check |

### Refactor-Only

No behavioral scenarios. All existing error behavior, response shapes, and middleware flow are preserved.

---

## Item 2.2 — Kill `database.ts`

### Scope

Migrate all 4 importers of `@/types/database` to `@/types/supabase` (which exports `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `Database`, `Json` from the generated types at `supabase.generated.ts`). Delete `src/types/database.ts`.

### Invariants (Must Preserve)

- `Tables<"profiles">` resolves to the same `Row` shape (same columns, same nullability).
- `Database` type (used by `createClient<Database>()` in test-setup) resolves to a compatible schema structure. The generated `Database` type in `supabase.generated.ts` covers all real tables — the test setup's inline `Tables<T>` helper and `unknown`-typed stubs (`Organization`, `AdminUser`, etc.) must compile and function identically.
- No runtime behavior change — only import paths change.

### Files in Scope

| File                                              | Change                                    |
| ------------------------------------------------- | ----------------------------------------- |
| `src/types/database.ts`                           | Delete                                    |
| `src/contexts/AuthContext.tsx`                    | Import `Tables` from `@/types/supabase`   |
| `src/hooks/useAuth.ts`                            | Import `Tables` from `@/types/supabase`   |
| `src/components/profile/tabs/OverviewTab.tsx`     | Import `Tables` from `@/types/supabase`   |
| `src/__tests__/integration/helpers/test-setup.ts` | Import `Database` from `@/types/supabase` |

### Known Compatible Tables

| From `database.ts` | In generated types? |
| ------------------ | ------------------- |
| `profiles`         | ✅ Yes              |
| `user_favorites`   | ✅ Yes              |
| `products`         | ✅ Yes              |

### Refactor-Only

No behavioral scenarios. Import paths change only. `Tables<"profiles">` yields same types. TypeScript compilation is the sole correctness check.

---

## Item 2.3 — Connect Sentry to Error Handler

### Scope

Add `Sentry.captureException(err)` in `handleApiError()` (comprehensive-handler.ts) when non-operational errors are caught and in `appLogger.error()` (logger/index.ts) when `Error` objects are logged. Remove the stale `SentryIntegration` placeholder in `error-reporting/index.ts`.

### Invariants (Must Preserve)

- All existing error handling logic, response formatting, and logging behavior is preserved.
- Sentry integration is additive — it runs alongside existing logging, never replaces it.
- `Sentry.captureException()` is called ONLY after all existing logging/response logic completes successfully.
- `@sentry/nextjs` is already initialized in `sentry.client.config.ts` (DSN-gated: only initializes if `NEXT_PUBLIC_SENTRY_DSN` is set). Server-side Sentry is also configured in `sentry.server.config.ts` (only if `SENTRY_DSN` is set). The `captureException` call is safe regardless of initialization state — Sentry's SDK handles `noop` gracefully.
- `global-error.tsx` already calls `Sentry.captureException(error)` — no change to that file.

### Files in Scope

| File                                      | Change                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/errors/comprehensive-handler.ts` | Add `import * as Sentry from "@sentry/nextjs"` + `Sentry.captureException(appError)` in `handleApiError` for non-operational errors       |
| `src/lib/logger/index.ts`                 | Add `import * as Sentry from "@sentry/nextjs"` + `Sentry.captureException(error)` in `appLogger.error()` when an `Error` object is passed |
| `src/lib/error-reporting/index.ts`        | Remove stale `SentryIntegration` placeholder object                                                                                       |

### Additive Safety

- `Sentry.captureException()` is fire-and-forget — it never throws. If Sentry is uninitialized, the SDK silently no-ops.
- Both insertions happen AFTER existing logic (logging, response formatting), so Sentry failure cannot block the primary error path.
- The `SentryIntegration` placeholder in `error-reporting/index.ts` is dead code — nothing imports or uses it. Safe to remove.

### Refactor-Only

No behavioral scenarios. Sentry capture is additive. All error responses, log shapes, and control flow remain identical.

---

## Item 2.6 — Landing Page to Server Component

### Scope

Remove the `"use client"` directive from `src/app/page.tsx`. All child components (`HeroSection`, `FeaturesSection`, `BenefitsSection`, etc.) already have their own `"use client"` directives — they remain Client Components. The page component itself only composes children and renders static layout markup.

### Invariants (Must Preserve)

- Visual output is identical — same DOM structure, same styles, same sections in the same order.
- All child components (`LandingHeader`, `HeroSection`, `ProblemSolutionSection`, `FeaturesSection`, `BenefitsSection`, `SupportImplementationSection`, `PricingSection`, `CTASection`, `LandingFooter`) remain unchanged.
- Each child that needs interactivity or hooks keeps its own `"use client"` directive.
- No runtime behavior change — the page was already a thin wrapper with zero client-side logic of its own.

### Files in Scope

| File               | Change                                                  |
| ------------------ | ------------------------------------------------------- |
| `src/app/page.tsx` | Remove line `"use client";` (line 1). No other changes. |

### Verification

After removal, a `grep '"use client"' src/app/page.tsx` MUST return no matches.

### Refactor-Only

No behavioral scenarios. The page's only job is composition — it has no state, no effects, no event handlers, no hooks. Children retain their Client Component status.

---

## Coverage Summary

| Item                                   | Type                 | Behavioral Scenarios |
| -------------------------------------- | -------------------- | -------------------- |
| 2.1 — Unify error hierarchies          | Structural refactor  | None                 |
| 2.2 — Kill `database.ts`               | Import migration     | None                 |
| 2.3 — Connect Sentry to error handler  | Additive integration | None                 |
| 2.6 — Landing page to Server Component | Directive removal    | None                 |

## Verification Strategy (All Items)

- `npm run type-check` — verifies all import paths, type compatibility, and instanceof patterns
- `npm run test:run` — verifies no behavioral regressions
- `npm run build` — verifies production build succeeds with new import paths
- Grep `from "@/types/database"` — must return 0 matches after 2.2
- Grep `"use client"` in `src/app/page.tsx` — must return 0 matches after 2.6
