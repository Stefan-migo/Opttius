# Design: Fix RLS Org Scope — Wave 1

## Technical Approach

One migration (`20260701000013_fix_rls_org_scope_wave_1.sql`) patching the final remaining org-blind RLS policy. After full code audit: only **`customer_lens_purchases`** is truly vulnerable (org-blind + no org-scope check + no `organization_id` column). `product_option_fields` and `product_option_values` confirmed as global reference data — left untouched. 4 other tables already correctly scoped. 2 are global system tables.

## Code Audit Results

Verified against `supabase/migrations/20260701000000_schema_complete.sql`.

### Group A — Truly Vulnerable (must patch)

| Table                     | Has `org_id`? | Policies      | Verdict                                                                        |
| ------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------ |
| `customer_lens_purchases` | **No**        | 4/4 org-blind | Needs `organization_id` column + RLS (FK to `order_id` available for backfill) |

### Group B — Truly Global System Tables (leave as-is)

| Table                    | Reason                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `system_maintenance_log` | No `organization_id`. SaaS admin tooling — global by nature. Retain org-blind policies. |
| `system_health_metrics`  | No `organization_id`. System monitoring — global by nature. Retain.                     |

### Group C — Already Org-Scoped (no change needed)

| Table                                      | Why it's already correct                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `agreement_customers`                      | SELECT joins `agreements` + checks `organization_id IN (SELECT ...)` — already scoped. |
| `agreement_institutional_invoice_balances` | INSERT/SELECT join through `invoices` → `agreements` — already scoped.                 |
| `agreement_institutional_invoices`         | Has `organization_id` column; policies check org scope — already correct.              |
| `notification_settings`                    | Has `organization_id` column; policies check org scope — already correct.              |

## Architecture Decisions

### Decision: Schema change is required — proposal constraint must be updated

**Choice**: Add `organization_id` columns to Group A tables. The proposal said "no schema changes" but all 3 truly vulnerable tables lack `organization_id`. A policy-only fix is impossible for these tables.

**Alternatives considered**:

1. Policy-only fix with `JOIN` through parent tables — not possible because RLS `USING` clauses can't efficiently reference parent table `organization_id` without the column existing on the table itself (would require correlated subqueries through nullable FKs).
2. Skip these 3 tables — leaves org-blind vulnerability open.

**Rationale**: Prior fix migrations (`migration 09` for `order_items`, `order_payments`; `migration 12` for `payment_gateways_config`) all added `organization_id` columns before adding org-scoped RLS. This is the established pattern.

### Decision: `customer_lens_purchases` — backfill via `orders.organization_id`

**Choice**: Add `organization_id` with NOT NULL, backfill via `LEFT JOIN orders` (preferred, since order is the financial context), fallback via `LEFT JOIN customers`.

**Rationale**: `orders` has a non-nullable `organization_id` after prior migrations. `order_id` is nullable on `customer_lens_purchases` — use `COALESCE(orders.organization_id, customers.organization_id)` for rows without an order link.

## Data Flow

None — this is a security/policy migration. No application data flow changes.

## File Changes

| File                                                              | Action | Description                                                                   |
| ----------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `supabase/migrations/20260701000013_fix_rls_org_scope_wave_1.sql` | Create | One migration: add columns, backfill, add org-scoped policies, add assertions |

## Migration Strategy

### Column addition (idempotent via DO block)

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_lens_purchases' AND column_name = 'organization_id') THEN
    ALTER TABLE customer_lens_purchases ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;
```

### Backfill pattern

```sql
UPDATE customer_lens_purchases clp
  SET organization_id = COALESCE(o.organization_id, c.organization_id)
  FROM orders o
  FULL JOIN customers c ON clp.customer_id = c.id
  WHERE clp.order_id = o.id
  AND clp.organization_id IS NULL;

ALTER TABLE customer_lens_purchases ALTER COLUMN organization_id SET NOT NULL;
```

### RLS policy replacement

Drop existing policies, create new ones with `is_super_admin(auth.uid()) OR organization_id = get_user_organization_id()` pattern (matching `migration 12` convention).

### RLS assertion verification

```sql
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify each policy exists
  SELECT COUNT(*) INTO v_count FROM pg_policies WHERE tablename = 'customer_lens_purchases' AND policyname LIKE '%organization%';
  IF v_count = 0 THEN RAISE EXCEPTION 'customer_lens_purchases RLS policies missing'; END IF;
  -- repeat for each table
END $$;
```

### Migration filename

`20260701000013_fix_rls_org_scope_wave_1.sql` — follows `20260701000012_fix_payment_gateways_config_rls.sql`.

### Rollback SQL

Re-create org-blind `EXISTS (SELECT 1 FROM admin_users)` policies for patched tables. Schema additions (`organization_id` columns) are non-destructive and can remain.

## Existing RLS Helpers

| Function                     | Used in this wave? | Notes                                                                    |
| ---------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `get_user_organization_id()` | Yes                | Returns the user's org from `admin_users`. Used in prior fix migrations. |
| `is_super_admin()`           | Yes                | Super admin bypass. Used in prior fix migrations.                        |

Both are SECURITY DEFINER, `search_path = 'public'`. Follow the `migration 12` pattern: `is_super_admin(auth.uid()) OR organization_id = get_user_organization_id()`.

## Testing Strategy

| Layer       | What                            | Approach                                                                 |
| ----------- | ------------------------------- | ------------------------------------------------------------------------ |
| Unit        | SQL assertions in migration     | DO block checking policy existence and cross-org access denial           |
| Integration | Apply against fresh schema copy | Run migration on `20260701000000_schema_complete.sql` + prior migrations |
| Manual      | Verify app still works          | No app code changes expected — RLS is superset of old policies           |

## Open Questions

- [ ] **`customer_lens_purchases` backfill**: Rows with `order_id = NULL` — backfill via `customers.organization_id`. If no customer match, set to first org (edge case, expected zero rows).

## Key Risks

| Risk                                              | Mitigation                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `customer_lens_purchases` rows with no order link | Use `COALESCE(orders.org, customers.org, first_org)` — log orphan count in comment |
| Additional tables found with org-blind pattern    | Out of scope for Wave 1 — note for Wave 2                                          |
