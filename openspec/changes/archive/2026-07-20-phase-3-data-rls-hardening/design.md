# Design: Phase 3 — Data & RLS Hardening

**Source**: `openspec/audits/ROADMAP.md` — Phase 3 (3.1–3.4)
**Date**: 2026-07-19
**Status**: Draft

---

## Technical Approach

Four independent layers stacked as PRs to main:

1. **3.4 FK indexes** → pure SQL migration (zero risk, zero code changes)
2. **3.1 Service-role reduction** → replace ~30 API route usages with auth client
3. **3.2 RLS wave-2** → drop org-blind policies on ~12 tables, consolidate to `is_super_admin(auth.uid()) OR organization_id = get_user_organization_id()`
4. **3.3 Remove `IS NULL` backward compat** → strip legacy fallback `OR (organization_id IS NULL)` from lens/contact-lens policies

Order: 3.4 (safe first, tiny), 3.1 (no deps), then 3.2 → 3.3 (sequential).

---

## Architecture Decisions

### Decision: service_role → auth client replacement criteria

| Criterion                                      | Replace                       | Keep service_role                   |
| ---------------------------------------------- | ----------------------------- | ----------------------------------- |
| Route has user session check                   | ✅ Replace                    | ❌                                  |
| Uses service_role for reads after auth check   | ✅ Replace (RLS should cover) | ❌                                  |
| Accesses `auth.users` table                    | ❌                            | ✅ Needs service_role               |
| Public endpoint (no user session)              | ❌                            | ✅ surveys, support ticket creation |
| Creates admin users                            | ❌                            | ✅ onboarding                       |
| `SECURITY DEFINER` RPC that needs global scope | ❌                            | ✅ `generate_work_order_number()`   |

**Rationale**: The ~30 API routes using `createServiceRoleClient()` follow a pattern: authenticate user → check admin → bypass RLS with service_role. Replace with the already-authenticated `createClient()` — RLS already scopes org access. Keep service_role only for webhook handlers, onboarding (creates `auth.users`), public survey endpoints, and `generate_work_order_number` (needs global sequence).

**Count after reduction**: ~30 → ~8 legitimate service_role usages.

### Decision: RLS wave-2 — drop org-blind policies, keep only org-scoped

PostgreSQL combines policies with OR — one org-blind policy on a table makes all org-scoped policies useless for that operation. Wave-2 drops every policy matching `EXISTS (SELECT 1 FROM admin_users WHERE ...)` (no org check) where an org-scoped alternative already exists.

Tables with redundant org-blind policies:

| Table                         | Orphan Policies                                             | Org-scoped Alternative Exists?              | Action                                                                                                  |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `contact_lens_encargos`       | 3 (insert, update, delete)                                  | Yes — "Users can ... in their organization" | Drop blind policies                                                                                     |
| `contact_lens_inventory`      | 2 (delete, update)                                          | Partial — SELECT is scoped                  | Add `is_super_admin OR organization_id = get_user_organization_id()` via branch → product → family join |
| `contact_lens_families`       | 1 ("Admins can manage contact lens families for their org") | Yes — 2 org-scoped exist                    | Drop the combined blind+ISNULL policy                                                                   |
| `contact_lens_price_matrices` | 1 (same pattern)                                            | Yes                                         | Same as families                                                                                        |
| `lens_families`               | 2 (delete, "Admins can manage lens families")               | Yes — "Users can view ... in their org"     | Drop blind policies                                                                                     |
| `lens_price_matrices`         | 2 (delete, "Admins can manage lens price matrices")         | Yes                                         | Drop blind policies                                                                                     |
| `support_tickets`             | 1 ("Admin users can manage tickets")                        | Yes — branch-scoped policies                | Drop blind per-table, keep branch-scoped                                                                |
| `support_messages`            | 1 ("Admin users can manage messages")                       | None for admin (only customer-scoped)       | Replace with org-scoped via ticket join                                                                 |
| `support_categories`          | 1 ("Admin users can manage support categories")             | Yes — branch-scoped                         | Drop blind                                                                                              |
| `support_templates`           | 1 ("Admin users can manage templates")                      | None                                        | Add `is_super_admin OR organization_id = get_user_organization_id()`                                    |
| `credit_notes`                | 1 ("Admins can manage credit_notes")                        | None                                        | Add org-scoped through `branch_id` join                                                                 |
| `credit_note_movements`       | 1 (same)                                                    | None                                        | Same as credit_notes                                                                                    |
| `payment_installments`        | 1 ("Admins can manage installments")                        | None                                        | Add org-scoped through `order_id` join                                                                  |

**Pattern**: `is_super_admin(auth.uid()) OR organization_id = get_user_organization_id()` when the table has `organization_id` directly. For tables without it (e.g., `contact_lens_inventory`), use a join through the relationship chain.

### Decision: `organization_id IS NULL` — what to keep vs remove

| Policy Context                         | `IS NULL` Meaning                    | Action                                                  |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| `contact_lens_families.price_matrices` | Legacy backward-compat               | **Remove** — all org data now has `organization_id` set |
| `system_email_templates`               | Legitimate: global SaaS templates    | **Keep** — template inheritance pattern                 |
| `schedule_settings`                    | Legitimate: global defaults          | **Keep** — branch_id IS NULL = global defaults          |
| `support_categories/tickets`           | Legitimate: global categories        | **Keep** — branch_id IS NULL = global                   |
| `saas_support_tickets` CREATE          | Legacy safety net                    | **Remove** — no tickets should have NULL org            |
| `admin_notifications`                  | Legitimate: root-level system alerts | **Keep** — root users need org-NULL access              |

**Scope for 3.3**: Only remove the backward-compat `OR (organization_id IS NULL)` from `contact_lens_families` and `contact_lens_price_matrices` policies. All other `IS NULL` patterns serve legitimate purposes.

### Decision: FK indexes — targeted, not exhaustive

| Table                              | FK Column           | Target Table                       | Index? | Create?               |
| ---------------------------------- | ------------------- | ---------------------------------- | ------ | --------------------- |
| `agreement_institutional_balances` | `purchase_order_id` | `agreement_purchase_orders`        | ❌     | ✅                    |
| `agreement_institutional_balances` | `invoice_id`        | `agreement_institutional_invoices` | ❌     | ✅                    |
| `agreement_institutional_invoices` | `emitted_by`        | `auth.users`                       | ❌     | ✅                    |
| `agreement_institutional_invoices` | `organization_id`   | `organizations`                    | ❌     | ✅                    |
| `agreements`                       | `organization_id`   | `organizations`                    | ❌     | ✅ (critical for RLS) |
| `agreements`                       | `branch_id`         | `branches`                         | ❌     | ✅                    |
| `agreements`                       | `created_by`        | `auth.users`                       | ❌     | ✅                    |
| `agreements`                       | `updated_by`        | `auth.users`                       | ❌     | ✅                    |
| `telemetry_config`                 | `organization_id`   | `organizations`                    | ❌     | ✅ (no index at all)  |

**Rationale**: `agreements.organization_id` and `telemetry_config.organization_id` are the most critical — they're queried by every RLS policy and app query respectively. The `auth.users` FK indexes (`emitted_by`, `created_by`, `updated_by`) are nice-to-have since these are rarely queried by user ID.

### Decision: PR order

```
main ← PR #1 (3.4 — FK indexes, 1 migration, < 50 lines)
main ← PR #2 (3.1 — service-role reduction, ~25 file edits)
main ← PR #3 (3.2 — RLS wave-2, 1 migration, ~12 policy drops)
main ← PR #4 (3.3 — remove IS NULL, 1 migration, ~4 policy rewrites)
```

Each PR ≤ 400 lines per proposal constraint.

---

## Data Flow

```
3.1 (service_role → auth):
  API Route → createClient() → RLS scoped query → Response
              instead of:
  API Route → createServiceRoleClient() → full access → Response

3.2 (RLS wave-2):
  User query → RLS checks org-scoped policies → "Admins can X in their org"
              previously:
  User query → RLS matches BOTH blind + org-scoped → org-blind wins (OR)
```

---

## File Changes

| Task | File                                                                   | Action | Description                                      |
| ---- | ---------------------------------------------------------------------- | ------ | ------------------------------------------------ |
| 3.4  | `supabase/migrations/20260701000016_add_fk_indexes.sql`                | Create | 9 new btree indexes on FK columns                |
| 3.1  | `src/app/api/admin/work-orders/*.ts`                                   | Modify | Replace service_role with auth client (6 files)  |
| 3.1  | `src/app/api/admin/agreements/*.ts`                                    | Modify | Same pattern (4 files)                           |
| 3.1  | `src/app/api/admin/cash-register/*.ts`                                 | Modify | Same pattern (4 files)                           |
| 3.1  | `src/app/api/admin/orders/*.ts`                                        | Modify | Same pattern (3 files)                           |
| 3.1  | `src/app/api/admin/chat/*.ts`                                          | Modify | Same pattern (3 files)                           |
| 3.1  | `src/app/api/admin/dashboard/route.ts`                                 | Modify | Replace dynamic import                           |
| 3.1  | `src/app/api/admin/branches/route.ts`                                  | Modify | Replace dynamic import                           |
| 3.1  | `src/app/api/admin/admin-users/*.ts`                                   | Modify | Replace (3 files)                                |
| 3.1  | `src/app/api/admin/organization/limits/route.ts`                       | Modify | Replace                                          |
| 3.1  | `src/app/api/admin/credit-notes/route.ts`                              | Modify | Replace                                          |
| 3.1  | `src/app/api/admin/system/surveys/route.ts`                            | Modify | Replace                                          |
| 3.1  | `src/app/api/admin/customers/customersCreateService.ts`                | Modify | Replace                                          |
| 3.1  | `src/app/api/categories/*.ts`                                          | Modify | Replace (2 files)                                |
| 3.1  | `src/app/api/products/[slug]/route.ts`                                 | Modify | Replace                                          |
| 3.1  | `src/app/api/checkout/*.ts`                                            | Modify | Replace (2 files)                                |
| 3.1  | `src/app/api/admin/appointments/availability/route.ts`                 | Modify | Replace                                          |
| 3.1  | `src/app/api/admin/whatsapp/oauth-callback/route.ts`                   | Modify | Replace (non-webhook section)                    |
| 3.2  | `supabase/migrations/20260701000017_rls_wave_2.sql`                    | Create | Drop ~20 org-blind policies, keep ~12 org-scoped |
| 3.3  | `supabase/migrations/20260701000018_remove_isnull_backward_compat.sql` | Create | Rewrite 4 lens/contact-lens policies             |

### Files NOT changed (legitimate service_role)

| File                                    | Reason                                       |
| --------------------------------------- | -------------------------------------------- |
| `src/app/api/cron/*`                    | Already using `cron_role` per prior phase    |
| `src/app/api/webhooks/*`                | No user session — needs elevated role        |
| `src/app/api/onboarding/*`              | Creates `auth.users` — requires service_role |
| `src/app/api/surveys/[token]/validate`  | Public token validation — no user session    |
| `src/app/api/surveys/submit`            | Public submission — no user session          |
| `src/app/api/support/ticket/*`          | Public ticket lookup — no user session       |
| `src/app/api/support/create-ticket`     | Public ticket creation — no user session     |
| `src/app/api/demo-requests`             | Public demo request submission               |
| `src/app/api/landing/onboarding-config` | Public landing config                        |

---

## Migration Order

```
1. 20260701000016_add_fk_indexes.sql      (3.4 — independent)
2. 20260701000017_rls_wave_2.sql           (3.2 — safe if 3.1 deployed)
3. 20260701000018_remove_isnull_compat.sql (3.3 — requires 3.2 first)
```

3.1 is code-only (no migration). Deploy order: 3.4 → 3.1 → 3.2 → 3.3.

---

## Rollback Plan

### 3.4 (FK indexes)

`DROP INDEX IF EXISTS idx_agreements_organization_id, ...` — zero data loss, zero downtime.

### 3.1 (service-role reduction)

Per file: revert the import + variable change. Re-replace `supabase` with `supabaseServiceRole` if any route breaks.

### 3.2 (RLS wave-2)

Re-create the dropped org-blind policies from the rollback section in the migration. The schema migration already has the DDL.

### 3.3 (IS NULL removal)

Re-add `OR (organization_id IS NULL)` to the 4 rewritten policies. Documented in migration header.

---

## Risks

| Risk                                                                                      | Level  | Mitigation                                         |
| ----------------------------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| Replacing service_role breaks route that needs cross-org access                           | Medium | Test each route after; start with read-only routes |
| `generate_work_order_number` produces duplicate numbers via auth client                   | Medium | Keep on service_role or add SECURITY DEFINER       |
| Dropping org-blind RLS on `credit_notes` breaks something that relied on the blind policy | Low    | Audit all `credit_notes` queries first             |
| FK index on `telemetry_config.organization_id` causes write slowdown                      | Low    | Telemetry config is read-mostly, 1 row per org     |

---

## Testing Strategy

| Layer       | What           | Approach                                                                |
| ----------- | -------------- | ----------------------------------------------------------------------- |
| Integration | 3.4 FK indexes | `EXPLAIN ANALYZE` on join queries against new tables                    |
| Integration | 3.2 RLS        | Apply migration against a fresh schema copy, verify cross-org isolation |
| Integration | 3.3 IS NULL    | Verify that lens/contact-lens rows with org_id are still accessible     |
| E2E         | 3.1            | Smoke-test admin CRUD routes: work-orders, agreements, orders, products |
| Manual      | All            | `npm run test:run` before each PR merge                                 |

---

## Open Questions

- [ ] `credit_notes` and `credit_note_movements` don't have `organization_id` columns — need to determine join path for RLS (through `branch_id` → `branches.organization_id`). Should this be a schema change?
- [ ] `contact_lens_inventory` doesn't have `organization_id` — the join path is `branch_id` → `branches.organization_id`. Should we add the column (following wave-1 pattern) or use subquery join for RLS?
- [ ] `payment_installments` RLS path: through `order_id` → `orders.organization_id`. Confirm the FK exists.
