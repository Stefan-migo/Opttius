# Tasks: Add Unit Tests — Billing, Errors, Middleware

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Base | Est. Lines |
|------|------|----|------|------------|
| 1 | Error foundation | PR 1 | main | ~300 |
| 2 | API middleware | PR 2 | main | ~400 |
| 3 | Error middleware | PR 3 | main | ~250 |
| 4 | Payment + error service | PR 4 | main | ~400 |

## Phase 1: Error Foundation — PR 1 (~300 lines)

- [x] 1.1 `comprehensive-handler.test.ts` — test all error classes (ApplicationError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, PaymentError, DatabaseError, RateLimitError, ExternalServiceError, BusinessLogicError) construction, name, statusCode, toJSON
- [x] 1.2 Test `handleApiError` per error type → correct status + body; unknown error → 500
- [x] 1.3 Test `mapPostgresError` for codes 23505→Conflict, 23503→BusinessLogicError, 23514→ValidationError, 42P01→DatabaseError, unknown→DatabaseError
- [x] 1.4 Test `withErrorHandling` — success passthrough, caught error forwarded, suppressLogs, transformError, defaultValue
- [x] 1.5 Test `safeExecute` — success passthrough, re-throws by default, defaultValue, transformError, suppressLogs
- [x] 1.6 Test utilities: `validateRequiredFields`, `validateTypes`, `sanitizeInput`, `generateRequestId`, `formatErrorResponse`, `logError`
- [x] 1.7 `api/errors.test.ts` — `createErrorResponse`, `createSuccessResponse`, `withErrorHandler`, `asyncHandler`
- [x] 1.8 Trivial: `validation/errors.test.ts` (ValidationError), `payments/constants.test.ts` (PAYMENT_METHOD_MAP, PAYMENT_METHODS_ORDER_PAYMENTS), `payments/index.test.ts` (PaymentGatewayFactory.getGateway for each type + invalid)

## Phase 2: API Middleware — PR 2 (~400 lines)

- [x] 2.1 `api/middleware.test.ts` — `requireAuth` (authenticated, missing, expired), `requireRole` (match, mismatch), `composeMiddleware`, `withCORS`, `logRequest`, `withRequestId`
- [x] 2.2 `api/branch-middleware.test.ts` — `getBranchFromRequest` (header present, missing), `getOperativoContext`, `requireBranchAccess` (granted, denied, not found)
- [x] 2.3 `api/validation.test.ts` — `validateRequestBody` (valid, invalid, empty), `validateQueryParams`, `parseAndValidateBody`, `sanitizeInput`
- [x] 2.4 `validation/middleware.test.ts` — `withBodyValidation` (schema pass, fail), `withQueryValidation`
- Mock: `vi.mock("next/server")` for NextRequest/NextResponse; `vi.mock("@/utils/supabase/server")` for chain patterns

## Phase 3: Error Middleware — PR 3 (~250 lines)

- [x] 3.1 `middleware/error-handler.test.ts` — `withErrorHandling`, `handleGet`/`handlePost`/`handlePut`/`handleDelete`, `validateRequestBody`, `validateQueryParams`, `parsePagination`, `successResponse`, `paginatedResponse`
- [x] 3.2 `middleware/enhanced-error-handler.test.ts` — `withEnhancedErrorHandling` (wraps + reports), `withEnhancedValidation`, `RateLimitError`, `TimeoutError`
- Mock: `vi.mock("@/lib/logger")` for appLogger; mock Error classes

## Phase 4: Payment + Error Service — PR 4 (~400 lines)

- [x] 4.1 `payments/services/payment-service.test.ts` — `createPayment` (success, missing fields, org not found); `updatePaymentStatus` (PENDING→COMPLETED/FAILED/REFUNDED); `updatePaymentFromWebhook`; `fulfillOrder`; `applyPaymentSuccessToOrganization` (tier upgrade, subscription update, email trigger)
- [x] 4.2 `api/services/errorService.test.ts` — `extractErrorMessage`, `classifyError`, `handleApiError`, `getUserFriendlyMessage`, `withErrorHandling`, verify `toast.error` call
- Mock: Supabase `.from().select().eq().single()` chain (reuse root-middleware pattern); `vi.mock("sonner")` for toast
