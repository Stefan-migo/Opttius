# Tasks: fix-complex-skipped-blocks

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180–290 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes (force-chained) |
| Suggested split | 3 stacked PRs to main (1 per block) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fix `analytics_tools.test.ts` | PR 1 → main | Smallest scope, lowest risk. Fast feedback. |
| 2 | Fix `phase2-security.test.ts` | PR 2 → main | Medium complexity. Independent of PR 1. |
| 3 | Fix `flow.test.ts` | PR 3 → main | Highest complexity. Independent of 1 & 2. |

All 3 blocks are independent — no shared dependencies. Stacked-to-main works because each diff is clean against main. Order is risk-ascending: easiest first, hardest last.

---

## Block 1: Fix `analytics_tools.test.ts`

- [ ] 1.1 Add `organizationId: "org-123"` to `mockContext` object
- [ ] 1.2 Consolidate competing mock strategies into one clean per-tool mock setup (remove duplicate/redundant mocks)
- [ ] 1.3 Remove `.skip` from `describe("Analytics Tools", ...)`
- [ ] 1.4 Verify: `npx vitest run src/__tests__/unit/lib/ai/tools/analytics_tools.test.ts --reporter=verbose`

**Files**: `src/__tests__/unit/lib/ai/tools/analytics_tools.test.ts`
**Dependencies**: None
**Risk**: Low
**Est. lines changed**: 40–60

## Block 2: Fix `phase2-security.test.ts`

- [ ] 2.1 Extract `makeEvent(overrides?)` helper to create valid `SecurityEvent` objects with defaults
- [ ] 2.2 Fix all `logEvent(...)` calls to use 3-arg signature: `logEvent(event.eventType, event.details || {}, { userId: ..., ipAddress: ... })`
- [ ] 2.3 Replace severity assertion loop with dynamic assertion per event type
- [ ] 2.4 Fix magic number `14` → `10` in flush test assertion
- [ ] 2.5 Remove or correct `payment.webhook_tampered` immediate alert assertion
- [ ] 2.6 Remove `.skip` from `describe("Phase 2 Security Implementation Tests", ...)`
- [ ] 2.7 Verify: `npx vitest run src/__tests__/security/phase2-security.test.ts --reporter=verbose`

**Files**: `src/__tests__/security/phase2-security.test.ts`
**Dependencies**: None
**Risk**: Medium
**Est. lines changed**: 60–100

## Block 3: Fix `flow.test.ts`

- [ ] 3.1 Rewrite mocks: mock `@/lib/payments/flow/gateway` and `@/lib/payments/services/payment-service` with actual methods (`recordWebhookEvent`, `getPaymentByGatewayPaymentIntentId`, `updatePaymentStatus`, `markWebhookEventAsProcessed`, `fulfillOrder`) following the `paypal.test.ts` pattern
- [ ] 3.2 Mock `@/utils/supabase/webhook` → `{ createWebhookClient: vi.fn(() => ({})) }`
- [ ] 3.3 Update assertions to match route's actual response `{ received: true }` and status codes
- [ ] 3.4 Remove or rework `validateWebhookSignature` test
- [ ] 3.5 Remove `.skip` from `describe("Flow Webhook API", ...)`
- [ ] 3.6 Verify: `npx vitest run src/__tests__/integration/api/webhooks/flow.test.ts --reporter=verbose`

**Files**: `src/__tests__/integration/api/webhooks/flow.test.ts`
**Dependencies**: None
**Risk**: Medium-High (may need to read actual route handler to get response shape right)
**Est. lines changed**: 80–130

## Integration

- [ ] 4.1 Run full suite: `npx vitest run`
- [ ] 4.2 Verify no regressions (0 failures across all tests)
