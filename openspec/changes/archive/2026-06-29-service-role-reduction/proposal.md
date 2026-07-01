# Proposal: Service Role Reduction — Phase 1: Cron Jobs

## Intent

`createServiceRoleClient()` bypasses ALL RLS (~200 refs). A compromised cron job exposes the entire multi-tenant DB. Phase 1 migrates cron jobs (read-heavy, minimal write surface) to a scoped `cron_role` with limited privileges.

## Status

Commit `38c0d62` partially implemented Phase 1. This proposal tracks remaining items.

### ✅ Completed

- `cron_role` PG role created (migration `20260701000010_create_cron_role.sql`)
- `createCronClient()` helper at `src/utils/supabase/cron.ts`
- 16/17 cron routes use `createCronClient()` — zero `createServiceRoleClient` refs in `src/app/api/cron/`
- `saas-backup/route.ts` delegates to `SaasBackupService` (Phase 2 item — no direct service_role use)

### ❌ Remaining

- `cron.ts` still reads `SUPABASE_SERVICE_ROLE_KEY` — swap to `SUPABASE_CRON_KEY`
- `SUPABASE_CRON_KEY` env var not in `env.example`
- No verification cron endpoints work with the new role

### Migration Caveat

The role migration grants `SELECT ON ALL TABLES IN SCHEMA public` — wider than the original table matrix. Acceptable for now; scope to explicit tables in a follow-up if needed.

## Scope

### In Scope (Phase 1 Remaining)

- Swap `cron.ts` from `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_CRON_KEY`
- Add `SUPABASE_CRON_KEY` to `env.example`
- Verify all 16 cron endpoints return same responses with the new role

### Out of Scope

- Internal service refactors (`BackupService`, `SaasBackupService`, `InternalBilling`, etc. — still use service_role, ~180 refs)
- Webhook, API route, middleware, AI tool migrations (Phase 2+)
- Removing `createServiceRoleClient()` entirely

## Capabilities

**New Capabilities**: None (security refactor — no product behavior changes)
**Modified Capabilities**: None

## Approach

1. **Swap key in helper**: `cron.ts` → read `SUPABASE_CRON_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`
2. **Add env var**: `SUPABASE_CRON_KEY` to `env.example`
3. **Generate JWT**: Issue a `SUPABASE_CRON_KEY` JWT for `cron_role` from Supabase dashboard (or SQL via `auth.users()` + `auth.sign()`)
4. **Verify**: Hit each cron endpoint locally/prod, confirm 2xx responses and no 42501 (permission denied)

## Affected Areas

| Area                         | Impact   | Description             |
| ---------------------------- | -------- | ----------------------- |
| `src/utils/supabase/cron.ts` | Modified | Swap key env var name   |
| `env.example`                | Modified | Add `SUPABASE_CRON_KEY` |

## Risks

| Risk                                       | Likelihood | Mitigation                                  |
| ------------------------------------------ | ---------- | ------------------------------------------- |
| Missing GRANT on a table cron reads        | Low        | Verify each cron endpoint post-deploy       |
| `cron_role` has wider SELECT than needed   | Low        | Narrow to explicit tables in follow-up      |
| JWT issuance for `cron_role` not automated | Low        | Manual one-time step via Supabase dashboard |

## Rollback Plan

1. Revert `cron.ts` to read `SUPABASE_SERVICE_ROLE_KEY`
2. Revert `env.example`
3. Done — zero data loss, zero service interruption

## Dependencies

- `SUPABASE_CRON_KEY` JWT for `cron_role` issued in Supabase project
- `cron_role` migration already applied (commit `38c0d62`)

## Success Criteria

- [ ] `cron.ts` reads `SUPABASE_CRON_KEY` — zero refs to `SUPABASE_SERVICE_ROLE_KEY` in cron context
- [ ] `SUPABASE_CRON_KEY` present in `env.example`
- [ ] All 16 cron endpoints return 2xx after role swap
