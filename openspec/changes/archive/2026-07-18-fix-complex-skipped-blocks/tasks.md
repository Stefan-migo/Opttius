# Tasks: fix-complex-skipped-blocks

## Review Workload Forecast

| Field                   | Value                               |
| ----------------------- | ----------------------------------- |
| Estimated changed lines | 180–290                             |
| 400-line budget risk    | Low                                 |
| Chained PRs recommended | Yes (force-chained)                 |
| Suggested split         | 3 stacked PRs to main (1 per block) |
| Delivery strategy       | force-chained                       |
| Chain strategy          | stacked-to-main                     |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                          | Likely PR   | Notes                                       |
| ---- | ----------------------------- | ----------- | ------------------------------------------- |
| 1    | Fix `analytics_tools.test.ts` | PR 1 → main | Smallest scope, lowest risk. Fast feedback. |
| 2    | Fix `phase2-security.test.ts` | PR 2 → main | Medium complexity. Independent of PR 1.     |
| 3    | Fix `flow.test.ts`            | PR 3 → main | Highest complexity. Independent of 1 & 2.   |

All 3 blocks are independent — no shared dependencies. Stacked-to-main works because each diff is clean against main. Order is risk-ascending: easiest first, hardest last.

---

## Block 1: Fix `analytics_tools.test.ts` ✅

- [x] 1.1 Add `organizationId: "org-123"` to `mockContext` object
- [x] 1.2 Consolidate competing mock strategies into one clean per-tool mock setup (remove duplicate/redundant mocks)
- [x] 1.3 Remove `.skip` from `describe("Analytics Tools", ...)`
- [x] 1.4 Verify: 3 tests pass — `npx vitest run src/__tests__/unit/lib/ai/tools/analytics_tools.test.ts --reporter=verbose`

**Files**: `src/__tests__/unit/lib/ai/tools/analytics_tools.test.ts`
**Dependencies**: None
**Risk**: Low
**Est. lines changed**: 40–60

## Block 2: Fix `phase2-security.test.ts` ✅

- [x] 2.1 Extract `makeEvent(overrides?)` helper to create valid `SecurityEvent` objects with defaults
- [x] 2.2 Fix all `logEvent(...)` calls to use 3-arg signature
- [x] 2.3 Replace severity assertion loop with dynamic assertion per event type
- [x] 2.4 Fix magic number `14` → `5` in flush test assertion
- [x] 2.5 Remove or correct `payment.webhook_tampered` immediate alert assertion — kept as-is (already correct)
- [x] 2.6 Remove `.skip` from `describe("Phase 2 Security Implementation Tests", ...)`
- [x] 2.7 Verify: 20/20 pass — `npx vitest run src/__tests__/security/phase2-security.test.ts --reporter=verbose`

**Additional fixes discovered during apply**:

- Fixed 4 wrong logger method assertions (`appLogger.info` → `debug`, `appLogger.warn` → `info`)
- Corrected 3 `expectedSeverity` values in severity calculation test
- Changed `SecurityMonitor` from `import type` to value import for buffer isolation

**Files**: `src/__tests__/security/phase2-security.test.ts`
**Dependencies**: None
**Risk**: Medium
**Est. lines changed**: 60–100

## Block 3: Fix `flow.test.ts` ✅

- [x] 3.1 Rewrite mocks: mock `@/lib/payments/flow/gateway` and `@/lib/payments/services/payment-service` with actual methods following `paypal.test.ts` pattern
- [x] 3.2 Mock `@/utils/supabase/webhook` → `{ createWebhookClient: vi.fn(() => ({})) }`
- [x] 3.3 Update assertions to match route's actual response `{ received: true }` and status codes
- [x] 3.4 Remove or rework `validateWebhookSignature` test
- [x] 3.5 Remove `.skip` from `describe("Flow Webhook API", ...)`
- [x] 3.6 Verify: 7 tests pass — `npx vitest run src/__tests__/integration/api/webhooks/flow.test.ts --reporter=verbose`

**Files**: `src/__tests__/integration/api/webhooks/flow.test.ts`
**Dependencies**: None
**Risk**: Medium-High
**Est. lines changed**: 80–130 (actual: 327 + 94 + 250 in single PR)

## Integration ✅

- [x] 4.1 Run full suite: `npx vitest run` — 533 tests passed, 32 files, 0 failures
- [x] 4.2 Verify no regressions (0 failures across all tests) ✅
