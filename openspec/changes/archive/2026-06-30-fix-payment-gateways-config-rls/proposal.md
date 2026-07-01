# Proposal: Fix Payment Gateways Config RLS

## Intent

The `payment_gateways_config` table has RLS policy `USING (true)` — any authenticated user can read ALL gateway configurations (API keys, secrets, endpoints) for every organization. This is a **critical** multi-tenant data leak (audit finding C10). The table lacks an `organization_id` column, making org-scoped RLS impossible. Fix by adding the column, backfilling data, and replacing the public policy with org-scoped policies.

## Scope

### In Scope

- Add `organization_id` (UUID, NOT NULL, FK → `organizations.id`) to `payment_gateways_config`
- Backfill existing rows with the org context
- Drop the `USING (true)` public read policy
- Create org-scoped RLS policies for SELECT, INSERT, UPDATE, DELETE
- Migration: `20260701000012_fix_payment_gateways_config_rls.sql` (idempotent)

### Out of Scope

- No changes to payment gateway API routes or TypeScript types
- No changes to how configs are read/served in application code
- No application-level organization context wiring (e.g., checkout gateway selection per org)
- No type regeneration (handled separately)

## Capabilities

### New Capabilities

None — pure DB schema + RLS change, no new product capability.

### Modified Capabilities

None — no spec-level behavior changes. Existing routes continue working unchanged.

## Approach

1. **Add column**: `ALTER TABLE public.payment_gateways_config ADD COLUMN organization_id UUID NOT NULL REFERENCES public.organizations(id)` — wrapped in `DO $$` with `IF NOT EXISTS`
2. **Backfill**: Set `organization_id` for existing rows. Since this is platform-level config (gateway definitions), assign to the root/dev organization ID or the first active org. Source from `SELECT id FROM public.organizations LIMIT 1`.
3. **Drop old policy**: `DROP POLICY IF EXISTS "Public read payment_gateways_config" ON public.payment_gateways_config`
4. **Create org-scoped policies**:
   - SELECT: `organization_id = public.get_user_organization_id() OR public.is_root_user(auth.uid())`
   - INSERT/UPDATE/DELETE: same org-scoped check combined with elevated-role verification
   - Follows the standard pattern used across all other org-scoped tables in the codebase
5. **Recreate constraint**: Add unique index on `(organization_id, gateway_id)` to preserve the per-org gateway uniqueness that was previously global

## Affected Areas

| Area                                 | Impact   | Description                                   |
| ------------------------------------ | -------- | --------------------------------------------- |
| `public.payment_gateways_config`     | Modified | New column + constraints                      |
| `public.payment_gateways_config` RLS | Modified | Drop public policy, add 3 org-scoped policies |

## Risks

| Risk                                                                        | Likelihood | Mitigation                                                                                                                                                            |
| --------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backfill picks wrong org if no clear root org exists                        | Medium     | Manual verification step before deploy; fail migration if `organizations` table is empty                                                                              |
| Existing anon-key API routes break if RLS blocks queries without org filter | Low        | Checkout route (`/api/checkout/gateways`) already uses anon key — no org filter needed. SaaS management route uses service_role — bypasses RLS. No breakage expected. |
| `auth.org_id()` function may not exist                                      | Low        | Use `public.get_current_organization_id()` or inline subquery — verify which helper is available in the codebase                                                      |

## Rollback

```sql
DROP POLICY IF EXISTS "org_select_payment_gateways_config" ON public.payment_gateways_config;
DROP POLICY IF EXISTS "org_insert_payment_gateways_config" ON public.payment_gateways_config;
DROP POLICY IF EXISTS "org_update_payment_gateways_config" ON public.payment_gateways_config;
DROP POLICY IF EXISTS "org_delete_payment_gateways_config" ON public.payment_gateways_config;

CREATE POLICY "Public read payment_gateways_config"
  ON public.payment_gateways_config FOR SELECT USING (true);

ALTER TABLE public.payment_gateways_config DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.payment_gateways_config DROP CONSTRAINT IF EXISTS payment_gateways_config_org_gateway_unique;
```

## Dependencies

- `organizations` table must have at least one row for backfill
- Uses `public.get_user_organization_id()` — confirmed as the standard pattern across the codebase

## Success Criteria

- [ ] No RLS policy on `payment_gateways_config` has `USING (true)`
- [ ] All new policies scope by `organization_id`
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Checkout API route returns gateways successfully
- [ ] SaaS management payments API route continues working
- [ ] Audit finding C10 is resolved
