# Tasks: Fix RLS Org Scope — Wave 1

## Review Workload Forecast

| Field                   | Value       |
| ----------------------- | ----------- |
| Estimated changed lines | 130–160     |
| 400-line budget risk    | Low         |
| Chained PRs recommended | No          |
| Suggested split         | Single PR   |
| Delivery strategy       | ask-on-risk |
| Chain strategy          | single-pr   |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal                                             | Likely PR | Notes                                        |
| ---- | ------------------------------------------------ | --------- | -------------------------------------------- |
| 1    | One migration file for `customer_lens_purchases` | PR 1      | Base: main. Single self-contained migration. |

## Phase 1: Schema Migration

- [x] 1.1 Create `supabase/migrations/20260701000013_fix_rls_org_scope_wave_1.sql` — add `organization_id UUID` column via idempotent `DO $$` block, add FK to `organizations(id) ON DELETE CASCADE`
- [x] 1.2 Backfill: `customer_lens_purchases` via `orders.organization_id`, then `customers.organization_id`, then first org as fallback. After backfill, `ALTER COLUMN organization_id SET NOT NULL`. Add index `idx_customer_lens_purchases_organization_id`.

## Phase 2: RLS Policy Replacement

- [x] 2.1 `DROP POLICY IF EXISTS` on the 4 org-blind policies: `"Admins can view all lens purchases"`, `"Admins can insert lens purchases"`, `"Admins can update lens purchases"`, `"Admins can delete lens purchases"`
- [x] 2.2 Create 4 org-scoped policies (`FOR SELECT`, `FOR INSERT`, `FOR UPDATE`, `FOR DELETE`) using `is_super_admin(auth.uid()) OR organization_id = get_user_organization_id()` — matching migration 12 convention

## Phase 3: Verification & Cleanup

- [x] 3.1 Add `DO $$` assertion block: verify all 4 new policies exist in `pg_policies` for `customer_lens_purchases`, and that no org-blind `admin_users` without org-scope remains
- [x] 3.2 Add rollback SQL comment block at the top of the migration file with the inverse `DROP POLICY` / `CREATE POLICY` statements, noting that `organization_id` columns are non-destructive and remain

## Implementation Order

Phase 1 → Phase 2 → Phase 3. The column must exist before RLS can reference it. Assertions run last.

## Ponytail Notes

- Single self-contained migration, no app code changes needed — RLS is transparent to queries
- Backfill via `orders.organization_id` is O(n) but correct for all rows with an order; second pass via `customers.organization_id` covers the rest
- ponytail: skipped separate migration for index vs column — same file, one `CREATE INDEX`, done
- ponytail: assertion block is the minimum viable verification — no test framework, no CI changes
