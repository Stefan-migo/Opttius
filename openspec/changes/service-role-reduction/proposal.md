# Proposal: Service Role Reduction — Phase 1: Cron Jobs

## Intent

`createServiceRoleClient()` bypasses ALL RLS and is used ~200 times. A compromised webhook, API route, or cron job exposes the entire multi-tenant DB. Phase 1 migrates the safest category — **cron jobs** (17 files, read-heavy, minimal write surface) — to a scoped `createCronClient()`.

## Scope

### In Scope
- Create `cron_role` PostgreSQL role with GRANTs limited to tables cron actually touches
- Create `createCronClient()` helper using `cron_role` credentials
- Migrate all 17 cron route files to use `createCronClient()` instead of `createServiceRoleClient()`
- Deprecate `createServiceRoleClient()` in cron context (leave other usages untouched)

### Out of Scope
- Internal service refactors (`BackupService`, `SaasBackupService` — still use service_role internally, flagged for Phase 2)
- Webhook, API route, middleware, AI tool migrations (Phase 2+)
- Removing `createServiceRoleClient()` entirely

## Capabilities

**New Capabilities**: None (pure security refactor — no product behavior changes)
**Modified Capabilities**: None

## Approach

1. **Audit cron table access** (done below — 17 files analyzed)
2. **Create DB migration**: `cron_role` with SELECT on 15 tables, UPDATE on 2 tables, INSERT on 1 table, EXECUTE on 2 RPCs
3. **Create helper**: `src/utils/supabase/cron.ts` — `createCronClient()` using `SUPABASE_CRON_KEY`
4. **Replace usages**: 17 files, one import + variable rename each
5. **Add env var**: `SUPABASE_CRON_KEY` to Vercel + `.env.example`
6. **Verify**: all cron endpoints return same responses

### Cron Table Access Matrix

| Table | Operations | Cron Files |
|-------|-----------|------------|
| `subscriptions` | SELECT | saas-trial-ending, saas-payment-reminder |
| `organizations` | SELECT | saas-trial-ending, saas-payment-reminder, backups, low-stock-alerts, generate-insights |
| `profiles` | SELECT | saas-trial-ending, saas-payment-reminder, cleanup-pending-payments, low-stock-alerts |
| `quotes` | SELECT | quote-expiring |
| `customers` | SELECT | quote-expiring, appointment-reminders, appointment-reminders-2h, appointment-follow-up-reminders, prescription-expiring |
| `branches` | SELECT | quote-expiring, appointment-reminders, appointment-reminders-2h, prescription-expiring, low-stock-alerts |
| `prescriptions` | SELECT | prescription-expiring |
| `appointments` | SELECT | appointment-reminders, appointment-reminders-2h, appointment-follow-up-reminders |
| `demo_requests` | SELECT, UPDATE | demo-expiring, demo-expired-followup, demo-post-meeting |
| `system_config` | SELECT | demo-expiring, demo-expired-followup, low-stock-alerts |
| `payments` | UPDATE | cleanup-pending-payments |
| `product_branch_stock` | SELECT | low-stock-alerts |
| `products` | SELECT | low-stock-alerts, generate-insights |
| `admin_users` | SELECT | low-stock-alerts |
| `ai_insights` | INSERT | generate-insights |
| `orders` | SELECT | generate-insights |
| RPC `cleanup_expired_demo_organizations` | EXECUTE | cleanup-expired-demos |
| RPC `cleanup_old_notifications` | EXECUTE | cleanup-notifications |
| Storage `database-backups` | UPLOAD | backups |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/utils/supabase/cron.ts` | **New** | `createCronClient()` helper |
| `src/app/api/cron/*/route.ts` (17 files) | Modified | Replace `createServiceRoleClient` → `createCronClient` |
| DB migration (new) | New | CREATE ROLE `cron_role`, GRANTs |
| `.env.example` | Modified | Add `SUPABASE_CRON_KEY` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing GRANT on a table cron reads | Low | Test each cron endpoint after migration |
| BackupService/SaaSBackupService still use service_role internally | Med | Flagged for Phase 2 — cron itself no longer uses service_role |
| Cron key rotation not handled | Low | Same pattern as service_role key |

## Rollback Plan

1. Revert the DB migration (DROP ROLE `cron_role`)
2. Revert the 17 cron files to import `createServiceRoleClient`
3. Delete `createCronClient()`
4. Done — zero data loss, zero service interruption

## Dependencies

- Supabase project access to create a new DB role
- `SUPABASE_CRON_KEY` env var in Vercel (service_role key for the cron role)

## Success Criteria

- [ ] All 17 cron jobs use `createCronClient()` — zero references to `createServiceRoleClient()` in `src/app/api/cron/`
- [ ] `createCronClient()` can only SELECT/INSERT/UPDATE on explicitly granted tables — any other query fails with permission denied
- [ ] All cron endpoints return same response body/status as before
- [ ] `createServiceRoleClient()` still works in non-cron contexts (unchanged)
