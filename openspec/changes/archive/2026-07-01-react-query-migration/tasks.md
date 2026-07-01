# Tasks: React Query Migration — Admin Content Components

## Review Workload Forecast

| Field                   | Value                                                  |
| ----------------------- | ------------------------------------------------------ |
| Estimated changed lines | ~370 across 3 PRs                                      |
| 400-line budget risk    | Low                                                    |
| Chained PRs recommended | Yes                                                    |
| Suggested split         | PR 1: Dashboard → PR 2: Analytics → PR 3: Appointments |
| Delivery strategy       | auto-chain                                             |
| Chain strategy          | stacked-to-main                                        |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                                                          | Likely PR | Notes                    |
| ---- | ----------------------------------------------------------------------------- | --------- | ------------------------ |
| 1    | Migrate AdminDashboardContent + create useDashboard                           | PR 1      | ~110 lines. Base = main. |
| 2    | Migrate AnalyticsContent + create useAnalytics                                | PR 2      | ~95 lines. Base = main.  |
| 3    | Migrate AppointmentsContent + create useAppointments + useAppointmentSettings | PR 3      | ~165 lines. Base = main. |

## Phase 1: PR 1 — Dashboard (base: main)

- [x] 1.1 Create `src/app/admin/hooks/useDashboard.ts` — hook fetching `/api/admin/dashboard?period=X` with branch headers, `staleTime: 5*60*1000`
- [x] 1.2 Edit `AdminDashboardContent.tsx` — remove `fetchDashboardData()`, `defaultDashboardData`, `isLoading`/`data`/`error`/`refreshing` states, data `useEffect`; import + call `useDashboard()`
- [x] 1.3 Edit `AdminDashboardContent.tsx` — replace `fetchDashboardData(true)` with `refetch()`, `refreshing` prop with `isRefetching`, post-create handler uses `queryClient.invalidateQueries`

## Phase 2: PR 2 — Analytics (base: main)

- [x] 2.1 Create `src/app/admin/hooks/useAnalytics.ts` — hook fetching `/api/admin/analytics/dashboard?period=X`, `staleTime: 5*60*1000`
- [x] 2.2 Edit `AnalyticsContent.tsx` — remove `fetchAnalytics()`, `analytics`/`loading`/`error`/`refreshing` states, data `useEffect`; import + call `useAnalytics()`
- [x] 2.3 Edit `AnalyticsContent.tsx` — replace `fetchAnalytics` in `onRefresh` with `refetch()`, `refreshing` with `isRefetching`; `setPeriod` triggers cache refresh via queryKey

## Phase 3: PR 3 — Appointments (base: main)

- [x] 3.1 Create `src/app/admin/hooks/useAppointments.ts` — hook wrapping `appointmentService.getAppointments()`, `staleTime: 30*1000`
- [x] 3.2 Create `src/app/admin/hooks/useAppointmentSettings.ts` — hook wrapping `appointmentService.getScheduleSettings()`, `staleTime: 5*60*1000`
- [x] 3.3 Edit `AppointmentsContent.tsx` — remove `fetchAppointments()`, `fetchScheduleSettings()`, `appointments`/`scheduleSettings`/`loading` states, data `useEffect`; import + call both hooks
- [x] 3.4 Edit `AppointmentsContent.tsx` — replace direct `fetchAppointments()` calls in `handleAppointmentCreated`, status change, and delete handlers with `queryClient.invalidateQueries({ queryKey: ["admin", "appointments"] })`

### Notes

- Type annotation bridging: service `Appointment` type differs from component's local `Appointment` interface (extra customer/guest fields). Component uses `const appointments: Appointment[] = _appointmentsData ?? []` to bridge.
- ScheduleSettings type mismatch between service and calendar component resolved with `any` cast (pre-existing, same pattern as before migration).
- `staleTime: 30*1000` for appointments (frequent changes), `5*60*1000` for schedule settings (static config).
- Invalidations use `queryKey: ["admin", "appointments"]` (broad prefix to catch all appointment sub-keys).
