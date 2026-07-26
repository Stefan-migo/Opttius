# Delta for fix-supabase-unknown-params — Type Infrastructure

## Context

`fix-supabase-typed-clients` added `<typeof Database>` to every factory call, but 20 files still declare `supabase: unknown` as parameter type. That eats the generic — `SupabaseClient<Database>` gets widened to `unknown`, cascading ~67 TS18046 errors into callers. This delta fixes those 20 signatures to propagate type info to ~250+ downstream variables.

## ADDED Requirements

### Requirement: Function parameter types — SupabaseClient<Database>

29 parameter declarations across 20 files MUST change from `supabase: unknown` to `supabase: SupabaseClient<Database>` (or `supabase?: SupabaseClient<Database>` for optional params).

| Module | Files | Locations |
|--------|-------|-----------|
| Maintenance | cleanLogs, clearMemory, optimizeDatabase, securityAudit, systemStatus, testEmail, backupDatabase | 7 |
| Services | adminAppointmentService, adminQuoteService, appointmentDetailService, adminOrderService | 5 |
| Customers | customersDetailShared, searchHelpers | 4 |
| Chat AI | chatHelpers | 3 |
| Dashboard | dashboard/route.ts | 3 |
| AI/Insights | feedback.ts (class property + constructor) | 2 |
| AI/ImportBulk | analyzeFile, importCustomers, importProducts | 3 |
| Utils | tax-config.ts | 1 |
| **Total** | **20 files** | **29 locations** |

#### Scenario: All parameter declarations updated

- GIVEN any of the 20 files above
- WHEN a function signature, return type, or class property declares `supabase: unknown` (or `supabase?: unknown`)
- THEN the type MUST be `SupabaseClient<Database>` (or `SupabaseClient<Database> | undefined` for optional params)

#### Scenario: backupDatabase optional param

- GIVEN `src/app/api/admin/system/maintenance/actions/backupDatabase.ts`
- WHEN the signature has `supabase?: unknown`
- THEN it MUST become `supabase?: SupabaseClient<Database>`

### Requirement: Imports — SupabaseClient and Database

Each of the 20 files MUST add two type-only imports if not already present.

#### Scenario: Missing import added

- GIVEN a file with a `supabase: unknown` declaration
- WHEN the file lacks `import type { SupabaseClient } from "@supabase/supabase-js"`
- OR lacks `import type { Database } from "@/types/supabase"`
- THEN the missing import MUST be added as a type-only import

### Requirement: ESLint regression guard

The existing `no-restricted-imports` rule for `@supabase/supabase-js` MUST allow type-only imports of `SupabaseClient`.

#### Scenario: Type import allowed

- GIVEN any of the 20 files
- WHEN it imports `type { SupabaseClient }` from `@supabase/supabase-js`
- THEN ESLint MUST NOT report a `no-restricted-imports` error

## MODIFIED Requirements

### NFR2: Remaining TS18046 target

After fix, `npx tsc --noEmit 2>&1 | grep -c "TS18046"` MUST return ≤ 1,624 (down ~67 from ~1,691 baseline, leaving only catch/body/validatedBlock categories).
(Previously: target was ≤ 550 after fix-supabase-typed-clients brought baseline down from 1,691; this removes ~67 more)

### Not In Scope — Remove outdated entry

The last "Not In Scope" bullet from the parent spec MUST be removed:
> ~~Adding `Database` type to `import type { SupabaseClient }` declarations (type-only, no factory call)~~
(Previously: listed as Not In Scope because fix-supabase-typed-clients was a separate concern; now it IS this change)

## Verification

- TS18046 count drops by ~67; `npx tsc --noEmit` succeeds
- `npm run build` — 0 errors
- `npm run lint` — 0 errors
