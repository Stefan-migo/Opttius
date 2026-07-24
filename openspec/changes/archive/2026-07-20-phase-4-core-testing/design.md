# Design: Phase 4 Core Business Testing

## Technical Approach

Four new test files, zero production code changes. Extend existing `test-setup.ts` with 3 helpers, then write 2 E2E + 2 integration test files. Both suites guard on `SUPABASE_SERVICE_ROLE_KEY` — skip if absent, never fail.

Hybrid E2E: API-seed test data via `page.request`, verify via minimal UI assertions. Integration: service-role client via `makeAuthenticatedRequest`, free of UI dependencies.

## Architecture Decisions

| Decision              | Options                                   | Tradeoffs                                                                                                                               | Choice                                                      |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| E2E data strategy     | Pure UI vs API seeding                    | UI is slow, brittle; API seeding is fast, reliable. E2E already uses `page.request` in existing tests                                   | **API seeding + minimal UI verify**                         |
| Cash session for E2E  | Open via API vs use super admin bypass    | Opening cash session adds complexity; `selected_branch_id: "global"` in storage state already bypasses caja check                       | **Use super admin bypass** — no cash session needed for E2E |
| Helper location       | New file vs extend `test-setup.ts`        | New file = import overhead; `test-setup.ts` already has the pattern and `createTestServiceRoleClient`                                   | **Extend existing `test-setup.ts`**                         |
| Integration test flow | Unit-test services vs hit real API routes | Testing services directly skips auth middleware and validation; API route tests cover the full integration layer the existing tests use | **Hit real API routes** via `makeAuthenticatedRequest`      |

## Data Flow

### E2E: POS Checkout (4.1)

```
page.request POST /api/admin/products → create physical product (frame)
page.request POST /api/admin/cash-register/open → open session
Navigate to /admin/cash-register (UI)
Add product to cart (UI)
Complete payment (UI)
Verify order appears (UI)
```

### E2E: Quote → Work Order → POS (4.2)

```
page.request POST /api/admin/quotes → create quote with frame + lens
page.request POST /api/admin/quotes/[id]/convert → create work order
page.request POST /api/admin/work-orders/[id]/status → advance to ready
Navigate to /admin/pos (UI)
Find order by work order reference (UI)
Pay remaining balance (UI)
Verify payment recorded (UI)
```

### Integration: Split Payment (4.3)

```
test-setup → createTestOrganization + createTestUser + createTestBranch + assignTestUserBranchAccess
           → createTestProduct + createTestPosSession
makeAuthenticatedRequest POST /api/admin/pos/process-sale
  body: { items: [...], payments: [{method:"cash", amount:5000}, {method:"credit_card", amount:5000}], total_amount: 10000 }
Assert: response 200, order_payments has 2 records, totals match
```

### Integration: Inventory (4.4)

```
test-setup → org + user + branch + product
           → createTestProductBranchStock(productId, branchAId, 10)
makeAuthenticatedRequest POST /api/admin/pos/process-sale (item qty=3)
Assert: stock reduced to 7
Edge: stock insufficient → error
```

## New Test Helpers

All extend `src/__tests__/integration/helpers/test-setup.ts`, use `createTestServiceRoleClient()`, throw on error (same pattern as existing helpers).

### `createTestPosSession(branchId: string, cashierId: string)`

Inserts into `pos_sessions`:

| Column                | Value                      |
| --------------------- | -------------------------- |
| `branch_id`           | branchId param             |
| `cashier_id`          | cashierId param            |
| `status`              | `open`                     |
| `opening_cash_amount` | `0`                        |
| `opening_time`        | `new Date().toISOString()` |

Returns `{ id, branch_id, status, opening_time }`.

### `createTestProductBranchStock(productId: string, branchId: string, quantity: number)`

Upserts into `product_branch_stock` (UNIQUE on product_id + branch_id):

| Column              | Value                         |
| ------------------- | ----------------------------- |
| `product_id`        | productId param               |
| `branch_id`         | branchId param                |
| `quantity`          | quantity param (default `10`) |
| `reserved_quantity` | `0`                           |

Returns `{ id, product_id, branch_id, quantity }`.

### `createTestOrderPayment(orderId: string, sessionId: string, method: string, amount: number)`

Inserts into `order_payments`:

| Column           | Value                                                |
| ---------------- | ---------------------------------------------------- |
| `order_id`       | orderId param                                        |
| `pos_session_id` | sessionId param                                      |
| `payment_method` | method param (`cash`, `debit`, `credit`, `transfer`) |
| `amount`         | amount param                                         |
| `paid_at`        | `new Date().toISOString()`                           |

Returns `{ id, order_id, amount, payment_method, pos_session_id }`.

### Error Handling

All three follow existing pattern: catch Supabase error, `throw new Error("Failed to create X: ${error.message}")`. No silent failures.

## File Changes

| File                                                         | Action | Description                                                                          |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------ |
| `src/__tests__/integration/helpers/test-setup.ts`            | Modify | Add `createTestPosSession`, `createTestProductBranchStock`, `createTestOrderPayment` |
| `src/__tests__/integration/api/split-payment.test.ts`        | Create | Split payment + pending balance integration tests                                    |
| `src/__tests__/integration/api/inventory-adjustment.test.ts` | Create | Stock add/reduce/transfer integration tests                                          |
| `e2e/pos-checkout.spec.ts`                                   | Create | POS checkout E2E (add product, pay, verify)                                          |
| `e2e/quote-workorder-pos.spec.ts`                            | Create | Quote → Work Order → POS lifecycle E2E                                               |
| `vitest.config.ts`                                           | Modify | Coverage: lines 50→70, branches 40→60, functions 45→65, statements 50→70             |

## Testing Strategy

| Layer             | What                                                  | Approach                                              |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Integration (4.3) | Split payment, overpayment rejection, partial payment | Hit process-sale API, assert `order_payments` records |
| Integration (4.4) | Stock add, reduce, transfer, edge cases               | Hit process-sale + direct stock queries               |
| E2E (4.1)         | POS checkout flow                                     | API seed → UI interaction → verify                    |
| E2E (4.2)         | Quote → Work Order → POS lifecycle                    | API seed (quote + convert + advance) → UI pay         |

Both integration suites guard with `describe.skipIf(!hasSupabaseInfra)` and use `beforeAll` infrastructure check. E2E uses storageState for auth and skips if env vars missing.

## Migration / Rollout

No migration required. Test files are additive — delete any that fail. Revert `vitest.config.ts` if coverage threshold not met.

## Open Questions

None.
