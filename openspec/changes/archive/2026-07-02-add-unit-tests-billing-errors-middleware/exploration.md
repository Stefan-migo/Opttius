## Exploration: add-unit-tests-billing-errors-middleware

### Current State

The project uses **Vitest** (`vitest.config.ts`) with `globals: true`, `jsdom` environment, and `@testing-library/jest-dom`. Tests are run via `npm test` (vitest) or `npm run test:unit` (unit-only). Coverage is configured with v8 provider.

**Approximate test count: ~80+ test files across unit, integration, and security layers.**

The billing, error handling, and middleware domains have significant untested code despite being core infrastructure.

---

### Billing Files

#### Source files (src/lib/payments/)
| File | Lines | Has Tests? |
|------|-------|------------|
| `src/lib/payments/index.ts` | 42 | ❌ NO |
| `src/lib/payments/interfaces.ts` | 67 | ❌ NO (types only) |
| `src/lib/payments/constants.ts` | 27 | ❌ NO |
| `src/lib/payments/services/payment-service.ts` | 511 | ❌ **NO — CRITICAL GAP** |
| `src/lib/payments/flow/gateway.ts` | ~200 | ✅ `src/__tests__/unit/lib/payments/flow-gateway.test.ts` |
| `src/lib/payments/mercadopago/gateway.ts` | — | ✅ `mercadopago-gateway.test.ts` |
| `src/lib/payments/mercadopago/webhook-validator.ts` | — | ✅ `mercadopago-webhook-validator.test.ts` |
| `src/lib/payments/mercadopago/webhook-parser.ts` | — | ✅ `mercadopago-webhook-parser.test.ts` |
| `src/lib/payments/nowpayments/gateway.ts` | — | ✅ `nowpayments-gateway.test.ts` |
| `src/lib/payments/paypal/gateway.ts` | — | ✅ `paypal-gateway.test.ts`, `paypal-gateway-validate.test.ts` |
| `src/lib/saas/subscription-status.ts` | — | ❌ NO (but covered by integration tests) |
| `src/lib/cash-register/payment-aggregator.ts` | — | ✅ `src/lib/cash-register/__tests__/payment-aggregator.test.ts` |

**Key untested billing files:**
- **`payment-service.ts`** — 511 lines of core business logic: `createPayment`, `updatePaymentStatus`, `updatePaymentFromWebhook`, `fulfillOrder`, `applyPaymentSuccessToOrganization` (tier upgrade, subscription management, email notifications). **Highest priority gap.**
- **`index.ts`** — `PaymentGatewayFactory` factory + re-exports

#### Related billing types
| File | Lines | Has Tests? |
|------|-------|------------|
| `src/types/payment.ts` | — | ❌ NO (types only) |

---

### Error Handling Files

#### Source files
| File | Lines | Has Tests? |
|------|-------|------------|
| `src/lib/errors/comprehensive-handler.ts` | **518** | ❌ **NO — CRITICAL GAP** |
| `src/lib/api/errors.ts` | 192 | ❌ NO (exports comprehensive-handler + adds APIError, withErrorHandler, asyncHandler) |
| `src/lib/api/services/errorService.ts` | 380 | ❌ NO |
| `src/lib/validation/errors.ts` | 9 | ❌ NO (trivial, just class def) |
| `src/lib/profile/error-messages.ts` | 40 | ✅ `src/__tests__/unit/lib/profile/error-messages.test.ts` |
| `src/app/global-error.tsx` | — | ❌ NO |
| `src/app/error.tsx` | — | ❌ NO |
| `src/app/admin/error.tsx` | — | ❌ NO |

**Key untested error files:**
- **`comprehensive-handler.ts`** — Core error infrastructure: `ApplicationError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `PaymentError`, `DatabaseError`, `ExternalServiceError`, `BusinessLogicError`, `handleApiError`, `formatErrorResponse`, `logError`, `withErrorHandling`, `safeExecute`, `handleDatabaseError`, `mapPostgresError`, `validateRequiredFields`, `validateTypes`, `sanitizeInput`, `generateRequestId`. 518 lines, zero tests.
- **`api/errors.ts`** — Re-exports from comprehensive-handler, plus own `APIError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `PaymentError` classes, plus `createErrorResponse`, `createSuccessResponse`, `withErrorHandler`, `asyncHandler`.
- **`errorService.ts`** — Client-side service: `extractErrorMessage`, `classifyError`, `handleApiError`, `getUserFriendlyMessage`, `withErrorHandling`. Depends on `toast` from `sonner`.

---

### Middleware Files

#### Source files
| File | Lines | Has Tests? |
|------|-------|------------|
| `src/middleware.ts` | 196 | ❌ NO (edge middleware — CSP, auth, i18n) |
| `src/lib/api/middleware.ts` | 239 | ❌ **NO** |
| `src/lib/api/branch-middleware.ts` | 326 | ❌ **NO** |
| `src/lib/api/root-middleware.ts` | ~120 | ✅ `src/__tests__/unit/lib/api/root-middleware.test.ts` |
| `src/lib/api/validation.ts` | 442 | ❌ NO (partially covered by schema tests) |
| `src/lib/api/csrf.ts` | 51 | ✅ `src/__tests__/unit/lib/api/csrf.test.ts` |
| `src/lib/validation/middleware.ts` | 342 | ❌ NO |
| `src/lib/rate-limiting/middleware.ts` | 230 | ✅ Rate limiter core tested (`rate-limiter.test.ts`) |
| `src/lib/middleware/error-handler.ts` | 357 | ❌ **NO** |
| `src/lib/middleware/enhanced-error-handler.ts` | 251 | ❌ **NO** |

**Key untested middleware files:**
- **`lib/api/middleware.ts`** — `requireAuth`, `requireRole`, `composeMiddleware`, `withCORS`, `logRequest`, `withRequestId`. Core API infrastructure.
- **`lib/api/branch-middleware.ts`** — `getBranchFromRequest`, `getOperativoContext`, `requireBranchAccess`. 326 lines, multi-tenant critical.
- **`lib/api/validation.ts`** — `validateRequestBody`, `validateQueryParams`, `parseAndValidateBody`, `sanitizeInput`. 442 lines.
- **`lib/middleware/error-handler.ts`** — `withErrorHandling`, `handleGet/Post/Put/Delete`, `validateRequestBody`, `validateQueryParams`, `parsePagination`, `successResponse`, `paginatedResponse`. 357 lines.
- **`lib/middleware/enhanced-error-handler.ts`** — `withEnhancedErrorHandling`, `withEnhancedValidation`, `RateLimitError`, `TimeoutError`. 251 lines.
- **`lib/validation/middleware.ts`** — `withBodyValidation`, `withQueryValidation`, etc. Zod-based. 342 lines.

---

### Existing Test Patterns

**Runner:** `vitest` (v4.x), configured in `vitest.config.ts`
**Command:** `npm test` (runs `vitest`)

**Test structure:**
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ModuleName } from "@/lib/path/to/module";

describe("ModuleName", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("methodName", () => {
    it("should do something specific", async () => {
      // Arrange
      // Act
      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

**Mock patterns used:**
1. **Module-level:** `vi.mock("@/utils/supabase/server")` with factory objects
2. **Environment:** `vi.stubEnv("KEY", "value")` (used in payment tests)
3. **Fetch:** `global.fetch = vi.fn().mockResolvedValue(...)` (used in gateway tests)
4. **Logger:** `vi.mock("@/lib/logger", () => ({ appLogger: { error: vi.fn(), debug: vi.fn() } }))`
5. **All mocks:** `vi.clearAllMocks()` in `beforeEach`

**Setup file:** `src/__tests__/setup.ts` — mocks `localStorage`, `IntersectionObserver`, `fetch`, `console.*`, provides `testUtils` (createMockUser, createMockOrganization, createMockResponse).

**Coverage:** v8 provider, exclusions for `node_modules/`, `src/__tests__/`, `*.d.ts`, `*.config.*`, `mockData/`, `types/`.

---

### Test Coverage Gaps Summary

| Priority | File | Lines | Description |
|----------|------|-------|-------------|
| 🔴 P0 | `src/lib/payments/services/payment-service.ts` | 511 | PaymentService — core billing logic, subscription/tier management |
| 🔴 P0 | `src/lib/errors/comprehensive-handler.ts` | 518 | All error classes + handleApiError, mapPostgresError, utilities |
| 🔴 P0 | `src/lib/api/errors.ts` | 192 | APIError classes + createErrorResponse, withErrorHandler, asyncHandler |
| 🟡 P1 | `src/lib/api/middleware.ts` | 239 | requireAuth, requireRole, composeMiddleware, CORS |
| 🟡 P1 | `src/lib/api/branch-middleware.ts` | 326 | Branch context middleware (multi-tenant critical) |
| 🟡 P1 | `src/lib/middleware/error-handler.ts` | 357 | withErrorHandling wrapper + HTTP verb wrappers + pagination |
| 🟡 P1 | `src/lib/middleware/enhanced-error-handler.ts` | 251 | Enhanced version with error reporting, Zod validation wrapper |
| 🟡 P1 | `src/lib/api/services/errorService.ts` | 380 | Client-side error service (extractMessage, classifyError, toast) |
| 🟡 P1 | `src/lib/api/validation.ts` | 442 | validateRequestBody, validateQueryParams, parseAndValidateBody |
| 🟡 P1 | `src/lib/validation/middleware.ts` | 342 | Zod-based withBodyValidation, withQueryValidation |
| 🟢 P2 | `src/middleware.ts` | 196 | Edge middleware (CSP, auth, i18n) — harder to unit test |
| 🟢 P2 | `src/lib/payments/index.ts` | 42 | PaymentGatewayFactory |
| 🟢 P2 | `src/lib/payments/constants.ts` | 27 | Payment constants |
| 🟢 P2 | `src/lib/saas/subscription-status.ts` | — | Subscription status helpers |

---

### Approaches

1. **Batch: comprehensive-handler + API errors first**
   - Test the error infrastructure (classes, handleApiError, mapPostgresError)
   - Then test the middleware that consumes it
   - Then test payment-service with mocked Supabase
   - Pros: Logical dependency order, reusable mocks
   - Cons: Slower to show results
   - Effort: Medium

2. **Priority-per-file: payment-service first (biggest biz risk)**
   - Test PaymentService first (mocked Supabase)
   - Then error classes, then middleware
   - Pros: Highest value first, fastest risk reduction
   - Cons: Need Supabase mock patterns
   - Effort: High

3. **Co-located by domain (recommended)**
   - Write tests alongside source files in `src/__tests__/unit/lib/`
   - Each test file mirrors its source 1:1
   - Follow existing patterns exactly
   - Pros: Consistent with project convention, easy to maintain
   - Cons: None significant
   - Effort: Medium/High

### Recommendation

**Approach 3: Co-located by domain.** Follow project conventions exactly. Write tests in `src/__tests__/unit/lib/` paths that mirror source paths. Start with **comprehensive-handler + API errors** (clean unit tests, no DB dependency), then **middleware** (mock NextRequest/NextResponse), then **payment-service** (mock Supabase client).

### Risks

- `payment-service.ts` depends heavily on Supabase client — needs careful mocking of chain `.from().select().eq().single()` patterns. Pattern exists in `root-middleware.test.ts`.
- `middleware.ts` (edge middleware) uses `NextRequest` from `next/server` — needs `vi.mock("next/server")`. Already done in `root-middleware.test.ts`.
- `errorService.ts` depends on `sonner` toast — needs `vi.mock("sonner")`.
- Some functions in `comprehensive-handler.ts` (`validateRequiredFields`, `validateTypes`) are simple pure functions — easy wins.

### Ready for Proposal

**Yes.** Complete landscape mapped. Clear priorities identified. Existing test patterns documented. Ready for proposal/spec/tasks phase.

### Key Files for Reference

- `src/lib/errors/comprehensive-handler.ts` — 518 lines, 0% coverage
- `src/lib/api/errors.ts` — 192 lines, 0% coverage
- `src/lib/payments/services/payment-service.ts` — 511 lines, 0% coverage
- `src/lib/middleware/error-handler.ts` — 357 lines, 0% coverage
- `src/lib/middleware/enhanced-error-handler.ts` — 251 lines, 0% coverage
- `src/lib/api/middleware.ts` — 239 lines, 0% coverage
- `src/lib/api/branch-middleware.ts` — 326 lines, 0% coverage
- `src/lib/api/validation.ts` — 442 lines, 0% coverage
- `src/lib/api/services/errorService.ts` — 380 lines, 0% coverage
- `src/lib/validation/middleware.ts` — 342 lines, 0% coverage
- `src/__tests__/setup.ts` — Test infrastructure (mocks, utilities)
- `vitest.config.ts` — Vitest configuration
