# Proposal: Fix E2E-Revealed Bugs (product org derivation + quote convert lens defaults)

## Intent

Two confirmed bugs exposed by the skipped Playwright E2E specs:

1. `POST /api/admin/products` derives `organization_id` only from `admin_users.organization_id`, never from the effective branch. A super admin in global view creating a product for another org's branch lands the product (and its stock rows) in the wrong org → stock stays 0 at sale time.
2. Quote → work order convert passes `quote.lens_type` / `lens_material` raw into `lab_work_orders` (`NOT NULL`), so frame-only and contact-lens quotes 500 on convert. `process_pos_sale` already defaults these via `COALESCE`; the convert route does not.

Both fixes follow patterns already present (quote create, process-sale, product GET list, customer create).

## Scope

### In Scope

- **Bug 1**: branch-first org resolution for product POST: effective branch (`body.branch_id` → `x-branch-id` header → branchContext) → `branches.organization_id`, fallback `admin_users.organization_id`; super admin global with no branch → 400 (mirror `customersCreateService.ts:145-152`). Apply the same resolved org to `handleProductStock`.
- **Bug 2**: convert route defaults: `lens_type ?? 'single_vision'`, `lens_material ?? 'cr39'`, `frame_name ?? 'Marco'` (mirror `process_pos_sale` COALESCE); map literal `'Lentes de contacto'` → `'single_vision'`, keeping `contact_lens_*` fields (consistent with `buildItems.ts`).
- **Un-skip E2E**: `e2e/pos-checkout.spec.ts` and `e2e/quote-workorder-pos.spec.ts` re-enabled; product POSTs gain `branch_id` per D1.

### Out of Scope

- `import-wizard` (deprecated; Bulk replaced it) — not touched, may be deleted later.
- `import-csv` Excel support — documented feature gap, not in scope.
- Making `lab_work_orders.lens_type`/`lens_material` nullable (Option B rejected).
- Contact-lens quotes producing work orders (D2: they don't — direct delivery).

## Capabilities

### New Capabilities

- `admin-product-org-scoping`: branch-first org derivation contract for product create/list/stock; branch-required rule for super admin global.
- `quote-work-order-conversion`: convert defaults for missing lens/frame data and contact-lens mapping.

### Modified Capabilities

- None.

## Approach

- **Bug 1** (`productsCreateService.ts`): resolve branch context first (existing `getBranchContext`/`getBranchFromRequest`), look up `branches.organization_id` for the effective branch, fall back to admin org, and 400 for super admin global with no branch. Thread the resolved org into `buildProductPayload` + `handleProductStock`.
- **Bug 2** (`quotes/[id]/convert/route.ts`): apply `??` defaults and the `'Lentes de contacto'` → `'single_vision'` mapping in the work-order insert payload.

## Affected Areas

| Area                                                  | Impact   | Description                                                   |
| ----------------------------------------------------- | -------- | ------------------------------------------------------------- |
| `src/app/api/admin/products/route.ts`                 | Modified | POST org derivation from admin-only to branch-first           |
| `src/app/api/admin/products/productsCreateService.ts` | Modified | Branch→org resolution + 400 for super admin global w/o branch |
| `src/app/api/admin/products/productsCreateHelpers.ts` | Modified | `buildProductPayload`/`handleProductStock` use resolved org   |
| `src/app/api/admin/quotes/[id]/convert/route.ts`      | Modified | Lens/frame defaults + contact-lens mapping                    |
| `src/app/api/admin/products/import/route.ts`          | Review   | Verify branch→org rule in design phase (may need same fix)    |
| `e2e/pos-checkout.spec.ts`                            | Modified | Product POST sends `branch_id`; un-skip                       |
| `e2e/quote-workorder-pos.spec.ts`                     | Modified | Un-skip                                                       |

## Risks

| Risk                                                                              | Likelihood | Mitigation                                                            |
| --------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| Product POST now 400s for super admin global without branch (API contract change) | Med        | Matches customer-create pattern; UI already sends branch; E2E updated |
| Contact-lens literal mapping edge cases                                           | Low        | Mirrors `process_pos_sale`; keeps `contact_lens_*` fields             |
| `import` route retains admin-only org derivation                                  | Med        | Design-phase verification; same rule applied if needed                |
| E2E un-skip requires local Supabase + admin storage state                         | Med        | Documented test precondition, not a code change                       |

## Rollback Plan

Code-only change, no migration. Revert the three product files and the convert route (git revert of the fix commits); re-skip the two E2E specs. Org derivation falls back to pre-fix behavior.

## Dependencies

- Local Supabase stack (`project_id web`) + E2E admin `storageState` (`e2e-test@example.com`) + `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` for un-skip verification.

## Success Criteria

- [ ] Product POST (super admin global + branch) creates product and stock rows in the branch's org.
- [ ] Product POST (super admin global, no branch) returns 400.
- [ ] Convert succeeds for a frame-only quote; returns `workOrder.work_order_number`.
- [ ] Convert of a contact-lens quote maps to `single_vision` and preserves `contact_lens_*`.
- [ ] Both E2E specs pass un-skipped.

## Assumptions

- **D1**: Super admin global + product create + no branch → REQUIRE branch (400). Contract-based, not env-based. E2E specs updated to pass `branch_id`.
- **D2**: Contact-lens line items do NOT produce work orders (consistent with load-to-pos direct delivery and POS skill). Convert fix only touches frame/lens quotes.
