# Proposal: test-api-services

## Intent

5 API service files (`customerService`, `productService`, `quoteService`, `orderService`, `posService`) have zero test coverage. Regressions in these services — consumed by hooks/UI throughout admin — ship undetected. `appointmentService.test.ts` proves the mocking pattern works; extend it.

## Scope

### In Scope
- 5 test files, one per service, covering every exported function/method
- Each function: success path, error path (API error), edge cases (empty results, missing meta, null params)
- Service object barrel export verification per file

### Out of Scope
- Integration tests with real HTTP — pure Vitest unit tests
- agreementService, lensFamilyService, notificationService, etc. — separate change
- No production code changes

## Capabilities

None — pure test coverage. No behavioral or spec-level changes.

## Approach

One test file per service under `src/__tests__/unit/lib/api/services/`. Follow `appointmentService.test.ts` pattern.

**Mocks (all services):** `vi.mock("@/lib/api/client-helpers")` with inline `isSuccess`/`unwrapData` and a `globalThis`-shared mock `ApiClient`; `vi.mock("@/lib/api/services/errorService")` (`handleApiError` as noop); `vi.mock("sonner")`. Customer/product additionally mock `@/lib/utils/branch`. POS additionally mocks `@/lib/api/services/notificationService` (uses `success` + dynamic `import()` for `error`).

**Test files:**
- `src/__tests__/unit/lib/api/services/customerService.test.ts` — 7 functions (+ prescriptions)
- `src/__tests__/unit/lib/api/services/productService.test.ts` — 8 functions
- `src/__tests__/unit/lib/api/services/quoteService.test.ts` — 10 functions
- `src/__tests__/unit/lib/api/services/orderService.test.ts` — 9 functions
- `src/__tests__/unit/lib/api/services/posService.test.ts` — 6 class methods

## Affected Areas

| Area | Impact |
|------|--------|
| `src/__tests__/unit/lib/api/services/customerService.test.ts` | New |
| `src/__tests__/unit/lib/api/services/productService.test.ts` | New |
| `src/__tests__/unit/lib/api/services/quoteService.test.ts` | New |
| `src/__tests__/unit/lib/api/services/orderService.test.ts` | New |
| `src/__tests__/unit/lib/api/services/posService.test.ts` | New |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| POS dynamic `import()` of notificationService on error | Low | `vi.mock` hoisting covers it — mock module is returned |
| POS catches errors and returns null — harder to assert | Low | Assert return value + spy on `handleApiError` |

## Rollback Plan

Delete the 5 test files. No production code changed — instant revert.

## Dependencies

- Vitest already configured. `appointmentService.test.ts` in same dir as reference.

## Success Criteria

- [ ] `npx vitest run src/__tests__/unit/lib/api/services/` — all 6 test files pass
- [ ] Each file covers success, error, and ≥1 edge case per function group
- [ ] All existing tests still pass (`npm run test:run`)
- [ ] Coverage for `src/lib/api/services/` increases measurably from ~0%
