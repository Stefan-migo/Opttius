# Archive Report: fix-payment-gateways-config-rls

**Change**: Fix Payment Gateways Config RLS
**Archived**: 2026-06-30
**Mode**: openspec
**Intentional Partial Archive**: No (all artifacts present, all tasks complete)

---

## Intent

The `payment_gateways_config` table had RLS policy `USING (true)` — any authenticated user could read ALL gateway configurations (API keys, secrets, endpoints) for every organization. This was a **critical** multi-tenant data leak (audit finding C10). The table also lacked an `organization_id` column, making org-scoped RLS impossible.

## What Was Done

1. **Added `organization_id` column** (UUID, NOT NULL, FK → `organizations(id)` ON DELETE CASCADE) to `payment_gateways_config`
2. **Backfilled** existing rows to the first organization
3. **Dropped** the public `USING (true)` RLS policy and the old `"Elevated roles can manage..."` policy
4. **Created 4 org-scoped policies** (SELECT, INSERT, UPDATE, DELETE) using the standard pattern: `is_super_admin(auth.uid()) OR organization_id = get_user_organization_id()`
5. **Replaced global unique constraint** with per-org unique index on `(organization_id, gateway_id)`

**Affected file**: `supabase/migrations/20260701000012_fix_payment_gateways_config_rls.sql`

## Artifacts

| Artifact      | Path                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| Proposal      | `openspec/changes/archive/2026-06-30-fix-payment-gateways-config-rls/proposal.md`      |
| Tasks         | `openspec/changes/archive/2026-06-30-fix-payment-gateways-config-rls/tasks.md`         |
| Verify Report | `openspec/changes/archive/2026-06-30-fix-payment-gateways-config-rls/verify-report.md` |

## Verification Results

| Criterion                               | Result                                                              |
| --------------------------------------- | ------------------------------------------------------------------- |
| Migration applied                       | ✅ PASS                                                             |
| Old RLS policies removed                | ✅ PASS                                                             |
| New org-scoped policies created         | ✅ PASS                                                             |
| `organization_id` column (NOT NULL, FK) | ✅ PASS                                                             |
| Index exists                            | ✅ PASS                                                             |
| Tests pass                              | ⚠️ WARNING — 1 unrelated failure (Redis rate limiter mock)          |
| Build compiles                          | ⚠️ WARNING — pre-existing issue in `supabase/server.ts` (unrelated) |

**Overall Verdict: PASS ✅**

The 1 test failure and build error are both pre-existing issues in unrelated modules — neither references `payment_gateways_config` or RLS policies. All database-level verification criteria are met.

## Risks Mitigated

| Risk                                                                               | Mitigation                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Multi-tenant data leak — any authenticated user can read all orgs' gateway secrets | ✅ RLS now scopes SELECT by `organization_id`                |
| Unauthorized INSERT/UPDATE/DELETE of gateway configs                               | ✅ All DML policies require matching `organization_id`       |
| Orgs seeing each other's gateway IDs and configurations                            | ✅ Per-org unique index and RLS isolation                    |
| Audit finding C10 (critical)                                                       | ✅ Resolved — no `USING (true)` policy remains on this table |

## Task Completion

- **Phase 1** (Migration): 1/1 tasks complete ✅
- **Phase 2** (Verification): 4/4 tasks complete ✅

All tasks marked complete by `sdd-apply`. No stale checkboxes.

## Notes

- No delta specs existed for this change — it was purely a DB schema + RLS migration with no application-layer spec changes.
- The verify report's warnings (test failure, build error) were confirmed pre-existing and unrelated. They did not block archive.
