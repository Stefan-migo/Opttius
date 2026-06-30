# Tasks: Fix Payment Gateways Config RLS

## Review Workload Forecast

| Field                   | Value                  |
| ----------------------- | ---------------------- |
| Estimated changed lines | ~70 (1 migration file) |
| 400-line budget risk    | Low                    |
| Chained PRs recommended | No                     |
| Suggested split         | Single PR              |
| Delivery strategy       | single-pr              |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Migration

- [ ] 1.1 Create `supabase/migrations/20260701000012_fix_payment_gateways_config_rls.sql` with:
  - `DO $$` idempotent block: `ALTER TABLE ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE` (if not exists)
  - Backfill: `UPDATE payment_gateways_config SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)` where NULL
  - `ALTER COLUMN organization_id SET NOT NULL`
  - Drop global unique `payment_gateways_config_gateway_id_key`; create per-org unique index `idx_payment_gateways_config_org_gateway ON payment_gateways_config(organization_id, gateway_id)`
  - `CREATE INDEX IF NOT EXISTS idx_payment_gateways_config_organization_id`
  - `DROP POLICY IF EXISTS "Public read payment_gateways_config"`
  - `DROP POLICY IF EXISTS "Elevated roles can manage payment_gateways_config"`
  - CREATE 4 org-scoped policies using pattern `public.is_super_admin(auth.uid()) OR organization_id = public.get_user_organization_id()` for SELECT, INSERT, UPDATE, DELETE

## Phase 2: Verification

- [ ] 2.1 Run `supabase db push` (or equivalent) to apply the migration — confirm no errors
- [ ] 2.2 Verify with `SELECT * FROM pg_policies WHERE tablename = 'payment_gateways_config'`:
  - No policy has `USING (true)`
  - All 4 new org-scoped policies exist
- [ ] 2.3 Test with different auth contexts:
  - Anon/authenticated user without org → SELECT returns 0 rows
  - Org admin → SELECT returns only rows where `organization_id = their org`
  - Super admin / root → SELECT returns all rows
  - Org admin INSERT on own org → succeeds
  - Org admin INSERT on different org → fails (RLS blocks it)
- [ ] 2.4 Check checkout API route still returns gateways (quick smoke test)
