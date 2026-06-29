# Proposal: database-multitenancy-gaps

## Intent

`order_items` and `order_payments` lack a denormalized `organization_id` column. Current RLS on `order_items` checks only `admin_users.is_active` — any admin from any org can read all items. `order_payments` RLS joins through `orders` for branch checks, but a direct table scan (e.g., analytics query, direct API access) bypasses org isolation. This is a multi-tenant data leak.

## Scope

### In Scope
- Add `organization_id UUID REFERENCES organizations(id)` to `order_items`
- Add `organization_id UUID REFERENCES organizations(id)` to `order_payments`
- Backfill from `orders.organization_id` via `order_id` FK
- Add `NOT NULL` after backfill
- Update all RLS policies on both tables to include org-scoped checks
- New DB migration file

### Out of Scope
- Removing `products.inventory_quantity` (separate change)
- Application code changes to set `organization_id` on INSERT (backfill + NOT NULL covers integrity; INSERT policies route through orders join already)
- `internal_order_items` (already has org-scoped RLS via `internal_orders` join)

## Capabilities

### New Capabilities
None — schema-level hardening, no new user-facing capability.

### Modified Capabilities
None — no spec-level behavior changes. RLS behavior changes are implementation details.

## Approach

Single migration per table:

1. `ALTER TABLE ... ADD COLUMN organization_id UUID REFERENCES organizations(id)`
2. `UPDATE t SET organization_id = o.organization_id FROM orders o WHERE t.order_id = o.id`
3. `ALTER TABLE ... ALTER COLUMN organization_id SET NOT NULL`
4. Create index: `CREATE INDEX ... ON t(organization_id)`
5. Drop all existing RLS policies on the table, recreate with `organization_id = get_user_organization_id()` check (matching pattern used by `drivers`, `internal_orders`, etc.)
6. Keep existing branch-scoped checks for `order_payments` — add `organization_id` as an additional filter, not a replacement.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Migration file for schema + RLS changes |
| `public.order_items` | Modified | New column + updated RLS policies |
| `public.order_payments` | Modified | New column + updated RLS policies |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `NOT NULL` fails on backfill due to orphan `order_id` | Low | Run backfill first, verify COUNT mismatch before adding constraint |
| RLS policy update drops existing policies mid-operation | Low | Run in transaction; Supabase RLS falls closed (deny) if policies are missing |
| Existing app inserts on `order_items`/`order_payments` omit `organization_id` | Low | NOT NULL constraint catches it at DB level; INSERT policies can still route through orders join |

## Rollback Plan

1. Remove the new migration file and rerun `supabase db reset`.
2. If already deployed: `ALTER TABLE ... DROP COLUMN organization_id CASCADE` to remove column + dependent policies.

## Dependencies

- `orders.organization_id` already populated (no missing data risk)

## Success Criteria

- [ ] `organization_id` added to both tables with NOT NULL constraint
- [ ] Backfill matches: `SELECT COUNT(*) WHERE organization_id IS NULL` = 0 for both tables
- [ ] RLS policies can no longer be bypassed by querying either table directly without org scope
- [ ] `supabase db reset` passes clean with the new migration
