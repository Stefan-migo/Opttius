# Proposal: Phase 4 Core Business Testing

## Intent

Phase 4 of the Production Readiness Roadmap. Testing audit went from C → C (+71% test files), but core business flows (POS, payments, inventory) remain uncovered. Without these tests, regressions in critical revenue paths go undetected.

## Scope

### In Scope

- **4.1** E2E: POS checkout flow (Playwright)
- **4.2** E2E: Quote → Work Order → POS payment lifecycle (Playwright)
- **4.3** Integration: Split payment + pending balance (Vitest)
- **4.4** Integration: Inventory adjustment — add, transfer, reduce stock (Vitest)
- **4.5** Coverage thresholds: lines 50→70, branches 40→60, functions 45→65, statements 50→70

### Out of Scope

- Unit tests for POS/work-order service layer
- E2E for CAJA module (cash register open/close)
- Performance/load testing
- CI pipeline changes (Phase 1 handles this)

## Capabilities

### New Capabilities

None — these are tests of existing capabilities, not new features.

### Modified Capabilities

None — spec-level behavior is unchanged.

## Approach

**E2E (Playwright)**: Use existing `e2e/storageState/admin.json` for auth. Hybrid approach — API seeding via `page.request` context for data setup, then minimal UI verification. Storage state uses `selected_branch_id: "global"` (super admin bypasses caja check at POS).

**Integration (Vitest)**: Extend `src/__tests__/integration/helpers/test-setup.ts` with 3 new helpers before writing tests:

- `createTestPosSession(orgId, branchId)` — creates open `pos_session`
- `createTestProductBranchStock(productId, branchId, qty)` — upserts stock via `product_branch_stock`
- `createTestOrderPayment(orderId, sessionId, method, amount)` — inserts `order_payments` record

Both suites run against real Supabase local. Guard with `.skipIf(!hasSupabaseInfra)`.

## Affected Areas

| Area                                                         | Impact   | Description                          |
| ------------------------------------------------------------ | -------- | ------------------------------------ |
| `e2e/pos-checkout.spec.ts`                                   | New      | POS E2E test                         |
| `e2e/quote-workorder-pos.spec.ts`                            | New      | Workflow lifecycle E2E               |
| `src/__tests__/integration/api/split-payment.test.ts`        | New      | Split payment integration            |
| `src/__tests__/integration/api/inventory-adjustment.test.ts` | New      | Inventory integration                |
| `src/__tests__/integration/helpers/test-setup.ts`            | Modified | +3 helpers (session, stock, payment) |
| `vitest.config.ts`                                           | Modified | Coverage thresholds                  |

## Risks

| Risk                               | Likelihood | Mitigation                                                       |
| ---------------------------------- | ---------- | ---------------------------------------------------------------- |
| Supabase local infra unavailable   | High       | `.skipIf` guard — tests skip, not fail                           |
| StorageState admin session expires | Medium     | Document refresh procedure in docs                               |
| POS requires open cash session     | Medium     | Super admin (`global` branch) bypasses caja; tests use that path |

## Rollback Plan

Revert `vitest.config.ts` thresholds if coverage not met. Test files are additive — delete any that fail. No production code changes.

## Dependencies

- Supabase local running (`supabase start`)
- Playwright E2E credentials in `.env.local`
- Node 18+

## Success Criteria

- [ ] `npm run test:integration` passes (4.3, 4.4)
- [ ] `npx playwright test e2e/pos-checkout.spec.ts e2e/quote-workorder-pos.spec.ts` passes (4.1, 4.2)
- [ ] `npm run test:coverage` reports ≥70/60/65/70 (4.5)
