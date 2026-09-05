```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:15fa4f38047e1d17b891264469749f253103cbad1551f0ff9a6c35ef16aa4e5a
verdict: fail
blockers: 1
critical_findings: 1
requirements: 8/8
scenarios: 10/11
test_command: npx playwright test e2e/pos-checkout.spec.ts e2e/quote-workorder-pos.spec.ts --project=admin --reporter=line
test_exit_code: 1
test_output_hash: sha256:1c2e053bb7df8f39e32b7b6938f74139fdeb55220d69f605da4fe520757feffb
build_command: npx tsc --noEmit
build_exit_code: 2
build_output_hash: sha256:e79df05cc67d108592c6fc5785d6445266cae4bca1152c17f472aac49bb1bbe0
```

## Verification Report

**Change**: fix-e2e-revealed-bugs
**Version**: N/A (specs at openspec/changes/active/fix-e2e-revealed-bugs)
**Mode**: Standard (Strict TDD not active)
**Commit range**: 55719b9d..25a2f418 (3 commits: `43ab8073`, `18985327`, `25a2f418`)

### Completeness

| Metric           | Value                                   |
| ---------------- | --------------------------------------- |
| Tasks total      | 10 (1.1-1.3, 2.1-2.5, 3.1-3.3, 4.1-4.6) |
| Tasks complete   | 10                                      |
| Tasks incomplete | 0                                       |

All tasks checked. Full verification run.

### Build & Tests Execution

**Build (type-check)**: ❌ exit 2 — pre-existing repo-wide baseline, diff error-neutral

```text
npx tsc --noEmit   → 3366 errors at HEAD vs 3358 at parent (55719b9d)
Changed files (per-file error counts, HEAD vs parent):
  productsCreateService.ts   6 = 6   (no new errors; changed lines add none)
  productsCreateHelpers.ts  11 = 11  (comment-only change)
  quotes/[id]/convert/route.ts 0 = 0
  e2e/pos-checkout.spec.ts   4 = 4   (same messages, shifted lines)
  e2e/quote-workorder-pos.spec.ts 6 → 3  (net −3, matches claimed "net −3")
```

The +8 total delta is `.next/types/**/*.ts` generated-route noise: the parent worktree had no `.next` (tsconfig includes `.next/types/**/*.ts`), so the two runs are not directly comparable at total level. Per-file comparison of the 5 changed files between HEAD and parent (git worktree at 55719b9d + junctioned node_modules) proves the diff is error-neutral to net-negative: no new error classes, 1 new TS2339 message in quote-workorder spec (hard-assert rewrite) offset by 2 removed.

**Tests (unit)**: ✅ 1902 passed / ❌ 11 failed (4 files) — all 11 pre-existing

```text
npx vitest run src/__tests__/unit
HEAD:   4 files failed, 11 tests failed (payment-service 8, productService 1, products/service 1, send-delivery-completion-email 1)
Parent: SAME 4 files, SAME 11 tests failed (verified in worktree)
```

None of the failing tests import the changed files. The diff is unit-test-neutral. No unit tests cover the changed files (by design — E2E specs are the runnable checks).

**Tests (E2E)**: ⚠️ API regression guards PASS every run; UI-verification steps fail on cold dev server

```text
npx playwright test e2e/pos-checkout.spec.ts e2e/quote-workorder-pos.spec.ts --project=admin --reporter=line
Run 1 (cold server): setup failed (admin-check 10s client timeout race → /onboarding/choice false negative).
Run 2 (warm): setup PASSED; pos-checkout + quote-workorder reached UI steps, all API asserts passed;
             UI steps killed by the 30s default test timeout racing cold on-demand route compilation.
Run 3 (warm): setup PASSED; quote-workorder API asserts passed again; UI table never rendered (30s test timeout).
```

The dev server auto-starts via playwright.config `webServer` and route compilation is on-demand; a cold route takes >30s while Playwright's default testTimeout is 30s (the 90s assertion timeouts never get to fire). The specs' own comments acknowledge "30s+" compiles but never raise `test.setTimeout`. The API-level regression guards — product POST with branch_id → org resolution → sale 2xx + order_number (bug 1); convert 2xx + work_order_number + status advance (bug 2) — passed in every run that executed them. Supabase local stack was up (54321 → 200); `/admin/work-orders` serves 200 in 1.1s once warm.

**Coverage**: ➖ Not available (no coverage threshold configured for E2E; changed files have no unit coverage by design).

### Spec Compliance Matrix

| Requirement                                                                              | Scenario                                             | Test                                                                                                                                                                                            | Result       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| R1 admin-product-org-scoping: Branch-first org resolution                                | Create with branch_id payload lands in branch's org  | API: POST product branch_id=96823c54 → product.organization_id = 2c01307e (branch's org, NOT admin's 0001)                                                                                      | ✅ COMPLIANT |
| R1                                                                                       | Create with x-branch-id header lands in branch's org | API: POST product x-branch-id header, no payload branch_id → org 2c01307e                                                                                                                       | ✅ COMPLIANT |
| R1                                                                                       | Fallback to admin org without branch context         | Code inspection: `resolvedOrg = fallbackOrganizationId` (productsCreateService.ts:170,178-179); path shadowed by pre-existing 400 for non-super-admin without branch (139-151) — defensive-only | ⚠️ PARTIAL   |
| R1                                                                                       | Stock rows target the resolved org's branches        | API: product_branch_stock row for branch 96823c54, quantity 5, in resolved org; no rows in admin's own org                                                                                      | ✅ COMPLIANT |
| R2 admin-product-org-scoping: Super admin global without branch is rejected              | Global super admin with no branch gets 400           | API: POST no branch/header → HTTP 400 `{"error":"Como super administrador en vista global, debe especificar la sucursal para el producto","field":"branch_id"}`                                 | ✅ COMPLIANT |
| R3 admin-product-org-scoping: Product list stays org-scoped                              | List scoped to the branch's org                      | API: GET /api/admin/products with x-branch-id → HTTP 200 (derivation pre-existing, regression only)                                                                                             | ✅ COMPLIANT |
| R1 quote-work-order-conversion: Convert defaults                                         | Frame-only quote converts successfully               | API: convert → TRB-2026-0017, lens_type=single_vision, lens_material=cr39                                                                                                                       | ✅ COMPLIANT |
| R1                                                                                       | Missing frame name falls back to Marco               | API: quote without frame_name → convert → frame_name="Marco" (TRB-2026-0018)                                                                                                                    | ✅ COMPLIANT |
| R2 quote-work-order-conversion: Lens quote preserves lens data                           | Lens quote keeps its lens type and material          | API: progressive/polycarbonate preserved (TRB-2026-0019)                                                                                                                                        | ✅ COMPLIANT |
| R3 quote-work-order-conversion: Contact-lens literal mapping                             | CL literal mapped and contact fields preserved       | API: 'Lentes de contacto' → single_vision + contact_lens_rx_sphere_od=−2.50 preserved (TRB-2026-0020)                                                                                           | ✅ COMPLIANT |
| R4 quote-work-order-conversion: CL line items produce no work orders (recorded decision) | CL-only quote conversion documented out of scope     | Recorded decision; diff does not touch load-to-pos direct delivery (buildItems.ts path) — regression verified by inspection                                                                     | ✅ COMPLIANT |

**Compliance summary**: 10/11 scenarios compliant, 1 PARTIAL (S3 fallback — mechanism implemented, literal GIVEN unreachable via API due to pre-existing 400).

### Correctness (Static Evidence)

| Requirement                                                                            | Status         | Notes                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch-first org resolution (payload → header → context)                               | ✅ Implemented | productsCreateService.ts:117-118 (`validatedBody.branch_id \|\| branchContext.branchId \|\| null`) then branches.organization_id lookup (171-180) — mirrors processSaleBusinessLookups.ts:220-236 |
| 400 for super admin global without branch                                              | ✅ Implemented | 123-136; exact mirror of customersCreateService.ts:145-152 (message + field + status)                                                                                                             |
| Resolved org threaded to tier limit, payload, stock                                    | ✅ Implemented | 186-189 (tier), 228 (buildProductPayload), 293 (handleProductStock)                                                                                                                               |
| Param rename organizationId → fallbackOrganizationId                                   | ✅ Implemented | line 21; call site route.ts:74 unchanged                                                                                                                                                          |
| Convert defaults: frame_name/Marco, lens_type/single_vision+CL map, lens_material/cr39 | ✅ Implemented | convert/route.ts:113, 121-124, 126 — exact per design                                                                                                                                             |
| contact*lens*\* fields preserved                                                       | ✅ Implemented | convert/route.ts:136-156 untouched                                                                                                                                                                |
| ponytail comment on unreachable org-wide stock branch                                  | ✅ Implemented | productsCreateHelpers.ts:155-157                                                                                                                                                                  |

### Coherence (Design)

| Decision                                                | Followed?  | Notes                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Super-admin-global product POST → 400 (spec D1)         | ✅ Yes     | Exact mirror of customer-create pattern                                                                                                                                                                                                                                                        |
| Inline org resolution, no extracted helper (YAGNI)      | ✅ Yes     | Inline in service; E2E/API checks are the runnable evidence                                                                                                                                                                                                                                    |
| `??` defaults over nullable columns / reject (Option A) | ✅ Yes     | Zero migration; mirrors process_pos_sale COALESCE                                                                                                                                                                                                                                              |
| CL literal mapped defensively, no CL-only WO production | ✅ Yes     | load-to-pos untouched                                                                                                                                                                                                                                                                          |
| import/route.ts out of scope + follow-up note           | ✅ Yes     | Untouched; NULL-org persists (documented follow-up)                                                                                                                                                                                                                                            |
| E2E un-skip + branch_id on product POSTs                | ⚠️ Partial | Both un-skipped with branch_id; pos-checkout adds route interception for the orders fetch; quote-workorder verifies on /admin/work-orders (not cash-register Ventas/Órdenes tab) and drops the $50.000 assertion — all documented in commit message 25a2f418, test-only, no spec coverage lost |

### Issues Found

**CRITICAL**: None (code-level). The envelope's `critical_findings: 1` / `blockers: 1` correspond to the non-zero E2E test exit per the strict decision gate ("test command exits non-zero → CRITICAL"); the failing UI-verification steps are a cold-dev-server precondition gap, not a code defect (see WARNING 2).

**WARNING**:

1. **Lint: 1 NEW error from this diff** — `max-lines` on `productsCreateService.ts` (370 raw / 318 counted lines > 300 max). Parent had 1 error (no-restricted-imports); HEAD has 2. Contradicts tasks.md 4.6 claim of "0 new issues (2 pre-existing errors, 27 pre-existing warnings)" — actual parent count is 1 error / 40 warnings; HEAD is 2 errors / 28 warnings (warnings net −12, mostly removed console statements in the E2E rewrite). Style-gate finding, no functional impact.
2. **E2E UI-verification steps not reliably re-runnable on a cold dev server** — the 30s default test timeout races on-demand route compilation (specs acknowledge "30s+" compiles but never raise `test.setTimeout`; their 90s assertion timeouts are never reached). API regression guards (the actual spec scenarios) passed every run. Per KNOWN context this is a precondition/timing gap, not a code failure — but it contradicts the design's testing-strategy claim that both specs pass un-skipped in a reproducible way.
3. **Design deviation (test-only)** — pos-checkout route interception and quote-workorder UI verification on `/admin/work-orders` instead of the cash-register Ventas/Órdenes tab, with the `$50.000` assertion dropped. Documented in commit message 25a2f418; no spec scenario coverage lost (API-level asserts cover all spec scenarios).

**SUGGESTION**:

1. Spec `admin-product-org-scoping` S3 ("Fallback to admin org without branch context") is unreachable via the API: the pre-existing 400 for non-super-admin without branch (productsCreateService.ts:139-151) fires first. The fallback (`resolvedOrg = fallbackOrganizationId`) is defensive-only. Align the spec wording with the actual contract, or note the dead branch for later removal.
2. Add `test.setTimeout(180_000)` (or `test.describe.configure`) to both un-skipped specs so their 90s assertion timeouts can actually fire on cold dev servers; also raise it for `global.setup.ts` (the 10s client-side admin-check timeout + cold first load can false-redirect to /onboarding/choice).
3. Known follow-ups (already documented, not this change's responsibility): delete-or-fix `import/route.ts` (NULL-org persists); remove the now-unreachable org-wide stock branch (`productsCreateHelpers.ts:155-170`).

### Verdict

**Envelope verdict: FAIL (gate-level) — implementation verdict: PASS WITH WARNINGS**

The strict envelope verdict is `fail` because the declared test and build commands exit non-zero (E2E UI-verification steps under cold dev-server compile; repo-wide pre-existing tsc baseline). Per the orchestrator's known context, both are documented as environmental/pre-existing, NOT code failures of this change:

- The change itself is spec-compliant: 10/11 spec scenarios verified with passing runtime evidence (session-authenticated API checks) and the 11th (fallback) implemented per design. No CRITICAL code findings.
- The E2E API regression guards (product branch-first org resolution → sale 2xx + order_number; convert 2xx + work_order_number + status advance) passed every run they executed; only the UI-render steps are killed by the 30s test timeout racing on-demand route compilation (warm stack: `/admin/work-orders` serves 200 in 1.1s).
- `tsc` exit 2 is the pre-existing baseline (3366 errors on main, unchanged class-wise; diff is error-neutral, net −3 on changed files). Lint has 1 NEW `max-lines` error (style-gate, WARNING).

**Archive recommendation**: not archive-ready until (a) the two E2E specs pass on a warm stack or gain `test.setTimeout(180_000)`, and (b) the lint `max-lines` error is addressed or explicitly accepted. The code itself does not need rework; the remaining items are test-robustness and lint-config hygiene.

**Evidence notes**: All API-level spec checks executed against the live local Supabase stack (`project_id web`) with a real e2e-test@example.com session.

---

# Re-run (2026-08-12) — gatekeeper correction verification

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:7ec2347cc3f1b7e7d40b2c2c2237be2640594f72e27d7d9857b209c76cc22c97
verdict: fail
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 11/11
test_command: npx playwright test e2e/pos-checkout.spec.ts e2e/quote-workorder-pos.spec.ts --project=admin --reporter=line
test_exit_code: 0
test_output_hash: sha256:7ec2347cc3f1b7e7d40b2c2c2237be2640594f72e27d7d9857b209c76cc22c97
build_command: npx tsc --noEmit
build_exit_code: 1
build_output_hash: sha256:88ec1e4f6bd971aae965f576b8a61d42fea271df7d75ce3bf3882214bf129dfd
```

## Verification Report (Re-run)

**Change**: fix-e2e-revealed-bugs
**Version**: N/A (specs at openspec/changes/active/fix-e2e-revealed-bugs)
**Mode**: Standard (Strict TDD not active)
**Commit range**: 55719b9d..54ae62cc (5 commits: `43ab8073`, `18985327`, `25a2f418`, `547c4816`, `54ae62cc`)
**Re-run reason**: gatekeeper correction — prior pass found 2 actionable items (lint max-lines error; E2E 30s timeout flake), corrected by `54ae62cc` and `547c4816`. Full re-verification below; prior evidence preserved in the section above in this report file.

### Completeness

| Metric           | Value                                   |
| ---------------- | --------------------------------------- |
| Tasks total      | 10 (1.1-1.3, 2.1-2.5, 3.1-3.3, 4.1-4.6) |
| Tasks complete   | 10                                      |
| Tasks incomplete | 0                                       |

All tasks checked. Full verification run.

### Build & Tests Execution (Re-run)

**Build (type-check)**: ⚠️ exit 1 — pre-existing repo-wide baseline, diff error-neutral

```text
npx tsc --noEmit   → 3355 errors (this run has no .next/types noise; prior 3366 included generated route types)
Changed files (per-file errors, HEAD vs parent 55719b9d):
  productsCreateService.ts       6 = 6   (same TS18046 body-unknown x5 + TS2769 x1; line shifts only)
  productsCreateHelpers.ts      11 = 11  (same classes; TS2769 line shift 164→167 from ponytail comment)
  quotes/[id]/convert/route.ts   1 = 1   (pre-existing TS2345 IsAdminParams at line 28 — present at parent too; prior pass mis-recorded as 0=0, still error-neutral)
  e2e/pos-checkout.spec.ts       4 = 4   (same TS2339 messages, shifted lines)
  e2e/quote-workorder-pos.spec.ts 6 → 3  (net −3, hard-assert rewrite)
```

Per-file comparison of the 5 changed files between HEAD and parent proves the diff is error-neutral to net-negative. The 3355 vs 3366 total delta is `.next/types/**/*.ts` generated-route noise (absent this run).

**Lint (5 changed files)**: ✅ 0 new errors — correction `54ae62cc` verified

```text
npx eslint productsCreateService.ts productsCreateHelpers.ts quotes/[id]/convert/route.ts e2e/pos-checkout.spec.ts e2e/quote-workorder-pos.spec.ts
HEAD (54ae62cc):  1 error  (no-restricted-imports, PRE-EXISTING) / 28 warnings  → max-lines error GONE
Parent (55719b9d): 1 error  (no-restricted-imports) / 40 warnings
Prior HEAD (25a2f418): 2 errors (no-restricted-imports + max-lines) — the 2nd error is eliminated by the eslint-disable + ponytail comment in 54ae62cc.
```

**Tests (unit)**: ✅ 1902 passed / ❌ 11 failed (4 files) — all 11 pre-existing, unchanged

```text
npx vitest run src/__tests__/unit
Re-run:  4 files failed, 11 tests failed (payment-service 8, productService 1, products/service 1, send-delivery-completion-email 1), 1902 passed
Prior:   SAME 4 files, SAME 11 tests failed — zero new failures
```

None of the failing test files import any changed file (verified: no productsCreateService/productsCreateHelpers/convert imports under src/**tests**). Unit-test-neutral.

**Tests (E2E)**: ✅ PASS — correction `547c4816` verified (cold dev server)

```text
npx playwright test e2e/pos-checkout.spec.ts e2e/quote-workorder-pos.spec.ts --project=admin --reporter=line
Run A (cold, webServer auto-start): 3 passed (2.4m), exit 0
Run B (re-run, full output captured): 3 passed (2.3m), exit 0
```

Both previously-flaky UI-verification steps now complete: pos-checkout verifies the order row (order_number + customer + $10.000) on the cash-register Ventas/Órdenes tab; quote-workorder verifies work_order_number on /admin/work-orders and the status advance to ready_for_pickup. `test.setTimeout(180_000)` in both specs + `setup.setTimeout(180_000)` in global.setup.ts give the 90s assertion timeouts room to fire under on-demand route compile. Local Supabase stack was up (54321 → 200). The API regression guards (product branch-first org resolution → sale 2xx + order_number; convert 2xx + work_order_number + status advance) passed in every run.

**Coverage**: ➖ Not available (no coverage threshold configured for E2E; changed files have no unit coverage by design).

### Spec Compliance Matrix (authoritative counts: 7 requirements, 11 scenarios)

| Requirement                                                                              | Scenario                                             | Test                                                                                                                                                                   | Result                                                                |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| R1 admin-product-org-scoping: Branch-first org resolution                                | Create with branch_id payload lands in branch's org  | API: POST product branch_id=96823c54 → product.organization_id = branch's org (2c01307e), NOT admin's (0001)                                                           | ✅ COMPLIANT                                                          |
| R1                                                                                       | Create with x-branch-id header lands in branch's org | API: POST product x-branch-id header, no payload branch_id → org 2c01307e                                                                                              | ✅ COMPLIANT                                                          |
| R1                                                                                       | Fallback to admin org without branch context         | Code: `resolvedOrg = fallbackOrganizationId` (productsCreateService.ts:169,178); path shadowed by pre-existing 400 for non-super-admin without branch — defensive-only | ⚠️ PARTIAL (mechanism implemented; literal GIVEN unreachable via API) |
| R1                                                                                       | Stock rows target the resolved org's branches        | API: product_branch_stock row for branch 96823c54 in resolved org; no rows in admin's own org                                                                          | ✅ COMPLIANT                                                          |
| R2 admin-product-org-scoping: Super admin global without branch rejected                 | Global super admin with no branch gets 400           | API: POST no branch/header → HTTP 400 {"error":"Como super administrador en vista global, debe especificar la sucursal para el producto","field":"branch_id"}          | ✅ COMPLIANT                                                          |
| R3 admin-product-org-scoping: Product list stays org-scoped                              | List scoped to the branch's org                      | API: GET /api/admin/products with x-branch-id → HTTP 200 (derivation pre-existing, regression only)                                                                    | ✅ COMPLIANT                                                          |
| R1 quote-work-order-conversion: Convert defaults                                         | Frame-only quote converts successfully               | API: convert → work_order_number returned, lens_type=single_vision, lens_material=cr39                                                                                 | ✅ COMPLIANT                                                          |
| R1                                                                                       | Missing frame name falls back to Marco               | API: quote without frame_name → convert → frame_name="Marco"                                                                                                           | ✅ COMPLIANT                                                          |
| R2 quote-work-order-conversion: Lens quote preserves lens data                           | Lens quote keeps its lens type and material          | API: progressive/polycarbonate preserved unchanged                                                                                                                     | ✅ COMPLIANT                                                          |
| R3 quote-work-order-conversion: Contact-lens literal mapping                             | CL literal mapped and contact fields preserved       | API: 'Lentes de contacto' → single_vision + contact_lens_rx_sphere_od preserved                                                                                        | ✅ COMPLIANT                                                          |
| R4 quote-work-order-conversion: CL line items produce no work orders (recorded decision) | CL-only quote conversion documented out of scope     | Recorded decision; load-to-pos direct delivery untouched (regression by inspection)                                                                                    | ✅ COMPLIANT                                                          |

**Compliance summary**: 10/11 scenarios fully compliant with passing runtime evidence; 1 PARTIAL (S3 fallback — mechanism implemented per design, literal GIVEN shadowed by pre-existing 400; no spec deviation, defensive-only code). All E2E API regression guards passed in this re-run's two green runs.

### Correctness (Static Evidence — unchanged, re-confirmed)

| Requirement                                                                            | Status         | Notes                                                                                     |
| -------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| Branch-first org resolution (payload → header → context)                               | ✅ Implemented | productsCreateService.ts:118-120, 169-180 — mirrors processSaleBusinessLookups.ts:220-236 |
| 400 for super admin global without branch                                              | ✅ Implemented | 124-137; exact mirror of customersCreateService.ts:145-152                                |
| Resolved org threaded to tier limit, payload, stock                                    | ✅ Implemented | 186-189 (tier), 228 (buildProductPayload), 293 (handleProductStock)                       |
| Param rename organizationId → fallbackOrganizationId                                   | ✅ Implemented | line 25; call site route.ts unchanged                                                     |
| Convert defaults: frame_name/Marco, lens_type/single_vision+CL map, lens_material/cr39 | ✅ Implemented | convert/route.ts:113, 121-124, 126 — exact per design                                     |
| contact*lens*\* fields preserved                                                       | ✅ Implemented | convert/route.ts:136-156 untouched                                                        |
| ponytail comment on unreachable org-wide stock branch                                  | ✅ Implemented | productsCreateHelpers.ts:155-157                                                          |

### Coherence (Design)

| Decision                                                | Followed? | Notes                                                                                                                                     |
| ------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Super-admin-global product POST → 400 (spec D1)         | ✅ Yes    | Exact mirror of customer-create pattern                                                                                                   |
| Inline org resolution, no extracted helper (YAGNI)      | ✅ Yes    | Inline in service; E2E/API checks are the runnable evidence                                                                               |
| `??` defaults over nullable columns / reject (Option A) | ✅ Yes    | Zero migration; mirrors process_pos_sale COALESCE                                                                                         |
| CL literal mapped defensively, no CL-only WO production | ✅ Yes    | load-to-pos untouched                                                                                                                     |
| import/route.ts out of scope + follow-up note           | ✅ Yes    | Untouched; NULL-org persists (documented follow-up)                                                                                       |
| E2E un-skip + branch_id on product POSTs                | ✅ Yes    | Both un-skipped with branch_id; deviations (route interception, /admin/work-orders verification) documented in commit 25a2f418, test-only |
| Correction 54ae62cc: max-lines exemption                | ✅ Yes    | eslint-disable + ponytail comment; lint error eliminated, 0 new errors                                                                    |
| Correction 547c4816: cold-server timeouts               | ✅ Yes    | test.setTimeout(180_000) in both specs + global.setup.ts; both E2E runs green on cold dev server                                          |

### Issues Found

**CRITICAL**: None. `blockers: 0`, `critical_findings: 0`. Both gatekeeper findings are resolved: lint `max-lines` error eliminated (54ae62cc), E2E cold-server flake eliminated (547c4816, both specs pass 2/2 runs on cold dev server).

**WARNING**:

1. **Spec S3 fallback is defensive-only** (carried from prior pass, unchanged): the literal GIVEN "non-super-admin without branch context falls back to admin org" is shadowed by a pre-existing 400 for non-super-admin without branch (productsCreateService.ts:139-151). The fallback mechanism (`resolvedOrg = fallbackOrganizationId`) is implemented per design; the scenario cannot be exercised via the API as literally written. Spec-wording alignment or dead-branch removal is a follow-up, not a blocker.

**SUGGESTION**:

1. Align spec `admin-product-org-scoping` S3 wording with the actual contract (fallback fires only when no branch resolves AND the caller is super admin with a branch-less context path that isn't global — effectively unreachable today), or note the dead branch for later removal.
2. Prior-pass note on the convert/route.ts per-file tsc count: it is 1=1 (pre-existing TS2345 at line 28), not 0=0 — corrected in this re-run's evidence; no impact on the verdict.
3. Known follow-ups (already documented, not this change's responsibility): delete-or-fix `import/route.ts` (NULL-org persists); remove the now-unreachable org-wide stock branch (`productsCreateHelpers.ts:155-170`).

### Verdict

**Envelope verdict: FAIL (gate-level) — implementation verdict: PASS (no remaining blockers); archive CLEAR**

The strict envelope verdict is `fail` because the declared build command `npx tsc --noEmit` exits non-zero (exit 1). Per the validator contract, `pass`/`pass_with_warnings` are admitted only when ALL declared commands exit 0. The non-zero build exit is the repo-wide pre-existing tsc baseline (3355 errors, all present at parent; diff error-neutral to net-negative on every changed file) — the same documented baseline that produced the prior pass's fail. This is NOT a code failure of this change:

- Correction `54ae62cc` (lint): verified — the `max-lines` error is gone; only the pre-existing `no-restricted-imports` error remains. 0 new lint errors.
- Correction `547c4816` (timeouts): verified — both un-skipped E2E specs pass on a cold auto-started dev server (3 passed, 2.4m; re-run 3 passed, 2.3m), including the UI-verification steps that previously died at the 30s default timeout. Test command exits 0.
- `tsc`: diff remains error-neutral to net-negative on all 5 changed files (3355 total, all pre-existing).
- Unit suite: identical to baseline — 1902 passed, same 11 pre-existing failures in 4 files, none touching changed code.
- Spec conformance: 10/11 scenarios with passing runtime evidence, 1 PARTIAL (mechanism implemented, scenario literally unreachable — pre-existing contract shadow, no code defect).

**Archive recommendation**: clear to archive. Both gatekeeper blockers resolved with verified runtime evidence (lint error eliminated; E2E green 2/2 cold runs). The remaining items (spec S3 wording, import route follow-up, dead stock-branch removal) are documented non-blocking follow-ups. If the orchestrator requires a `pass` envelope, the only remaining action is addressing the repo-wide pre-existing tsc baseline (out of scope for this change).

**Evidence notes**: All E2E API + UI checks executed against the live local Supabase stack (`project_id web`) with a real e2e-test@example.com session; dev server auto-started cold by Playwright webServer (2 runs).
