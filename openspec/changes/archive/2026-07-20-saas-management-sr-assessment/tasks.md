# Tasks: SaaS Management Service Role Assessment

## Review Workload Forecast

| Field                   | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| Estimated changed lines | ~1,100 (across 46 API routes + 4 libs + 2 new files + eslint) |
| 400-line budget risk    | **High**                                                      |
| Chained PRs recommended | **Yes**                                                       |
| Suggested split         | PR 1 → PR 2 → PR 3 → PR 4 (stacked to main)                   |
| Delivery strategy       | ask-on-risk                                                   |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                                                                 | Likely PR | Notes                                                                                                   |
| ---- | ------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------- |
| 1    | Migration + root-admin helper + ESLint rule + Organizations + Users                  | PR 1      | ~15 files, ~380 lines. Base for all others.                                                             |
| 2    | Subscriptions + Tiers + Analytics                                                    | PR 2      | ~8 files, ~180 lines. Depends on PR 1's helper.                                                         |
| 3    | Support (dual-auth pattern)                                                          | PR 3      | 8 files, ~200 lines. Depends on PR 1. Dual auth — keep `createClient` unchanged, replace only SR calls. |
| 4    | Demos + Leads + Email + Payments + WhatsApp + New Users + Backups + Telemetry + libs | PR 4      | ~17 files, ~350 lines. Depends on PR 1.                                                                 |

## Phase 0: ESLint Guard (single task, done once)

- [x] 0.1 Add `no-restricted-imports` rule to `.eslintrc.json` — block `@/utils/supabase/service-role` and `@/utils/supabase/server` within `saas-management/` paths

## Phase 1: Foundation (PR 1 — Migration + Helper + Orgs + Users + Backups)

- [x] 1.1 Create `src/utils/supabase/root-admin.ts` — `createRootAdminClient()` wrapping `SUPABASE_SERVICE_ROLE_KEY`, matches `cron.ts` pattern
- [x] 1.2 Create `supabase/migrations/20260701000018_create_root_admin_role.sql` — role + GRANTs for 24 tables + 6 RPCs, idempotent (note: migration ID is `00018` — next available after `00017`)
- [x] 1.3 Migrate `src/app/api/admin/saas-management/organizations/route.ts` — SR → root-admin import + all call sites
- [x] 1.4 Migrate `src/app/api/admin/saas-management/organizations/[id]/route.ts`
- [x] 1.5 Migrate `src/app/api/admin/saas-management/organizations/[id]/actions/route.ts`
- [x] 1.6 Migrate `src/app/api/admin/saas-management/organizations/[id]/branches/route.ts`
- [x] 1.7 Migrate `src/app/api/admin/saas-management/organizations/[id]/branches/[branchId]/route.ts`
- [x] 1.8 Migrate `src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts`
- [x] 1.9 Migrate `src/app/api/admin/saas-management/organizations/[id]/users/route.ts`
- [x] 1.10 Migrate `src/app/api/admin/saas-management/organizations/bulk-actions/route.ts`
- [x] 1.11 Migrate `src/app/api/admin/saas-management/users/route.ts`
- [x] 1.12 Migrate `src/app/api/admin/saas-management/users/[id]/route.ts`
- [x] 1.13 Migrate `src/app/api/admin/saas-management/users/[id]/actions/route.ts`
- [x] 1.14 Migrate `src/app/api/admin/saas-management/backups/route.ts` (was importing from `@/utils/supabase/server` — switched to root-admin)

## Phase 2: Subscriptions + Tiers + Analytics (PR 2)

- [x] 2.1 Migrate `src/app/api/admin/saas-management/subscriptions/route.ts`
- [x] 2.2 Migrate `src/app/api/admin/saas-management/subscriptions/[id]/route.ts`
- [x] 2.3 Migrate `src/app/api/admin/saas-management/subscriptions/[id]/actions/route.ts`
- [x] 2.4 Migrate `src/app/api/admin/saas-management/tiers/route.ts`
- [x] 2.5 Migrate `src/app/api/admin/saas-management/analytics/route.ts`
- [x] 2.6 Migrate `src/app/api/admin/saas-management/telemetry-config/route.ts`

## Phase 3: Support (PR 3 — Dual Auth Pattern)

- [x] 3.1 Migrate `src/app/api/admin/saas-management/support/tickets/route.ts` — replace only `createServiceRoleClient`, keep `createClient` unchanged
- [x] 3.2 Migrate `src/app/api/admin/saas-management/support/tickets/[id]/route.ts` — same dual-auth pattern
- [x] 3.3 Migrate `src/app/api/admin/saas-management/support/tickets/[id]/messages/route.ts`
- [x] 3.4 Migrate `src/app/api/admin/saas-management/support/metrics/route.ts`
- [x] 3.5 Migrate `src/app/api/admin/saas-management/support/export/route.ts`
- [x] 3.6 Migrate `src/app/api/admin/saas-management/support/search/route.ts`
- [x] 3.7 Migrate `src/app/api/admin/saas-management/support/templates/route.ts`
- [x] 3.8 Migrate `src/app/api/admin/saas-management/support/templates/[id]/route.ts`

## Phase 4: Remaining Routes + Libs (PR 4)

- [x] 4.1 Migrate `src/app/api/admin/saas-management/demo-requests/route.ts`
- [x] 4.2 Migrate `src/app/api/admin/saas-management/demo-requests/[id]/approve/route.ts`
- [x] 4.3 Migrate `src/app/api/admin/saas-management/demo-requests/[id]/reject/route.ts`
- [x] 4.4 Migrate `src/app/api/admin/saas-management/demo-requests/[id]/delete/route.ts`
- [x] 4.5 Migrate `src/app/api/admin/saas-management/demo-requests/[id]/funnel/route.ts`
- [x] 4.6 Migrate `src/app/api/admin/saas-management/leads/[id]/score/route.ts`
- [x] 4.7 Migrate `src/app/api/admin/saas-management/leads/[id]/activities/route.ts`
- [x] 4.8 Migrate `src/app/api/admin/saas-management/leads/[id]/email/generate/route.ts`
- [x] 4.9 Migrate `src/app/api/admin/saas-management/leads/[id]/email/send/route.ts`
- [x] 4.10 Migrate `src/app/api/admin/saas-management/email-metrics/route.ts` — also change import from `server` to `root-admin`
- [x] 4.11 Migrate `src/app/api/admin/saas-management/email-events/route.ts`
- [x] 4.12 Migrate `src/app/api/admin/saas-management/email-templates/route.ts`
- [x] 4.13 Migrate `src/app/api/admin/saas-management/email-templates/[id]/route.ts`
- [x] 4.14 Migrate `src/app/api/admin/saas-management/email-templates/[id]/test/route.ts`
- [x] 4.15 Migrate `src/app/api/admin/saas-management/payments/route.ts`
- [x] 4.16 Migrate `src/app/api/admin/saas-management/whatsapp/status/route.ts`
- [x] 4.17 Migrate `src/app/api/admin/saas-management/whatsapp/connect/route.ts`
- [x] 4.18 Migrate `src/app/api/admin/saas-management/whatsapp/conversations/route.ts`
- [x] 4.19 Migrate `src/app/api/admin/saas-management/whatsapp/conversations/[sessionId]/messages/route.ts`
- [x] 4.20 Migrate `src/app/api/admin/saas-management/new-users-flow/stats/route.ts`
- [x] 4.21 Migrate `src/app/api/admin/saas-management/backups/route.ts` (already done in 1.14)
- [x] 4.22 Migrate `src/app/api/admin/saas-management/reset-demo/route.ts`
- [x] 4.23 Migrate `src/lib/saas/audit-log.ts` — change import from `server` to `root-admin`
- [x] 4.24 Migrate `src/lib/saas/tier-change-audit.ts`
- [x] 4.25 Migrate `src/lib/saas/subscription-status.ts`
- [x] 4.26 Migrate `src/lib/saas/tier-validator.ts` — change import from `server` to `root-admin`

## Phase 5: Verification

- [x] 5.1 Grep-audit: verify zero `createServiceRoleClient` calls remain in `src/app/api/admin/saas-management/` and `src/lib/saas/`
- [ ] 5.2 ESLint check: run `npx eslint src/app/api/admin/saas-management/` — confirm `no-restricted-imports` blocks SR imports
- [ ] 5.3 Verify migration is idempotent (run twice against local Supabase, no errors)
- [ ] 5.4 PR-by-PR smoke test: call one known-good endpoint per PR (e.g., GET organizations, GET subscriptions, GET support tickets, GET demo-requests)
