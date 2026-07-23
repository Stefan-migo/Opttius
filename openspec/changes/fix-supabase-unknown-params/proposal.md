# Proposal: fix-supabase-unknown-params

## Intent

`fix-supabase-typed-clients` added `<Database>` to every factory call, but 20 files declare `supabase: unknown` as parameter type. That eats the generic — `SupabaseClient<Database>` gets widened to `unknown`, cascading ~67 TS18046 errors into every caller that passes a typed client. Fix those 20 signatures to cascade the type info to ~250+ downstream variables (rows, products, orders).

## Scope

### In Scope
- 20 files (29 locations) changing `supabase: unknown` → `supabase: SupabaseClient<Database>`
- Two imports per file: `type { SupabaseClient }` from `@supabase/supabase-js`, `type { Database }` from `@/types/supabase`
- ESLint regression guard: add `supabase` to the existing `no-restricted-imports` rule for direct `@supabase/supabase-js` imports (none of these 20 files import it directly)

### Out of Scope
- `catch(err: unknown)` blocks (~93) — intentional, value is `unknown`
- `validatedBody: unknown`, `body: unknown`, `updateData: unknown` (~295) — separate concern
- Merging `src/lib/supabase/` and `src/utils/supabase/` parallel hierarchies
- Other TS error categories (TS2339, TS2345, etc.)

## Capabilities

### New Capabilities
None — pure parameter type fix, no behavioral changes.

### Modified Capabilities
- `type-infrastructure`: update NFR2 remaining-TS18046 target from ≤550 to ~1,624 (the ~67 cascade errors disappear, leaving only catch/body/validatedBody categories)

## Approach

Per-file mechanical change:
1. Add `import type { SupabaseClient } from "@supabase/supabase-js"` to each file
2. Add `import type { Database } from "@/types/supabase"` to each file
3. Change `supabase: unknown` → `supabase: SupabaseClient<Database>` at each location

Delivery in 3 phases (force-chained, stacked-to-main):
- **F1**: Maintenance (6) + Utils (1) + AI importBulk (3) — 10 files
- **F2**: Services (4) + Customers (2) — 6 files
- **F3**: Chat AI (1) + Dashboard (1) + AI/Insights (1) — 4 files

## Affected Areas

| Module | Files | Change |
|--------|-------|--------|
| Maintenance | `cleanLogs.ts`, `clearMemory.ts`, `optimizeDatabase.ts`, `securityAudit.ts`, `systemStatus.ts`, `testEmail.ts`, `backupDatabase.ts` | Type param |
| Services | `adminAppointmentService.ts`, `adminQuoteService.ts`, `appointmentDetailService.ts`, `adminOrderService.ts` | Type param |
| Customers | `customersDetailShared.ts`, `searchHelpers.ts` | Type param |
| Chat AI | `chatHelpers.ts` | Type param |
| Dashboard | `dashboard/route.ts` | Type param |
| AI/Insights | `feedback.ts` | Type param |
| AI/ImportBulk | `analyzeFile.ts`, `importCustomers.ts`, `importProducts.ts` | Type param |
| Utils | `tax-config.ts` | Type param |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Wrong type import path for `Database` | Low | Standard `@/types/supabase` alias — check each file's existing import style |
| `SupabaseClient` generic arity mismatch | Low | `SupabaseClient<Database>` is the standard v2 signature |
| Cascade to new TS18046 in dependent variables | Low — desired | ~250+ downstream vars become typed, which is the goal |

## Rollback Plan

Per phase: revert the PR for that phase. No migration, no data loss — pure type-only changes. Stacked PRs mean each phase can be independently rolled back.

## Dependencies

- `fix-supabase-typed-clients` (archived) — must be merged first for `<Database>` generic to exist in factories (already done)

## Success Criteria

- [ ] `npx tsc --noEmit 2>&1 | grep -c "TS18046"` drops by ~67 (from ~1,691 to ~1,624)
- [ ] `npm run build` passes
- [ ] No behavioral runtime changes (type-only modification)
