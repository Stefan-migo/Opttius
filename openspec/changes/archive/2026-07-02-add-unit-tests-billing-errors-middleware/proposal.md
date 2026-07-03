# Proposal: Add Unit Tests — Billing, Errors, Middleware

## Intent

Zero coverage on P0/P1 infrastructure. PaymentService handles real payments; comprehensive-handler catches every app error; middleware orchestrates auth, branch-scoping, and validation. Every deploy risks regressions these tests would catch.

Add vitest unit tests for the 9 untested P0/P1 files in billing, error handling, and middleware domains.

## Scope

### In Scope
- **P0 (3 files):** `comprehensive-handler.ts` (518 loc), `api/errors.ts` (192 loc), `payment-service.ts` (511 loc)
- **P1 (6 files):** `api/middleware.ts` (239), `branch-middleware.ts` (326), `middleware/error-handler.ts` (357), `enhanced-error-handler.ts` (251), `api/validation.ts` (442), `validation/middleware.ts` (342), `api/services/errorService.ts` (380)
- **Bonus (3 files):** `payments/index.ts` (42), `constants.ts` (27), `validation/errors.ts` (9)

### Out of Scope
- Gateway tests (flow, mercadopago, nowpayments, paypal — exist ✅)
- Root-middleware test (exists ✅)
- Edge middleware (`src/middleware.ts` — integration scope)
- Subscription status helpers (covered by integration)
- UI error pages (`global-error.tsx`, `error.tsx`)

## Capabilities

### New Capabilities
None — test-only change, no spec-level behavior changes.

### Modified Capabilities
None — no existing specs are modified.

## Approach

Co-located tests in `src/__tests__/unit/lib/` mirroring source paths. Follow project conventions: `describe/it`, `vi.mock()`, `vi.clearAllMocks()`, Arrange/Act/Assert.

Build order (dependency-driven):
1. Error classes + utilities (pure functions, zero deps)
2. API errors + response helpers
3. API middleware (mock NextRequest/NextResponse)
4. Validation middleware (mock Zod schemas)
5. Error middleware (mock error classes, logger)
6. Payment service (mock Supabase chain patterns)
7. Error service (mock sonner toast)

Reuse mock factories from `root-middleware.test.ts` for Supabase and NextRequest patterns.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/__tests__/unit/lib/errors/` | New | comprehensive-handler, api/errors |
| `src/__tests__/unit/lib/payments/` | New | payment-service, index, constants |
| `src/__tests__/unit/lib/api/` | New | middleware, branch-middleware, validation, errorService |
| `src/__tests__/unit/lib/middleware/` | New | error-handler, enhanced-error-handler |
| `src/__tests__/unit/lib/validation/` | New | middleware |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mock complexity (Supabase chain `.from().select().eq()`) | Med | Reuse pattern from `root-middleware.test.ts` |
| Flaky tests from async middleware timing | Low | `vi.useFakeTimers` for time-sensitive paths |
| Regressions from test-writing | Low | Read-only change — source files untouched |

## Rollback Plan

`git revert` the commit. No DB migrations, config changes, or runtime impact.

## Dependencies

- vitest + existing test infrastructure (`setup.ts`, mock patterns)
- Source files (read-only, no modifications)
- No external services or DB

## Success Criteria

- [ ] Each P0 file ≥ 80% line coverage
- [ ] 30+ test cases across all targeted files
- [ ] `npm test` passes with zero regressions
- [ ] All tests follow existing project patterns (`vi.mock`, `vi.clearAllMocks`, Arrange/Act/Assert)
