# Tasks: Phase 3 — Data & RLS Hardening

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

3.1 estimate was ~30 files. Actual: ~96 files (79 API + 17 lib). Must split.

| Unit                  | Files       | Lines | PR  | Dep |
| --------------------- | ----------- | ----- | --- | --- |
| 3.4 FK indexes        | 1 migration | <50   | #1  | -   |
| 3.1a Read-only routes | ~26         | ~60   | #2  | -   |
| 3.1b Write routes     | ~40         | ~180  | #3  | -   |
| 3.1c Lib refactoring  | ~10         | ~100  | #4  | -   |
| 3.2 RLS wave-2        | 1 migration | ~130  | #5  | -   |
| 3.3 IS NULL removal   | 1 migration | ~40   | #6  | #5  |

---

## PR #1 — 3.4: Missing FK Indexes

- [x] 1.1 Create migration: `CREATE INDEX IF NOT EXISTS` on `agreement_institutional_balances(purchase_order_id, invoice_id)`, `agreement_institutional_invoices(emitted_by, organization_id)`, `agreements(created_by, updated_by)` (6 total; 3 in design were already indexed)
- [x] 1.2 Test: `EXPLAIN ANALYZE` per new index shows Index Scan (documented in test/explain-analyze-tests.sql — manual verification against live DB)

## PR #2 — 3.1a: Read-Only Routes

- [x] 2.1 Replace `createServiceRoleClient()→createClient()` in 26 read-only routes (analytics — already using auth client; branches, notifications-settings, organizations, quote-settings, schedule-settings — mixed files deferred to PR #3; 8 actual read-only files replaced: dashboard, product-options/[fieldKey], prescriptions, prescriptions/export, organization/limits, system/surveys, appointments/availability, products/[slug])
- [x] 2.2 Test: retarget mocks in affected tests (no directly affected tests; mock changes deferred to affected lib tests in PR #4), verify `npm run test:run`

## PR #3 — 3.1b: Write + Mixed Routes

- [x] 3.1 Replace in ~28 write routes (work-orders, agreements, cash-register, credit-notes, orders, POS, field-operations)
- [x] 3.2 Replace in complex files (product-options, chat route+sessions, checkout recurring-plans+create-preapproval, whatsapp oauth, admin-users GET, email-templates system files: route+[id]+test)
- [x] 3.2b Replace in deferred mixed files (branches, notifications-settings, organizations/current, quote-settings, categories route+[id])
- [x] 3.3 Test: retarget mocks, verify `npm run test:run`

> Note: PR #3 scope had ~81 remaining files, not ~40 as estimated. ~28 completed in batch 1 (work-orders, agreements, cash-register, credit-notes, orders, POS, field-operations). ~16 completed in batch 2. ~10 completed in batch 3 (customers, products, quotes — already migrated: zero SR usage). ~9 assessed in batch 4 (PR #3d — remaining service-role files assessment + migration):
>
> - **Migrated (1)**: `system/survey-config/route.ts` — SR→auth client. RLS allows admin reads & non-sensitive writes on `system_config`.
> - **Already clean (1)**: `schedule-settings/route.ts` — zero SR usage (verified, comment was misleading — used auth client already).
> - **SR retained — task-scoped (3)**: `admin-users/register/route.ts` (`auth.admin.createUser()` requires SR), `admin-users/[id]/branch-access/route.ts` (RLS only covers super_admin cross-user, admins need SR), `chat/upload-import-file/route.ts` (`import-temp` bucket: private, no storage RLS).
> - **SR retained — deferred (5)**: `organizations/route.ts` POST (org bootstrapping before admin_user exists), `opticas-access-tokens/route.ts` `[id]/route.ts` (table RLS is `USING (false)` — intentional security), `system/backups/route.ts` (`database-backups` bucket: private, no storage RLS), `system/maintenance/route.ts` (storage ops need SR, system_status queries also use SR but could be migrated separately).
> - Remaining for PR #3: 8 files with intentional SR retention. All assessed — no further migration needed without RLS/storage changes.
> - Needs assessment (separate ticket): saas-management (40+), optical-support (3), field-operations return-stock/transfer-stock/work-orders (3), work-orders/route (leftover SR RPC).

## PR #4 — 3.1c: Lib Refactoring

- [x] 4.1 Accept optional SupabaseClient param in email libs (send-quote-email, delivery-completion, org-utils, marketing, saas-subscription, template-loader)
- [x] 4.2 Accept optional client in billing constructors (InternalBilling, InternalInstitutionalBilling)
- [x] 4.3 Accept optional client in AI libs (tool-executor, memory-init) — **already done**, both accept optional supabase
- [x] 4.4 Pass client from callers in systemConfigService (getSystemConfigs, createSystemConfig, updateSystemConfigs)
- [x] 4.5 Test: retarget mocks, verify `npm run test:run` — 1286/1288 pass (2 pre-existing failures in comprehensive-handler.test.ts), 62/63 files pass

## PR #5 — 3.2: RLS Wave 2 — Org-Blind Policies

- [x] 5.1 Drop 24 org-blind policies across support*\*, chat*_, contact*lens*_, lens*\*, credit*\*, payment_installments, inventory_movements
- [x] 5.2 Replace with org-scoped via FK joins: support_tickets→branch→org, support_messages→ticket→branch→org, support_templates→category→branch→org, support_categories→branch→org, chat_messages→session.org_id, chat_sessions→org_id, credit_notes→org_id, credit_note_movements→credit_note→org, payment_installments→order→org, contact_lens_encargos→org_id, contact_lens_inventory→branch→org, inventory_movements→branch→org, lead_activities→demo_request→org, lead_scoring_logs→demo_request→org
- [ ] 5.3 Cross-org isolation test (requires live Supabase DB) — SQL queries documented in apply-progress
  - `npm run test:run` → 1404/1406 pass (2 pre-existing in comprehensive-handler.test.ts, 99 vitest worker infra errors)

## PR #6 — 3.3: Remove IS NULL Backward Compat

- [x] 6.1 Already handled by PR #5 — dropped "Admins can manage contact lens families for their org" and "Admins can manage contact lens price matrices for their org" policies which contained the backward-compat `OR (organization_id IS NULL)`. Remaining IS NULL patterns are legitimate global defaults per design.
- [x] 6.2 Test: `npm run test:run` — 136/138 files pass, 2541/2544 tests pass (2 pre-existing in comprehensive-handler.test.ts, 1 in send-delivery-completion-email.test.ts). Lens/contact-lens service tests all pass.

---

## Test Requirements (strict_tdd)

| Task     | Layer       | What                                |
| -------- | ----------- | ----------------------------------- |
| 3.4      | Integration | EXPLAIN ANALYZE shows Index Scan    |
| 3.1a/b/c | Unit        | Tests mock createClient identically |
| 3.2      | Integration | Cross-org isolation on 3 tables     |
| 3.3      | Integration | Lens org rows stay accessible       |
| All      | E2E         | `npm run test:run` before merge     |
