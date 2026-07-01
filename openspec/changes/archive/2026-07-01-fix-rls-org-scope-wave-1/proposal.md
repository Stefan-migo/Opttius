# Proposal: Fix RLS Org Scope — Wave 1

## Intent

~9 business tables still use org-blind `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())` RLS policies, letting any admin from any organization access data across tenant boundaries. This is a multi-tenant data isolation vulnerability.

## Scope

### In Scope

- RLS audit of remaining 98 tables confirmed: **1 table** needs patching
- Add `organization_id` column to `customer_lens_purchases` + backfill from `orders`/`customers`
- Create org-scoped RLS policies for `customer_lens_purchases`
- One new migration file — no edits to existing migrations

### Out of Scope

- `product_option_fields`, `product_option_values` — confirmed as global reference data, leave as-is
- `agreement_customers`, `agreement_institutional_invoice_balances`, `agreement_institutional_invoices`, `notification_settings` — already org-scoped, no change needed
- `system_maintenance_log`, `system_health_metrics` — truly global system tables, leave as-is
- Tables already fixed by prior migrations (`order_items`, `order_payments`, `payment_gateways_config`)
- App query changes — RLS must be superset of current

## Capabilities

### New Capabilities

None — this is a security hardening fix, no new features.

### Modified Capabilities

None — no spec-level behavior changes. RLS remains transparent to app queries.

## Approach

1. **Audit**: Run `DO $$` block iterating `information_schema.tables` to find every table where RLS policies reference `admin_users` without an org-scoped `JOIN`/`IN`/`EXISTS` filter. Cross-reference with known-good policies.
2. **Patch**: One migration with `DROP POLICY IF EXISTS` + `CREATE POLICY` for each affected table, replacing org-blind `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())` with org-scoped `organization_id IN (SELECT organization_id FROM admin_users WHERE id = auth.uid())`.
3. **Verify**: Write SQL assertions (`DO $$ ... RAISE EXCEPTION` blocks) that confirm:
   - `organization_id` column exists on `customer_lens_purchases`
   - Old org-blind policy was dropped
   - A user from Org A cannot read/write Org B data

## Affected Areas

| Area                                                              | Impact | Description                                                 |
| ----------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| `supabase/migrations/YYYYMMDDHHMMSS_fix_rls_org_scope_wave_1.sql` | New    | One migration patching all remaining org-blind RLS policies |

## Risks

| Risk                                                                           | Likelihood | Mitigation                                                                |
| ------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------- |
| Break app queries if new RLS is too restrictive                                | Low        | Superset principle — new policies add org filter to existing admin check  |
| Migration number collision                                                     | Low        | Use timestamp after latest migration (`20260701000012`)                   |
| `system_maintenance_log` / `system_health_metrics` may need different approach | Medium     | Verify first; if truly global, leave policies as-is and document decision |

## Rollback Plan

Run the inverse migration (re-create org-blind `EXISTS` policies) or deploy the previous migration state. The change is one reversible migration — full rollback in one command via Supabase migration down.

## Dependencies

- Latest migration applied: `20260701000012_fix_payment_gateways_config_rls.sql`
- No external dependencies

## Success Criteria

- [ ] All 98 business tables have org-scoped RLS (no org-blind `EXISTS (SELECT 1 FROM admin_users)` remains)
- [ ] New migration applies cleanly against `20260701000000_schema_complete.sql`
- [ ] RLS assertions pass: cross-org access is denied for each patched table
- [ ] Full `npm run build` passes (no app code changes needed)
