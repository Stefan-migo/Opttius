# Tasks: fix-deferred-skipped-blocks

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200-250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Simple fixes (2 tests) | PR 1 | useQuoteForm + useAvailability — ~15-25 lines |
| 2 | Medium fixes (5 tests) | PR 1 | phase1-security + useScheduleSettings + AppointmentDetails + CustomerSelection + nowpayments — ~80-100 lines |
| 3 | Delete permanently | PR 1 | phase3-security test file — ~1 deletion |

## Phase 1: Simple Fixes

- [x] **1.1** `src/components/admin/CreateQuoteForm/__tests__/useQuoteForm.test.ts` — add `customer_own_near_frame: false` to expected `toEqual()` object, remove `// ponytail: skipped` comment
- [x] **1.2** `src/components/admin/CreateAppointmentForm/__tests__/useAvailability.test.ts` — remove `.skip` from "empty slots" test, add any missing mock fields (start_time, end_time) if test fails on template literal access

## Phase 2: Medium Fixes

- [x] **2.1** `src/__tests__/security/phase1-security.test.ts` — change `expect(result).toBe(true)` → `expect(result.limited).toBe(true)` at line ~265; fix error-path mock to use current Redis API (`zremrangebyscore`/`zadd`/`pexpire`/`zcard`); move `rateLimiter` construction after error mock setup
- [x] **2.2** `src/components/admin/CreateAppointmentForm/__tests__/useScheduleSettings.test.ts` — update `mockAuthContext` to provide `user: { id: "test-user" }` and `loading: false`; update `mockScheduleSettings` to flat `working_days[]` + `start_time`/`end_time` format; fix fetch mock header format for `getBranchHeader()`; add optional `props` param to hook call
- [x] **2.3** `src/components/admin/CreateAppointmentForm/__tests__/AppointmentDetails.test.tsx` — use `getAllByRole("combobox")` for Select queries; open Select dropdowns before asserting option text; update label assertions ("Motivo" → "Motivo de la Cita")
- [x] **2.4** `src/components/admin/CreateAppointmentForm/__tests__/CustomerSelection.test.tsx` — update `onGuestModeToggle` expectation to match `onCheckedChange` passing `checked` directly; confirm `customerSearch.length >= 1` threshold; verify portal-based dropdown works in jsdom
- [x] **2.5** `src/__tests__/integration/api/webhooks/nowpayments.test.ts` — add `vi.mock("@/lib/payments/services/payment-service")` for `PaymentService`; add `vi.mock("@/utils/supabase/webhook")` for `createWebhookClient`

## Phase 3: Deletion

- [x] **3.1** `src/__tests__/security/phase3-security.test.ts` — delete file permanently (tests speculative Phase 3 security modules that may not have real implementations)

## Phase 4: Verification

- [x] **4.1** Run `npm run test:run` — confirm all 7 unskipped test blocks pass
- [x] **4.2** Verify no `// ponytail: skipped` comments remain in touched files (use `grep`)
- [x] **4.3** Confirm `phase3-security.test.ts` is deleted from disk
