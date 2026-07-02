# Archive Report: Service Role Reduction — Phase 2: Webhooks

**Change**: service-role-reduction-webhooks
**Archived**: 2026-07-01
**Mode**: hybrid (OpenSpec files + Engram)
**Status**: ✅ Complete — all 8 tasks verified, zero CRITICAL findings, zero WARNING findings.

---

## Verification Status

- **Verify Report Status**: ✅ PASS (date: 2026-07-01)
- **CRITICAL issues**: None
- **WARNING issues**: None
- **SUGGESTION items**: 3 (pre-deploy steps — JWT generation, env var setup, post-deploy smoke test)

## Task Completion Gate

| Metric | Value |
|--------|-------|
| Implementation tasks | 8/8 ✅ complete (T1.1–T1.3, T2.1–T2.5) |
| Deploy-time checks | `- [ ]` permission denial — deferred to deploy time per design |
| Post-deploy checks | `- [ ]` smoke test — deferred per design |
| Task gate resolution | Intentional — unchecked items are deploy/post-deploy by design, not implementation tasks. apply-progress (8/8 tasks) and verify-report (27/27 AC met) confirm completion. |

## Engine Room Reduction Impact

| Metric | Value |
|--------|-------|
| `createServiceRoleClient()` calls removed | 5 (all webhook routes) |
| Remaining `createServiceRoleClient()` calls | Internal services (cron, backup, saas-backup) — deferred to future phases |
| New role created | `webhook_role` — limited to 8 tables |
| Tables granted | payments, webhook_events, orders, subscription_tiers, organizations, subscriptions, profiles, email_send_events |
| Database roles now in use | `service_role` (internal services), `cron_role` (Phase 1), `webhook_role` (Phase 2) |

## Artifact Lineage (Engram Observation IDs)

| Artifact | Engram ID |
|----------|-----------|
| Proposal | #677 |
| Design | #678 |
| Tasks | #679 |
| Apply Progress | #680 |
| Verify Report | #681 |
| Archive Report | (current — sdd/service-role-reduction-webhooks/archive-report) |

## File Changes (OpenSpec)

### Files Created
- `supabase/migrations/20260701000013_create_webhook_role.sql`
- `src/utils/supabase/webhook.ts`
- `src/__tests__/unit/supabase/webhook.test.ts`

### Files Modified
- `env.example`
- `src/app/api/webhooks/mercadopago/route.ts`
- `src/app/api/webhooks/paypal/route.ts`
- `src/app/api/webhooks/flow/route.ts`
- `src/app/api/webhooks/nowpayments/route.ts`
- `src/app/api/webhooks/resend/route.ts`
- `src/__tests__/unit/webhooks/resend-webhook.test.ts`
- `src/__tests__/integration/api/webhooks/paypal.test.ts`

### Total changed files: 12 (3 created, 8 modified, 0 deleted)

## Specs Sync

No delta specs existed in this change (no `specs/` subdirectory). Main specs remain unchanged.

## Deviations from Design

None — implementation matches design exactly.

## Open Items

1. **Pre-deploy**: Generate `SUPABASE_WEBHOOK_KEY` JWT for `webhook_role` via `SELECT auth.sign(...)`
2. **Pre-deploy**: Set `SUPABASE_WEBHOOK_KEY` env var in Vercel (production + preview)
3. **Post-deploy**: Apply migration and smoke-test all 5 webhook endpoints under `webhook_role`
4. **Future phase**: Internal services (BackupService, SaasBackupService, etc.) — still use `service_role`

## Rollback

1. Revert webhook route files to `createServiceRoleClient()`
2. `DROP ROLE webhook_role;`
3. Delete `src/utils/supabase/webhook.ts`
4. Remove `SUPABASE_WEBHOOK_KEY` from `.env.example`
5. Zero data loss, zero service interruption.
