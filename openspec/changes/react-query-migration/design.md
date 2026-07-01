# Design: React Query Migration — Admin Content Components

## Technical Approach

Pure refactor: three `useState` + `useEffect` + `fetch` patterns replaced by TanStack React Query v5 hooks following the established convention in `products/hooks/useProducts.ts`. Zero API contract changes. Zero rendering changes.

Create shared hooks at `src/app/admin/hooks/`, then inline-migrate each content component to consume the hook instead of managing manual fetch/loading/error state. Three chained PRs (one per component), hooks created first in PR 1.

## Architecture Decisions

### Decision: Hook location — centralised vs co-located

| Option                               | Tradeoff                                 | Decision                                                  |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| `src/app/admin/hooks/` (centralised) | Shared hooks, reusable across components | **Chosen** — matches Products pattern, avoids duplication |
| Co-located per module                | Each hook sits next to its component     | More directories, less discoverable                       |

### Decision: staleTime per hook

| Hook                     | staleTime       | Rationale                                                  |
| ------------------------ | --------------- | ---------------------------------------------------------- |
| `useDashboard`           | `5 * 60 * 1000` | Dashboard data changes infrequently; matches `useProducts` |
| `useAnalytics`           | `5 * 60 * 1000` | Same reasoning; analytics queries are expensive            |
| `useAppointments`        | `30 * 1000`     | Appointments are time-sensitive, need fresher data         |
| `useAppointmentSettings` | `5 * 60 * 1000` | Schedule settings rarely change                            |

### Decision: Appointments — split or single hook

`fetchAppointments` and `fetchScheduleSettings` fire as two independent `useEffect` calls. They serve separate concerns and have different cache profiles. Keep them as **two hooks** (`useAppointments`, `useAppointmentSettings`) rather than a combined hook that bundles both fetches into one `useQuery`.

### Decision: useAdminStats — not migrated (out of scope per proposal)

It uses a different polling pattern (`setInterval`-based) for admin shell badge counts. Separate concern — leave untouched.

## Data Flow

```
Component (before)
  useState + useEffect + fetch  →  /api/admin/{endpoint}
  ↓
Component (after)
  useDashboard() / useAnalytics() / useAppointments()
    ↓
  useQuery(queryKey, queryFn)
    ↓
  fetch (raw) or appointmentService (service layer)
    ↓
  /api/admin/{dashboard|analytics|appointments}
```

Query cache key structure:

```
["dashboard", branchId, isGlobalView, period]
["analytics", branchId, period]
["appointments", branchIdFilter, view, statusFilter, dateFrom, dateTo]
["appointmentSettings", branchId]
```

## File Changes

| File                                            | Action     | Description                                                                                                  |
| ----------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| `src/app/admin/hooks/useDashboard.ts`           | **Create** | Hook fetching `/api/admin/dashboard?period=X` with branch headers                                            |
| `src/app/admin/hooks/useAnalytics.ts`           | **Create** | Hook fetching `/api/admin/analytics/dashboard?period=X`                                                      |
| `src/app/admin/hooks/useAppointments.ts`        | **Create** | Hook wrapping `appointmentService.getAppointments()`                                                         |
| `src/app/admin/hooks/useAppointmentSettings.ts` | **Create** | Hook wrapping `appointmentService.getScheduleSettings()`                                                     |
| `AdminDashboardContent.tsx`                     | Modify     | Remove useState/useEffect/fetchDashboardData → useDashboard                                                  |
| `AnalyticsContent.tsx`                          | Modify     | Remove useState/useEffect/fetchAnalytics → useAnalytics                                                      |
| `AppointmentsContent.tsx`                       | Modify     | Remove useState/useEffect/fetchAppointments/fetchScheduleSettings → useAppointments + useAppointmentSettings |

## Hook Patterns

Each hook follows the exact shape from `useProducts.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

// types inline or imported
// fetch function outside hook
// useQuery with descriptive queryKey[]
// return { data, isLoading, error, refetch }
```

**Key conventions** (matching existing codebase):

- `"use client"` directive at top
- Dedicated fetch function OUTSIDE the hook (testable, not recreated on render)
- `queryKey` includes ALL params so cache differentiates by branch/period/view
- Return destructured `useQuery` fields: `data`, `isLoading` (NOT `isPending`), `error`, `refetch`
- Branch header logic: same as current components — `x-branch-id` header or `getBranchHeader()` util
- No toast on error in the hook — errors bubble up to component's catch/fallback UI
- `staleTime` per hook as defined above
- No custom error boundary wrapping — errors handled via `error` return value (same as current pattern)

## Testing Strategy

| Layer       | What to Test                             | Approach                                                                    |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| Integration | Each hook successfully fetches data      | Manual smoke test per PR — mount component, verify data renders identically |
| Regression  | No rendering regressions in 3 components | Visual comparison: loading skeletons, error fallback, data display          |

## Migration / Rollout

PR 1: Create `useDashboard.ts` + `useAppointmentSettings.ts` + migrate `AdminDashboardContent.tsx` (smallest diff, quickest win).
PR 2: Create `useAnalytics.ts` + migrate `AnalyticsContent.tsx`.
PR 3: Create `useAppointments.ts` + migrate `AppointmentsContent.tsx`.

Each PR independently reviewable, revertible via `git revert <merge-commit>`. Hooks die with the revert since no other consumer depends on them.

## Open Questions

None. Proposal was explicit on scope, patterns are established in codebase, API contracts unchanged.
