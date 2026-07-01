# Proposal: React Query Migration

## Intent

Three major admin content components (`AdminDashboardContent`, `AnalyticsContent`, `AppointmentsContent`) use raw `useState` + `useEffect` + `fetch` for data loading, with manual loading/error state management. React Query v5 is already installed and used extensively in Products and System modules. This change migrates those 3 components to use React Query, eliminating 3 duplicated fetch patterns and providing caching, background refetch, and unified loading/error states.

## Scope

### In Scope

- Shared data hook `useDashboard.ts` — fetches `/api/admin/dashboard` with branch/period params
- Shared data hook `useAnalytics.ts` — fetches `/api/admin/analytics/dashboard` with period param
- Shared data hook `useAppointments.ts` — wraps Supabase appointment queries via `appointmentService`
- Migrate `AdminDashboardContent.tsx` — replace `useState`/`useEffect`/`fetchDashboardData` with `useDashboard`
- Migrate `AnalyticsContent.tsx` — replace `useState`/`useEffect`/`fetchAnalytics` with `useAnalytics`
- Migrate `AppointmentsContent.tsx` — replace `useState`/`useEffect`/`fetchAppointments` with `useAppointments`

### Out of Scope

- `useAdminStats.ts` in `_hooks/` (different polling pattern for admin shell badges — separate concern)
- `WorkOrdersContent.tsx` / `CustomersContent.tsx` (future work)
- Component splitting (server/client boundary — separate Fase 3 item)
- API route changes — hooks consume existing endpoints as-is
- Existing React Query usage in Products/System — no changes needed

## Approach

Create shared hooks at `src/app/admin/hooks/` following the established pattern from `products/hooks/useProducts.ts`:

- `"use client"` directive
- Dedicated fetch function returning typed response
- `useQuery` with descriptive `queryKey` array (params included for cache differentiation)
- `staleTime: 5 * 60 * 1000` (matching Products convention)
- Return `{ data, isLoading, error, refetch }` interface

Then migrate each content component to replace manual state with the hook, removing the inline fetch function and related state variables. Each migration is a self-contained PR.

## Affected Areas

| Area                                                             | Impact       | Description                               |
| ---------------------------------------------------------------- | ------------ | ----------------------------------------- |
| `src/app/admin/hooks/useDashboard.ts`                            | **New**      | Shared hook for dashboard data            |
| `src/app/admin/hooks/useAnalytics.ts`                            | **New**      | Shared hook for analytics data            |
| `src/app/admin/hooks/useAppointments.ts`                         | **New**      | Shared hook for appointments data         |
| `src/app/admin/_components/AdminDashboardContent.tsx`            | **Modified** | Replace manual fetch with useDashboard    |
| `src/app/admin/analytics/_components/AnalyticsContent.tsx`       | **Modified** | Replace manual fetch with useAnalytics    |
| `src/app/admin/appointments/_components/AppointmentsContent.tsx` | **Modified** | Replace manual fetch with useAppointments |

## Risks

| Risk                        | Likelihood | Mitigation                                                                     |
| --------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Breaking existing data flow | Low        | Identical API endpoints, established React Query pattern in codebase           |
| Cache key collisions        | Low        | Descriptive keys (`dashboard`, `analytics`, `appointments`) with param spread  |
| Missing error edge cases    | Low        | Hook returns `error` same as current `catch` — component retains error display |

## Delivery Strategy

3 chained PRs stacked-to-main, one per component:

1. `pr-1-react-query-dashboard` — AdminDashboardContent (smallest, quickest win)
2. `pr-2-react-query-analytics` — AnalyticsContent (medium complexity)
3. `pr-3-react-query-appointments` — AppointmentsContent (medium complexity)

Each PR under 200 changed lines. Each independently reviewable and revertible.

## Rollback Plan

Per-PR revert: `git revert <pr-merge-commit>` for the specific component. Hooks die with the revert since no other component depends on them. No schema or API changes — zero data risk.

## Dependencies

None.

## Success Criteria

- [ ] All 3 components load data correctly with no regressions
- [ ] Loading skeletons display on initial fetch (same as current UX)
- [ ] Errors surface identically (toast + fallback display)
- [ ] Refetch on param change (branch/period/date) works via queryKey invalidation
- [ ] Manual refresh triggers `refetch()` without full page reload
- [ ] All existing tests pass
