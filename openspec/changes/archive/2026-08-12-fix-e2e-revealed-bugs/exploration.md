# Exploration: fix-e2e-revealed-bugs

**Date**: 2026-08-12
**Author**: sdd-explore sub-agent
**Status**: Complete — ready for proposal
**Mode**: READ-ONLY exploration (no source files modified)

---

## 1. Summary

Two real app bugs exposed by the skipped Playwright E2E specs were confirmed and root-caused:

1. **POST /api/admin/products** derives `organization_id` exclusively from `admin_users.organization_id` (the user's own org), never from the effective branch. For a super admin in global view operating against a branch of another org, the product lands in the wrong org (e.g. `00000000-0000-0000-0000-000000000001` instead of the branch's org `2c01307e-...`), cascading into wrong-org stock rows and failed stock lookups during POS sales.
2. **Quote → work order convert** passes `quote.lens_type` / `quote.lens_material` straight into `lab_work_orders`, where both columns are `NOT NULL`. Frame-only or contact-lens quotes have `lens_type = NULL` (quotes table allows it), so convert fails with a 500 "null value in column lens_type ... violates not-null constraint". The `process_pos_sale` RPC already handles this with `COALESCE(..., 'single_vision')` / `COALESCE(..., 'cr39')`; the convert route does not.

Both fixes are small, localized, and follow patterns already present elsewhere in the codebase (quote create, process-sale, product GET list). After the fixes, the two E2E specs can be un-skipped, with one contract decision needed for product creation by a global-view super admin.

---

## 2. Bug 1 — POST /api/admin/products wrong organization_id for super admin global

### Root cause (exact locations)

| Step                           | Location                                                                                    | Problem                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Org derivation                 | `src/app/api/admin/products/route.ts:63-74` (POST) and `:28-37` (GET)                       | `organizationId` is fetched ONLY from `admin_users.organization_id` and passed down. No branch → org resolution.                                                                              |
| Insert payload                 | `src/app/api/admin/products/productsCreateService.ts:197` → `productsCreateHelpers.ts:113`  | `filtered.organization_id = organizationId` uses that admin-users-derived org unconditionally.                                                                                                |
| Branch context ignored for org | `src/app/api/admin/products/productsCreateService.ts:31-35`                                 | `getBranchContext(...)` is fetched (and used for branch_id + access validation at 117-149), but its branch is never used to resolve the org.                                                  |
| Cascade: stock rows            | `src/app/api/admin/products/productsCreateHelpers.ts:155-170`                               | Super-admin-global product with no branch creates stock rows for all branches of the **wrong** org (`branches ... .eq("organization_id", organizationId)` at 157).                            |
| Cascade: sale stock            | `supabase/migrations/20260701000000_schema_complete.sql:4625-4704` (`update_product_stock`) | No stock row exists at the sale branch (product is in another org's catalog) → row inserted with quantity `GREATEST(0, change)` = 0. Matches E2E skip note "product_branch_stock queda en 0". |

### Why the E2E hit it

- E2E admin (`e2e-test@example.com`, super_admin) has `admin_users.organization_id` that does not match the branch the test operates on (`96823c54-...` → org `2c01307e-...`).
- The spec creates the product with **no** `branch_id` and **no** `x-branch-id` header → `productBranchId = null` (productsCreateService.ts:117-118) → org falls to the admin's own org.
- `getBranchContext` (branch-middleware.ts:192-204) lets a super admin operate on ANY branch id without validating it against `accessibleBranches` (which are org-scoped via `get_user_branches`, migration line 2238-2252), so the cross-org mismatch is never caught.

### What the rest of the app already does correctly (the pattern to copy)

- **Quote create** — `src/lib/api/services/adminQuoteService.ts:378-383`: org = `branches.organization_id` (from resolved branch), fallback `admin_users.organization_id`.
- **POS process-sale** — `src/app/api/admin/pos/process-sale/processSaleBusinessLookups.ts:220-236`: org = branch's org first, fallback admin's org.
- **Product GET list** — `src/app/api/admin/products/productsService.ts:116-136`: super admin + branch selected resolves org from the branch (line 122-129) and scopes by it.
- **Customer create** — `src/app/api/admin/customers/customersCreateService.ts:145-152`: super admin in global view with no branch → explicit 400 "debe especificar la sucursal".

### Correct contract (recommended)

1. **Resolve the effective branch** first: `validatedBody.branch_id` → `getBranchFromRequest(request)` (x-branch-id header / `branch_id` query) → `branchContext.branchId`.
2. **organization_id = branches.organization_id of the effective branch** (via a lookup), **fallback to admin_users.organization_id** when no branch resolves.
3. **Super admin global view with no branch** → either (a) reject with a 400 "branch required" (matches customersCreateService:145-152 and the memory requirement "Super admin global view needs explicit x-branch-id header or branch_id in payloads"), or (b) fall back to the admin's own org. This is the contract decision to settle in proposal (see Risks/unknowns).
4. Apply the same branch→org resolution to `handleProductStock` so org-wide stock rows target the right org's branches.

### Impacted paths

- `src/app/api/admin/products/route.ts` (POST — primary; GET already correct at the service level but takes the param, keep consistent)
- `src/app/api/admin/products/productsCreateService.ts`
- `src/app/api/admin/products/productsCreateHelpers.ts` (`buildProductPayload`, `handleProductStock`)
- E2E spec `e2e/pos-checkout.spec.ts` (product POST — may need `branch_id`/`x-branch-id` added per the chosen contract)

---

## 3. Bug 2 — Quote convert fails: lab_work_orders.lens_type NOT NULL without lens_data

### Root cause (exact locations)

| Step                         | Location                                                                 | Problem                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convert insert               | `src/app/api/admin/quotes/[id]/convert/route.ts:121`                     | `lens_type: quote.lens_type` — NULL for frame-only quotes → violates NOT NULL.                                                                                                                                 |
| Convert insert               | `src/app/api/admin/quotes/[id]/convert/route.ts:123`                     | `lens_material: quote.lens_material` — NULL too → second NOT NULL violation (fires once lens_type is fixed).                                                                                                   |
| Schema                       | `supabase/migrations/20260701000000_schema_complete.sql:6185-6186`       | `lab_work_orders.lens_type text NOT NULL` + `lens_material text NOT NULL` (plus check constraints 6278; `frame_name` NOT NULL at 6178, `customer_id` NOT NULL at 6174, `total_amount` NOT NULL at 6215).       |
| Quote side                   | `supabase/migrations/20260701000000_schema_complete.sql:7861-7862, 7928` | `quotes.lens_type`/`lens_material` are NULLABLE and the check explicitly allows NULL — quotes legitimately exist with no lens data (frame-only, contact-lens quotes, or quotes still in draft).                |
| Contrast — RPC already fixed | `supabase/migrations/20260701000000_schema_complete.sql:3193-3194`       | `process_pos_sale` inserts work orders with `COALESCE(v_work_order->>'lens_type', 'single_vision')` and `COALESCE(v_work_order->>'lens_material', 'cr39')` — the POS path already tolerates missing lens data. |

### Failure chain in the E2E

`quote-workorder-pos.spec.ts` creates a quote with only `customer_id + frame_product_id + frame_name + frame_price + total_amount` (no lens fields). Convert POST then 500s at the insert (route.ts:102-202 → workOrderError → 500 "Failed to create work order"). The E2E currently only verifies the error path.

### Correct behavior

For **frame-only quotes** (and any quote without lens data):

- Option A (recommended, minimal, consistent with `process_pos_sale`): default the missing values in the convert insert — `lens_type: quote.lens_type ?? "single_vision"` and `lens_material: quote.lens_material ?? "cr39"` (and guard `frame_name` with a fallback like the RPC's `COALESCE(..., 'Marco')` at 3186). The work order still represents the frame + any lab work; the lab can correct details later.
- Option B: make `lab_work_orders.lens_type`/`lens_material` nullable via migration. More invasive; diverges from the POS path and the CHECK constraint design intent.
- Option C: reject convert with a clear 4xx when no lens data. Breaks the E2E contract (the spec expects convert to succeed for a frame quote) and adds friction for frame-only sales that still need a work-order record.

For **contact-lens quotes** (lens*type = 'Lentes de contacto' or contact_lens_family_id set): `quote.lens_type` may hold the literal 'Lentes de contacto', which **also violates** the `lab_work_orders_lens_type_check` (6278 — allowed values are only single_vision/bifocal/trifocal/progressive/reading/computer/sports). The convert path must map contact-lens quotes explicitly (e.g. default lens_type to 'single_vision' and keep the contact_lens*\* fields, mirroring `process_pos_sale`'s payload handling at 3207-3209).

Recommended: Option A + explicit contact-lens mapping, validated against `buildLensItems`/`buildContactLensItem` in `src/app/api/admin/quotes/[id]/load-to-pos/_helpers/buildItems.ts` (frame-only → no lens items at 72-74; contact lens → `contact_lens` item at 128-138) so load-to-pos and convert stay consistent.

---

## 4. E2E spec requirements (what must work to un-skip)

### e2e/pos-checkout.spec.ts — "API create product → process sale → UI verify order on cash-register"

Behaviors exercised (all must pass end-to-end):

1. `POST /api/admin/customers` with `branch_id` (super admin global must specify branch) — CSRF `Origin` header required.
2. `POST /api/admin/products` (frame, `stock_quantity: 10`, **no branch context** — this is the contract gap).
3. `POST /api/admin/pos/process-sale` with `x-branch-id` header, cash payment, Cash-First `payments: [{method, amount}]` contract, real `customer_id`.
4. `process_pos_sale` RPC full path: `orders` + `order_items` + `order_payments` (with org propagation — already fixed), stock reduction via `update_product_stock`, `pos_transaction`, `pos_sale_idempotency` upsert.
5. `GET /admin/cash-register` renders; Ventas/Órdenes tab loads `GET /api/admin/orders`; the new `order_number` and customer name appear (and total `$10.000`).

For this to pass after fixing Bug 1: the created product must be visible/resolvable in the org that owns branch `96823c54-...` — i.e. either the API resolves org from the branch, or the spec must send the branch. Product stock must exist for the sale branch (10 → reduced to 9, not stuck at 0).

### e2e/quote-workorder-pos.spec.ts — "API create quote → convert → advance status → UI verify on cash-register"

Behaviors exercised:

1. `POST /api/admin/customers` with `branch_id` = demo Casa Matriz (`00000000-...-000031`).
2. `POST /api/admin/products` (frame, no branch).
3. `POST /api/admin/quotes` with `customer_id`, `frame_product_id`, `frame_name`, `frame_price`, `total_amount` (no lens fields — quote must be creatable as frame-only).
4. `POST /api/admin/quotes/[id]/convert` — must succeed and return a `workOrder` with `work_order_number` (currently 500s — Bug 2).
5. `PUT /api/admin/work-orders/[id]/status` with `{status: "ready_for_pickup"}` → `update_work_order_status` RPC (no transition matrix, so it passes once convert succeeds) + branch access validation.
6. `GET /admin/cash-register` → Ventas/Órdenes tab shows the work order number and `$50.000`.

Supporting behavior already correct: quote create resolves org from branch (`adminQuoteService.ts:378-383`), so a quote tied to the demo branch gets the demo org.

---

## 5. Risks / unknowns

1. **Contract decision (product create, global super admin, no branch)** — must product POST (a) require an explicit branch (400 otherwise, like customersCreateService:145-152), or (b) fall back to `admin_users.organization_id`? (a) matches the documented requirement and makes the E2E product POST add `branch_id`; (b) keeps the E2E spec unchanged but preserves the cross-org footgun. Needs product/owner input — recommendation: (a), plus update the two E2E specs to pass `branch_id`.
2. **The exact E2E env org mismatch** — the code-level defect is unambiguous, but the exact user/org used when the bug was observed (`0000...0001` vs `2c01307e-...`) is environment-specific (live DB state). The fix must not depend on that; it must derive org from the branch contractually.
3. **Contact-lens quotes** — the convert currently would also fail the `lens_type` CHECK with the literal 'Lentes de contacto'. The proposal should decide the canonical mapping (recommended: default 'single*vision' + keep contact_lens*\* fields), and confirm whether contact-lens quotes should produce work orders at all (load-to-pos treats them as direct-delivery items, POS skill says "No work order" for contact-lens items).
4. **`frame_name` NOT NULL on lab_work_orders** — a frame-only quote without `frame_name` would still fail convert; the RPC defaults to 'Marco'. Consider the same fallback in convert.
5. **Scope of org fix** — the same admin-users-only derivation exists in `productsCreateService` stock handling; verify `import`/`bulk`/`[id]` product endpoints don't reintroduce the mismatch for the same user (initial scan: `[id]`/`bulk` delegate to `adminProductService` which already scopes correctly for non-super admins; `import` derives branch context and may need the same branch→org rule — flag for design phase).
6. **Un-skipping** requires the local Supabase stack (`project_id web`) running with the E2E admin session (per prior session memory: storageState admin.json, `e2e-test@example.com`), plus `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` env — test-run precondition, not a code change.

---

## 6. File map (read during exploration)

| File                                                                                               | Purpose                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/admin/products/route.ts`                                                              | POST/GET products entry; derives org from `admin_users.organization_id` only (Bug 1 root).                                                                                                                                                                                                                   |
| `src/app/api/admin/products/productsCreateService.ts`                                              | createProduct flow; branch context fetched but org not resolved from branch.                                                                                                                                                                                                                                 |
| `src/app/api/admin/products/productsCreateHelpers.ts`                                              | `buildProductPayload` (sets organization_id), `handleProductStock` (org-wide stock rows).                                                                                                                                                                                                                    |
| `src/app/api/admin/products/productsService.ts`                                                    | Product GET list; super admin + branch resolves org from branch (correct pattern to mirror).                                                                                                                                                                                                                 |
| `src/app/api/admin/products/[id]/route.ts`                                                         | PUT/DELETE/GET by id; delegates to adminProductService (org-scoped correctly).                                                                                                                                                                                                                               |
| `src/app/api/admin/products/import/route.ts`                                                       | CSV import; uses branchContext for stock — verify branch→org rule in design.                                                                                                                                                                                                                                 |
| `src/lib/api/branch-middleware.ts`                                                                 | `getBranchContext`, `getBranchFromRequest`, `addBranchFilter`; super admin global semantics; Vision Global org scoping.                                                                                                                                                                                      |
| `src/app/api/admin/pos/process-sale/processRpcHandler.ts`                                          | Builds RPC payload incl. `organization_id`, work order payload (COALESCE handled in RPC).                                                                                                                                                                                                                    |
| `src/app/api/admin/pos/process-sale/processSaleBusinessLookups.ts`                                 | **Branch-first org resolution (220-236)** — the pattern Bug 1 should copy.                                                                                                                                                                                                                                   |
| `src/app/api/admin/pos/process-sale/route.ts`, `processSaleHandler.ts`                             | process-sale dispatch + context assembly.                                                                                                                                                                                                                                                                    |
| `src/app/api/admin/quotes/[id]/convert/route.ts`                                                   | Quote→work-order convert; passes `quote.lens_type`/`lens_material` raw (Bug 2 root, lines 121/123).                                                                                                                                                                                                          |
| `src/app/api/admin/quotes/route.ts`, `src/lib/api/services/adminQuoteService.ts`                   | Quote create/list; create resolves org from branch (378-383) — correct pattern.                                                                                                                                                                                                                              |
| `src/app/api/admin/quotes/[id]/load-to-pos/_helpers/buildItems.ts`                                 | Frame-only → no lens items; contact-lens item shape; reference for convert behavior consistency.                                                                                                                                                                                                             |
| `src/app/api/admin/quotes/[id]/status/route.ts`, `[id]/send/route.ts`, `[id]/load-to-pos/route.ts` | Sibling quote routes using branch filter; context.                                                                                                                                                                                                                                                           |
| `src/app/api/admin/work-orders/[id]/status/route.ts`                                               | Work-order status advance via `update_work_order_status` RPC + branch access (E2E step 5).                                                                                                                                                                                                                   |
| `src/app/api/admin/customers/customersCreateService.ts`                                            | Customer create; **super-admin-global 400 "branch required" pattern (145-152)**; cross-org branch validation.                                                                                                                                                                                                |
| `src/lib/api/services/adminOrderService.ts`                                                        | Orders list (cash-register Ventas tab); super admin branch/org filtering.                                                                                                                                                                                                                                    |
| `src/app/admin/cash-register/useCashRegisterOrders.ts`                                             | Cash-register UI hook; orders tab → `GET /api/admin/orders` (E2E verification).                                                                                                                                                                                                                              |
| `supabase/migrations/20260701000000_schema_complete.sql`                                           | `lab_work_orders` def (NOT NULL lens_type/lens_material, 6185-6186), `quotes` def (nullable, 7861-7862), `process_pos_sale` RPC (COALESCE 3193-3194; org propagation 3031/3081/3105), `update_product_stock` (4625), `update_work_order_status` (4774), `is_super_admin` (2516), `get_user_branches` (2223). |
| `supabase/seed.sql`                                                                                | Demo org/branches/products seed (org `0000...0001`).                                                                                                                                                                                                                                                         |
| `scripts/create-demo-super-admin.js`, `scripts/create-root-user.js`                                | Super admin (org = demo) and root (org = null) provisioning.                                                                                                                                                                                                                                                 |
| `e2e/pos-checkout.spec.ts`                                                                         | Skipped E2E: product → POS sale → cash-register verification.                                                                                                                                                                                                                                                |
| `e2e/quote-workorder-pos.spec.ts`                                                                  | Skipped E2E: quote → convert → status → cash-register verification.                                                                                                                                                                                                                                          |

---

## Ready for proposal

**Yes.** Both bugs are root-caused with exact locations, and the codebase already contains the patterns to copy. The proposal must decide: (1) the product-create branch contract for super admin global view (recommend: require branch, update E2E specs), and (2) the canonical lens defaults for convert (recommend: mirror `process_pos_sale` COALESCE + explicit contact-lens mapping).
