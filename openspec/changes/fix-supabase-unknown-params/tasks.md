# Tasks: fix-supabase-unknown-params

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~65 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes (force-chained per proposal) |
| Suggested split | Phase 1 → Phase 2 → Phase 3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Maintenance + Utils + ImportBulk (11 files) | PR 1 | base=main; pure type fix, no deps |
| 2 | Services + Customers (6 files) | PR 2 | base=main; independent of PR 1 |
| 3 | Chat AI + Dashboard + AI/Insights (3 files) | PR 3 | base=main; independent of PR 1/2 |

All 3 PRs stack to main independently (no cross-file dependencies in type fixes). Each PR is independently revertible. Apply order: 1 → 2 → 3.

## Phase 1: Maintenance + Utils + ImportBulk (11 files)

- [ ] 1.1 `src/app/api/admin/system/maintenance/actions/cleanLogs.ts` — add imports, change `supabase: unknown` → `SupabaseClient<Database>`
- [ ] 1.2 `src/app/api/admin/system/maintenance/actions/clearMemory.ts` — same
- [ ] 1.3 `src/app/api/admin/system/maintenance/actions/optimizeDatabase.ts` — same
- [ ] 1.4 `src/app/api/admin/system/maintenance/actions/securityAudit.ts` — same
- [ ] 1.5 `src/app/api/admin/system/maintenance/actions/systemStatus.ts` — same
- [ ] 1.6 `src/app/api/admin/system/maintenance/actions/testEmail.ts` — same
- [ ] 1.7 `src/app/api/admin/system/maintenance/actions/backupDatabase.ts` — same, keep `?` for optional param
- [ ] 1.8 `src/lib/utils/tax-config.ts` — same
- [ ] 1.9 `src/lib/ai/tools/importBulk/analyzeFile.ts` — same
- [ ] 1.10 `src/lib/ai/tools/importBulk/importCustomers.ts` — same
- [ ] 1.11 `src/lib/ai/tools/importBulk/importProducts.ts` — same

## Phase 2: Services + Customers (6 files)

- [ ] 2.1 `src/lib/api/services/adminAppointmentService.ts` — add imports, change `supabase: unknown` → `SupabaseClient<Database>`
- [ ] 2.2 `src/lib/api/services/adminQuoteService.ts` — same
- [ ] 2.3 `src/lib/api/services/appointmentDetailService.ts` — 2 params: `getAdminAuth` + `fetchRelations`
- [ ] 2.4 `src/lib/api/services/adminOrderService.ts` — 2 params
- [ ] 2.5 `src/app/api/admin/customers/[id]/customersDetailShared.ts` — return type param in Promise
- [ ] 2.6 `src/app/api/admin/customers/searchHelpers.ts` — 3 params: `resolveBranchContext`, `searchCustomers`, `searchCustomersPaginated`

## Phase 3: Chat AI + Dashboard + AI/Insights (3 files)

- [ ] 3.1 `src/app/api/admin/chat/_helpers/chatHelpers.ts` — 3 params: `buildAgentContext`, `resolveOrgId`, `createAndStreamAgent`
- [ ] 3.2 `src/app/api/admin/dashboard/route.ts` — 3 params: `computeAppointments`, `computeTodayAppointmentsList`, `buildApptQuery`
- [ ] 3.3 `src/lib/ai/insights/feedback.ts` — class field `private supabase` + constructor param

## Verification

- [ ] Run `npx tsc --noEmit 2>&1 | grep -c "TS18046"` — expect ~1,624 (down ~67 from ~1,691)
- [ ] Run `npm run build` — 0 errors
- [ ] Run `npm run lint` — 0 errors
- [ ] Per PR: type-check before pushing

## Notes

- Every file gets: `import type { SupabaseClient } from "@supabase/supabase-js"` + `import type { Database } from "@/types/supabase"`
- `feedback.ts` uses single quotes — match its existing style
- `backupDatabase.ts` keeps `supabase?:` optional syntax
- No runtime changes — type-only fix
