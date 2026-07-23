# Design: SaaS Management Service Role Assessment

## Technical Approach

Pure rename + role-granular migration. No behavior change. Create `root_admin_role` with explicit table GRANTs (following `cron_role` pattern), add a `createRootAdminClient()` helper wrapping the same `SUPABASE_SERVICE_ROLE_KEY`, then rename all `createServiceRoleClient()` → `createRootAdminClient()` across 46 API routes + 4 lib files.

The underlying JWT key is identical — only the intent label changes. `auth.admin.*` calls keep working because the helper uses the same service-role key.

## Architecture Decisions

| Option                                                                         | Tradeoffs                                                                               | Decision                                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `createRootAdminClient()` vs `createRootClient()` vs `createSaasAdminClient()` | RootAdmin is explicit about scope (root-access, admin ops). Shorter forms lose clarity. | **createRootAdminClient()** — matches `createCronClient()` pattern                    |
| New file vs inline in `server.ts`                                              | New file keeps concerns separated, mirrors `cron.ts`. Inline creates a crowded module.  | **New file**: `src/utils/supabase/root-admin.ts`                                      |
| Include vs exclude `lib/saas/subscription-status.ts` + `tier-validator.ts`     | Proposal counted 2 libs, but 4 exist in scope. Missing them leaves partial migration.   | **Include all 4** — audit-log, tier-change-audit, subscription-status, tier-validator |
| ESLint rule vs grep check in CI                                                | ESLint `no-restricted-imports` blocks at compile time. Grep is post-hoc.                | **ESLint `no-restricted-imports`** — prevents re-introduction of SR pattern           |

### Migration Table GRANT Strategy

Follow the `cron_role` GRANT pattern exactly:

- `CREATE ROLE root_admin_role NOINHERIT`
- `GRANT USAGE ON SCHEMA public TO root_admin_role`
- Individual `GRANT SELECT/INSERT/UPDATE/DELETE ON <table> TO root_admin_role` per operation type
- `ALTER DEFAULT PRIVILEGES` for future tables

**24 tables** need GRANTs (SELECT on all; INSERT/UPDATE/DELETE per table based on actual operations). **6 RPC functions** need `GRANT EXECUTE` (all are already `SECURITY DEFINER`).

## Data Flow

```
Before:  route.ts → createServiceRoleClient() → DB query + auth.admin.*
After:   route.ts → createRootAdminClient()  → DB query + auth.admin.*
                                                 (same key, same JWT)
```

Support dual-auth files (4 support routes):

```
createClient()     → anonymous/RLS scoped ← UNCHANGED
createRootAdminClient() → root operations ← replaces createServiceRoleClient()
```

## File Changes

| Action | Files                                                                                              | Description                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Create | `src/utils/supabase/root-admin.ts`                                                                 | `createRootAdminClient()` wrapping `SUPABASE_SERVICE_ROLE_KEY`, auth disabled                   |
| Create | `supabase/migrations/20260701000012_create_root_admin_role.sql`                                    | Role + GRANTs for 24 tables + 6 RPCs                                                            |
| Modify | 46 API route files under `src/app/api/admin/saas-management/`                                      | Replace import path + call variable name                                                        |
| Modify | 4 lib files: `audit-log.ts`, `tier-change-audit.ts`, `subscription-status.ts`, `tier-validator.ts` | Replace import path + call variable name                                                        |
| Modify | `.eslintrc.*` or eslint config                                                                     | Add `no-restricted-imports` rule blocking `@/utils/supabase/service-role` in `saas-management/` |

### Call Signature

```typescript
// src/utils/supabase/root-admin.ts — exact pattern from cron.ts
export function createRootAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

### Migration — GRANTs Pattern

```sql
CREATE ROLE root_admin_role NOINHERIT;
GRANT USAGE ON SCHEMA public TO root_admin_role;

-- Each table gets minimal GRANTs based on operation type
GRANT SELECT ON organizations TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO root_admin_role;
-- ... (24 tables total)

GRANT EXECUTE ON FUNCTION get_auth_user_id_by_email TO root_admin_role;
GRANT EXECUTE ON FUNCTION create_demo_organization_for_user TO root_admin_role;
GRANT EXECUTE ON FUNCTION reset_demo_organization TO root_admin_role;
GRANT EXECUTE ON FUNCTION log_admin_activity TO root_admin_role;
GRANT EXECUTE ON FUNCTION update_lead_score_and_priority TO root_admin_role;
GRANT EXECUTE ON FUNCTION record_lead_activity TO root_admin_role;
```

### ESLint Guard

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "@/utils/supabase/service-role",
            "message": "Use @/utils/supabase/root-admin in saas-management routes"
          }
        ],
        "patterns": [
          {
            "group": ["@/utils/supabase/service-role"],
            "message": "Use @/utils/supabase/root-admin in saas-management routes"
          }
        ]
      }
    ]
  }
}
```

## Import Path Variations Handled

| Current Import Path             | Files                                                                                                   | Action                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@/utils/supabase/service-role` | ~40 files                                                                                               | Replace → `@/utils/supabase/root-admin`                                                                        |
| `@/utils/supabase/server`       | 6 files (audit-log, tier-validator, email-metrics, email-templates, email-events, email-templates test) | Replace with `@/utils/supabase/root-admin` — these import the SR function from server.ts, not `createClient()` |

## Testing Strategy

| Layer      | What                                           | How                                                                                            |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unit       | `createRootAdminClient()` creates valid client | Import and call, verify it returns a Supabase client with correct auth config                  |
| Regression | Routes respond identically                     | Stacked PRs — manual smoke test each PR against known-good endpoints (same key, same behavior) |
| CI         | No SR imports in saas-management               | ESLint `no-restricted-imports` guard added in PR 1                                             |

## Stacked PR Plan

| PR   | Scope                                                                         | Files                                                                    | Lines Est. |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| PR 1 | Migration + helper + Organizations + Users                                    | ~15 files (orgs, users, branches, actions) + migration + helper + ESLint | ~380       |
| PR 2 | Subscriptions + Tiers + Analytics                                             | ~8 files                                                                 | ~200       |
| PR 3 | Support (dual-auth pattern)                                                   | 4 files + support templates + metrics + export + search                  | ~180       |
| PR 4 | Demos + Leads + Email + Payments + WhatsApp + New Users + Backups + Telemetry | ~15 files                                                                | ~350       |

## Open Questions

None — all decisions resolved in session.

## Risks

- **Missed file**: Any saas-management file still using `createServiceRoleClient` after migration. Mitigation: ESLint rule catches re-introductions; final grep audit across PR 4.
- **`@/utils/supabase/server` confusion**: Some files import SR from `server.ts` (not `service-role.ts`). The ESLint rule must block both paths, or the rule must match from the combined barrel. Mitigation: explicit check — `no-restricted-imports` on both `service-role` and `server` within saas-management scope.
