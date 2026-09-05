# Design: Fix E2E-Revealed Bugs (product org derivation + quote convert lens defaults)

## Technical Approach

Two localized fixes mirroring existing codebase patterns, then un-skipping the two E2E specs that exposed them. Bug 1 copies the branch-first org resolution of `processSaleBusinessLookups.ts:220-236` + the super-admin-global 400 of `customersCreateService.ts:145-152` into product create. Bug 2 copies the `process_pos_sale` COALESCE defaults (migration 3193-3194, 3186) into the convert insert. Both are code-only, no migration.

## Architecture Decisions

| Decision                                 | Options                                                               | Tradeoff                                                                                                        | Chosen                                            |
| ---------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Super-admin-global product POST contract | (a) 400 "branch required" vs (b) fallback admin org                   | (a) contract-based, matches customer-create, fixes cross-org footgun; (b) preserves the footgun                 | (a) 400 (spec D1)                                 |
| Org resolution style                     | Inline in service vs extracted helper                                 | Inline matches `processSaleBusinessLookups`/`adminQuoteService` pattern; helper adds unit-testable surface      | Inline (YAGNI; E2E specs are the runnable checks) |
| Bug 2 fix                                | (a) `??` defaults vs (b) nullable columns vs (c) reject 4xx           | (a) matches POS COALESCE, zero migration; (b) diverges from CHECK intent; (c) breaks frame-only work-order need | (a) inline defaults                               |
| Contact-lens literal                     | Map `'Lentes de contacto'` → `'single_vision'`, keep `contact_lens_*` | Mirrors `process_pos_sale`/`buildItems.ts:72-74`; CL-only quotes produce no work orders (recorded decision)     | Map defensively; no CL-only WO production         |
| `import/route.ts`                        | Fix now vs document out of scope                                      | Deprecated (Bulk replaced it); fixing = touching 487-line legacy route                                          | Out of scope + follow-up note                     |

## Architecture Summary (before → after)

**Bug 1 — product org derivation**

- BEFORE: `route.ts:63-74` derives org ONLY from `admin_users.organization_id`; `productsCreateService.ts` threads it into tier-limit (156), `buildProductPayload` (197), `handleProductStock` (262). Super admin global creating for another org's branch → product + stock rows in the wrong org → sale stock lookup misses → stock stays 0.
- AFTER: effective branch resolved first (existing expression `validatedBody.branch_id || branchContext.branchId` at 117-118 — payload → x-branch-id header → context). Resolved org = `branches.organization_id` of that branch, fallback admin org. Super admin global with no branch → 400. Resolved org flows into tier-limit, payload, and stock. GET list already branch-first at `productsService.ts:116-136` → unchanged (regression only).

**Bug 2 — quote convert defaults**

- BEFORE: `convert/route.ts` inserts `quote.lens_type`/`lens_material`/`frame_name` raw (lines 121/123/113) → NOT NULL + `lab_work_orders_lens_type_check` violations → 500.
- AFTER: `lens_type` defaults `'single_vision'` (literal `'Lentes de contacto'` mapped to it), `lens_material` defaults `'cr39'`, `frame_name` defaults `'Marco'`. `contact_lens_*` fields already copied (133-153) — unchanged.

## Data Flow

    POST /api/admin/products
      → createProduct(request, supabase, adminOrgId)   [param = fallback]
      → productBranchId = body.branch_id || branchContext.branchId
      → if (isGlobalView && isSuperAdmin && !productBranchId) → 400
      → resolvedOrg = productBranchId ? lookup branches.organization_id : adminOrgId
      → tier-limit(resolvedOrg) → buildProductPayload(org: resolvedOrg) → insert
      → handleProductStock(org: resolvedOrg) → product_branch_stock in branch's org

## File Changes

| File                                                  | Action                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------- | --- | -------- |
| `src/app/api/admin/products/productsCreateService.ts` | Modify                 | After line 118: super-admin-global 400 → `{ error: "Como super administrador en vista global, debe especificar la sucursal para el producto", field: "branch_id" }` status 400. Resolve org: `let resolvedOrg = organizationId; if (productBranchId) { const { data: b } = await supabase.from("branches").select("organization_id").eq("id", productBranchId).single(); resolvedOrg = b?.organization_id ?? organizationId; }`. Use `resolvedOrg` at lines 156 (tier limit), 197 (buildProductPayload), 262 (handleProductStock). Rename param `organizationId` → `fallbackOrganizationId` (call site route.ts unchanged). |
| `src/app/api/admin/products/route.ts`                 | No change              | POST param semantics become "fallback org"; GET untouched (already branch-first at service level).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/app/api/admin/quotes/[id]/convert/route.ts`      | Modify                 | Line 113: `frame_name: quote.frame_name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |     | "Marco"`; Line 121: `lens_type: quote.lens_type === "Lentes de contacto" ? "single_vision" : (quote.lens_type |     | "single_vision")`; Line 123: `lens_material: quote.lens_material |     | "cr39"`. |
| `src/app/api/admin/products/import/route.ts`          | Out of scope (audited) | See Import Route Audit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `e2e/pos-checkout.spec.ts`                            | Modify                 | Un-skip (remove `test.skip` line 25); product POST (lines 64-70) gains `branch_id: "96823c54-347c-4dc9-9abd-51e2c8863618"`; replace tolerant fallback (149-155) with hard asserts.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `e2e/quote-workorder-pos.spec.ts`                     | Modify                 | Un-skip (remove `test.skip` line 27); product POST (lines 67-73) gains `branch_id: DEMO_BRANCH_ID`; replace tolerant fallback (207-213) with hard asserts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/app/api/admin/products/productsCreateHelpers.ts` | No change              | `buildProductPayload` (113) / `handleProductStock` (155-170) receive the resolved org from the service. The org-wide stock branch (155-170) becomes unreachable via this route after the 400 — leave as-is, add `ponytail:` comment at apply.                                                                                                                                                                                                                                                                                                                                                                               |

## Import Route Audit (mandatory)

`src/app/api/admin/products/import/route.ts` does NOT use admin-only org derivation — it sets **no** `organization_id` on any insert path (create 209-219, upsert 400-410; `products.organization_id` is nullable with no default, schema line 7607). Result: imported products land with `organization_id = NULL` → invisible to org-scoped lists (`productsService` filters by org) and `update_product_stock`. Branch is derived from `branchContext` (187-188) for stock only. **Verdict: out of scope for THIS change** — route is the deprecated import-wizard (Bulk `/admin/products/bulk` replaced it; testing skill lists bulk, not import) and no E2E spec exercises it. **Follow-up note (next change)**: delete the route or apply the branch-first contract (set `organization_id` = branch's org, fallback admin org) on all insert paths.

## E2E Spec Changes

**`e2e/pos-checkout.spec.ts`** — un-skip; product POST payload gains `branch_id: "96823c54-347c-4dc9-9abd-51e2c8863618"` (same branch used by customer POST and process-sale `x-branch-id`). Keep `Origin: http://localhost:3000` headers (CSRF) on all API calls. Assertions that must hold: customer 2xx with id; product 2xx with id; sale 2xx returning `order.order_number` (replace tolerant fallback with `expect(saleSucceeded).toBeTruthy()`); cash-register Ventas/Órdenes tab shows the order_number cell, the customer name, and `$10.000`.

**`e2e/quote-workorder-pos.spec.ts`** — un-skip; product POST payload gains `branch_id: DEMO_BRANCH_ID` (`00000000-0000-0000-0000-000000000031`, same as customer). Keep Origin headers. Assertions that must hold: customer/product 2xx; quote 2xx with id; convert 2xx returning `workOrder.work_order_number` (replace tolerant fallback with hard assert); status PUT to `ready_for_pickup` 2xx; Ventas/Órdenes tab shows work_order_number and `$50.000`.

## Testing Strategy

| Layer         | What                                                                            | How                                                                                                              |
| ------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| E2E (primary) | Bug 1: product + stock in branch's org, sale stock 10→9                         | `e2e/pos-checkout.spec.ts` un-skipped                                                                            |
| E2E (primary) | Bug 2: frame-only convert succeeds with defaults; status advance; UI visibility | `e2e/quote-workorder-pos.spec.ts` un-skipped                                                                     |
| Manual/API    | Super admin global, no branch → 400                                             | `curl POST /api/admin/products` without `branch_id`/`x-branch-id`                                                |
| Manual/API    | CL literal mapping                                                              | Convert quote with `lens_type: 'Lentes de contacto'` → `lens_type` = `single_vision`, `contact_lens_*` preserved |

E2E run (per testing skill Data Contract):

```bash
npx playwright test --project=setup      # regenerate .playwright/.auth/admin.json
npx playwright test e2e/pos-checkout.spec.ts --project=admin
npx playwright test e2e/quote-workorder-pos.spec.ts --project=admin
```

Preconditions: local Supabase stack (`project_id web`, seeded) + `.env.e2e` (`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`, storageState `e2e-test@example.com`), dev server auto-start.

## Risks & Mitigations

| Risk                                                                          | Likelihood | Mitigation                                                                                            |
| ----------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Product POST now 400s for super admin global without branch (contract change) | Med        | Mirrors customer-create; UI already sends branch; both E2E specs updated                              |
| Contact-lens literal edge cases                                               | Low        | Mirrors `process_pos_sale`; `contact_lens_*` preserved; CL-only WO production out of scope (recorded) |
| import route NULL-org persists                                                | Med        | Documented out of scope + follow-up; not exercised by E2E; Bulk is the supported path                 |
| E2E env (Supabase + storage state) not running                                | Med        | Documented precondition; `--project=setup` regenerates state                                          |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure API request/response logic + Playwright spec changes.

## Migration / Rollout

No migration required. Code-only change. Rollback: git revert of `productsCreateService.ts` + `convert/route.ts`; re-skip both E2E specs.

## Open Questions

- None blocking.
- Follow-ups (not for this change): delete vs fix `import/route.ts`; remove now-unreachable org-wide stock branch (`productsCreateHelpers.ts:155-170`).
