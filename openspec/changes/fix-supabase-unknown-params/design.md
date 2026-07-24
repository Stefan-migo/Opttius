# Design: fix-supabase-unknown-params

## Technical Approach

Mechanical type replacement across 20 files (29 locations): replace `supabase: unknown` with `supabase: SupabaseClient<Database>`, adding the two required type imports to each file. Pure type-level change — zero runtime impact.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Import placement | Append to existing imports, grouped after last `import type` line | Top-of-file, after last import | Follows codebase convention — type imports already exist in several files (`import type { IsAdminParams } from "@/types/supabase-rpc"`) |
| Quote style | Double quotes (`"`) | Single quotes | Matches 19/20 files. `feedback.ts` uses single quotes for 1 import — follow its existing style for that file only |
| Optional param syntax | `supabase?: SupabaseClient<Database>` | N/A | Single file (`backupDatabase.ts`). Keep the `?` |
| Class field + constructor | Change both `private supabase: unknown` and `constructor(supabase: unknown)` | N/A | Single file (`feedback.ts`). Both are type declarations with `unknown` |

## Data Flow

No data flow change. Type information propagates:

```
Function param: SupabaseClient<Database>
  → .from("table") returns PostgrestQuery<Database["public"]["Tables"]>
  → .select(), .insert(), etc. infer row types
  → ~250+ downstream variables become typed
```

## File Changes

All 20 files: **Modify**. Add two `import type` lines, change `unknown` → `SupabaseClient<Database>`.

| File | Locations | Notes |
|------|-----------|-------|
| `src/app/api/admin/system/maintenance/actions/cleanLogs.ts` | 1 | — |
| `src/app/api/admin/system/maintenance/actions/clearMemory.ts` | 1 | — |
| `src/app/api/admin/system/maintenance/actions/optimizeDatabase.ts` | 1 | — |
| `src/app/api/admin/system/maintenance/actions/securityAudit.ts` | 1 | — |
| `src/app/api/admin/system/maintenance/actions/systemStatus.ts` | 1 | — |
| `src/app/api/admin/system/maintenance/actions/testEmail.ts` | 1 | — |
| `src/app/api/admin/system/maintenance/actions/backupDatabase.ts` | 1 | Optional: `supabase?: unknown` |
| `src/lib/utils/tax-config.ts` | 1 | — |
| `src/lib/ai/tools/importBulk/analyzeFile.ts` | 1 | — |
| `src/lib/ai/tools/importBulk/importCustomers.ts` | 1 | — |
| `src/lib/ai/tools/importBulk/importProducts.ts` | 1 | — |
| `src/lib/api/services/adminAppointmentService.ts` | 1 | — |
| `src/lib/api/services/adminQuoteService.ts` | 1 | — |
| `src/lib/api/services/appointmentDetailService.ts` | 2 | `getAdminAuth` + `fetchRelations` |
| `src/lib/api/services/adminOrderService.ts` | 2 | — |
| `src/app/api/admin/customers/[id]/customersDetailShared.ts` | 1 | Return type in Promise |
| `src/app/api/admin/customers/searchHelpers.ts` | 3 | `resolveBranchContext`, `searchCustomers`, `searchCustomersPaginated` |
| `src/app/api/admin/chat/_helpers/chatHelpers.ts` | 3 | `buildAgentContext`, `resolveOrgId`, `createAndStreamAgent` |
| `src/app/api/admin/dashboard/route.ts` | 3 | `computeAppointments`, `computeTodayAppointmentsList`, `buildApptQuery` |
| `src/lib/ai/insights/feedback.ts` | 2 | `private supabase: unknown` (field) + `constructor(supabase: unknown)` |

## Interfaces / Contracts

```typescript
// Added to every file:
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Changed:
- supabase: unknown
+ supabase: SupabaseClient<Database>

// Special: backupDatabase.ts
- supabase?: unknown
+ supabase?: SupabaseClient<Database>

// Special: feedback.ts class field
- private supabase: unknown;
+ private supabase: SupabaseClient<Database>;
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Type-check | All 20 files | `npx tsc --noEmit` — expect TS18046 count to drop by ~67 (from ~1,691 to ~1,624) |
| Lint | All 20 files | `npm run lint` — 0 errors |
| Runtime | None needed | Type-only change, no behavioral impact |

## Migration / Rollout

No migration required. Three stacked PRs (phases per proposal), each independently revertible.

## Open Questions

None.
