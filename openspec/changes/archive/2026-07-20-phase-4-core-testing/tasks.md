# Tasks: Phase 4 Core Business Testing

## Review Workload Forecast

| Field                   | Value                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Estimated changed lines | 900-1100 (6 files: 4 new, 1 helper, 1 config)                                                   |
| 400-line budget risk    | High                                                                                            |
| Chained PRs recommended | Yes                                                                                             |
| Suggested split         | PR 1: Test helpers → PR 2: Integration tests → PR 3: E2E POS → PR 4: E2E lifecycle + thresholds |
| Delivery strategy       | auto-chain (force-chained)                                                                      |
| Chain strategy          | stacked-to-main                                                                                 |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal                                              | Likely PR | Notes                                               |
| ---- | ------------------------------------------------- | --------- | --------------------------------------------------- |
| 1    | Helpers in test-setup.ts                          | PR 1      | Base; required by both integration tests            |
| 2    | Integration tests (split-payment + inventory)     | PR 2      | Base = main; depends on PR 1                        |
| 3    | E2E: POS checkout                                 | PR 3      | Base = main; independent of PR 2                    |
| 4    | E2E: Quote→WO→POS lifecycle + coverage thresholds | PR 4      | Base = main; depends on PR 3 infra; thresholds last |

## Phase 1: Helpers — `test-setup.ts` (Foundation)

- [x] 1.1 Add `createTestPosSession(branchId, cashierId)` — inserts `pos_sessions` row with status `open`, returns `{ id, branch_id, status, opening_time }`
- [x] 1.2 Add `createTestProductBranchStock(productId, branchId, qty = 10)` — upserts `product_branch_stock` with `reserved_quantity = 0`, returns `{ id, product_id, branch_id, quantity }`
- [x] 1.3 Add `createTestOrderPayment(orderId, sessionId, method, amount)` — inserts `order_payments` row with `paid_at` now, returns `{ id, order_id, amount, payment_method, pos_session_id }`
- [x] 1.4 Export all 3 new functions from `test-setup.ts` barrel

## Phase 2: Integration Tests (Independent of each other)

- [x] 2.1 Create `src/__tests__/integration/api/split-payment.test.ts` — test split payment (cash + card), overpayment behavior, partial payment with pending balance; guard with `describe.skipIf(!hasSupabaseInfra)`
- [x] 2.2 Create `src/__tests__/integration/api/inventory-adjustment.test.ts` — test stock add via product creation + stock upsert, stock reduce via process-sale (verify qty decreases), stock insufficient (verify 400/error), transfer between branches (increment A, decrement B); guard with `describe.skipIf(!hasSupabaseInfra)`

## Phase 3: E2E Tests (Playwright, Independent of integration)

- [x] 3.1 Create `e2e/pos-checkout.spec.ts` — API-seed product via `page.request`, process sale via API, navigate /admin/cash-register, verify order in Ventas/Órdenes tab; use storageState admin.json, super admin bypass for caja
- [x] 3.2 Create `e2e/quote-workorder-pos.spec.ts` — API-seed quote via `page.request`, convert quote to work order, advance status to ready, navigate POS UI, find order by reference, pay remaining balance, verify payment in UI; use same storageState pattern

## Phase 4: Coverage Thresholds (Must come last)

- [x] 4.1 Update `vitest.config.ts` thresholds: `lines: 70, branches: 60, functions: 65, statements: 70` — only after verifying all Phase 2+3 tests pass
