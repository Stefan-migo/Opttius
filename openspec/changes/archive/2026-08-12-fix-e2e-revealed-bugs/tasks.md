# Tasks: fix-e2e-revealed-bugs

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | ~50–60          |
| 400-line budget risk    | Low             |
| Chained PRs recommended | No              |
| Suggested split         | Single PR       |
| Delivery strategy       | auto-chain      |
| Chain strategy          | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                        | Likely PR        | Focused test command                                                                           | Runtime harness                                                                                | Rollback boundary                                                                 |
| ---- | ------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1    | Bug 1 + Bug 2 fixes + E2E un-skip (4 files) | PR 1 (base=main) | `npx playwright test e2e/pos-checkout.spec.ts e2e/quote-workorder-pos.spec.ts --project=admin` | Local Supabase (`project_id web`, seeded) + `npx playwright test --project=setup` + `.env.e2e` | git revert of `productsCreateService.ts` + `convert/route.ts`; re-skip both specs |

## Phase 1: RED — Un-skip E2E acceptance specs

- [x] 1.1 `e2e/pos-checkout.spec.ts` — remove `test.skip` (line 25); add `branch_id: "96823c54-347c-4dc9-9abd-51e2c8863618"` to product POST (64-70); replace tolerant fallback (149-155) with hard asserts (`expect(saleSucceeded).toBeTruthy()`, order_number + customer + `$10.000` visible)
- [x] 1.2 `e2e/quote-workorder-pos.spec.ts` — remove `test.skip` (line 27); add `branch_id: DEMO_BRANCH_ID` to product POST (67-73); replace tolerant fallback (207-213) with hard assert on `workOrder.work_order_number`
- [x] 1.3 Run both specs un-skipped → confirm they FAIL against current code (RED proof) — pos-checkout: order cell not visible (org mismatch); quote-workorder: convert 500 (NOT NULL lens_type)

## Phase 2: GREEN — Bug 1 product org derivation

- [x] 2.1 `src/app/api/admin/products/productsCreateService.ts` — rename param `organizationId` → `fallbackOrganizationId` (line 21; call site `route.ts` unchanged)
- [x] 2.2 Same file, after line 118 — super-admin-global 400: `{ error: "Como super administrador en vista global, debe especificar la sucursal para el producto", field: "branch_id" }` when `isGlobalView && isSuperAdmin && !productBranchId` (mirror `customersCreateService.ts:145-152`)
- [x] 2.3 Same file — resolve `resolvedOrg`: `productBranchId ? (await supabase.from("branches").select("organization_id").eq("id", productBranchId).single()).organization_id ?? fallback : fallback`
- [x] 2.4 Thread `resolvedOrg` into tier-limit (156), `buildProductPayload` (197), `handleProductStock` (262)
- [x] 2.5 `src/app/api/admin/products/productsCreateHelpers.ts` — add `ponytail:` comment noting org-wide stock branch (155-170) now unreachable via this route; no logic change

## Phase 3: GREEN — Bug 2 convert defaults

- [x] 3.1 `src/app/api/admin/quotes/[id]/convert/route.ts` — line 113: `frame_name: quote.frame_name || "Marco"`
- [x] 3.2 Line 121: `lens_type: quote.lens_type === "Lentes de contacto" ? "single_vision" : (quote.lens_type || "single_vision")`
- [x] 3.3 Line 123: `lens_material: quote.lens_material || "cr39"` (mirror `process_pos_sale` COALESCE; `contact_lens_*` fields 133-153 untouched)

## Phase 4: Verification

- [x] 4.1 `npx playwright test --project=setup` regenerates `.playwright/.auth/admin.json` (ran as admin-project dependency in every run)
- [x] 4.2 `npx playwright test e2e/pos-checkout.spec.ts --project=admin` passes (bug 1: sale stock 10→9 — verified in DB: stock row quantity 9 in branch org)
- [x] 4.3 `npx playwright test e2e/quote-workorder-pos.spec.ts --project=admin` passes (bug 2: convert + status advance)
- [x] 4.4 Manual API: `curl POST /api/admin/products` super admin, no branch → 400 (verified: exact error message + field branch_id)
- [x] 4.5 Manual API: convert quote with `lens_type: 'Lentes de contacto'` → work order `lens_type='single_vision'`, `contact_lens_*` preserved (verified: sphere_od -2.5 preserved)
- [x] 4.6 `npm run type-check` and `npm run lint` clean — NOTE: repo-wide `tsc --noEmit` baseline is red (3369 pre-existing errors on main); this diff adds 0 new errors (net −3). Lint on changed files: 0 new issues (2 pre-existing errors, 27 pre-existing warnings).

## Out of scope (documented, no task)

- `src/app/api/admin/products/import/route.ts` — deprecated import-wizard; NULL-org persists; follow-up change: delete or apply branch-first contract.
