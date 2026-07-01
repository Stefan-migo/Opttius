# Proposal: Split Monolithic Content Components

## Intent

Three admin content components (AnalyticsContent 1180 lines, AppointmentsContent 1190 lines, WorkOrderDetailContent 1257 lines) are monolithic `"use client"` components with no server/client boundary. Splitting each into a server shell (auth, layout, SEO) + client island (interactive rendering) reduces JS payload, enables streaming, and isolates interactive boundaries. React Query hooks are already extracted for Analytics and Appointments — the split is now mechanical for those two.

## Scope

### In Scope

- **PR 1**: Split AnalyticsContent — server shell in `page.tsx`, client island lazy-loaded
- **PR 2**: Split AppointmentsContent — same pattern
- **PR 3**: Split WorkOrderDetailContent — same pattern (data fetching stays in client island)

### Out of Scope

- React Query migration for WorkOrderDetailContent (deferred — out of scope for this change)
- Splitting SystemAdminContent (1396 lines), UsersManagementContent (1039 lines), OpticalInternalSupportContent (1035 lines), LensMatricesContent (1006 lines) — YAGNI, add when those components are actively modified
- Layout/design changes to any component — pure boundary refactor

## Capabilities

### New Capabilities

None — no new spec-level capabilities. Pure refactor of existing components.

### Modified Capabilities

None — no spec-level behavior changes. All capabilities (analytics, appointments, work-orders) remain unchanged at the requirement level.

## Approach

Each component follows the same three-step pattern:

1. **Server shell** (`page.tsx`): keep `force-dynamic`, `createClient()`, `getUser()`. Add metadata export, pass branch/org as props to client island. Remove `"use client"`.
2. **Client island** (`_components/AnalyticsContent.tsx` etc.): keep `"use client"`. Wrap with `Suspense` boundary. No behavioral changes.
3. **Lazy loading**: use `next/dynamic` in page.tsx with loading fallback for each client island.

WorkOrderDetailContent keeps its existing `useState`/`useEffect` data fetching pattern inside the client island — React Query migration is deferred.

Delivered as 3 chained PRs stacked-to-main, one per component.

## Affected Areas

| Area                                                                    | Impact   | Description                            |
| ----------------------------------------------------------------------- | -------- | -------------------------------------- |
| `src/app/admin/analytics/page.tsx`                                      | Modified | Server shell + lazy load client island |
| `src/app/admin/analytics/_components/AnalyticsContent.tsx`              | Modified | `"use client"` kept, no logic changes  |
| `src/app/admin/appointments/page.tsx`                                   | Modified | Same pattern                           |
| `src/app/admin/appointments/_components/AppointmentsContent.tsx`        | Modified | `"use client"` kept, no logic changes  |
| `src/app/admin/work-orders/[id]/page.tsx`                               | Modified | Same pattern                           |
| `src/app/admin/work-orders/[id]/_components/WorkOrderDetailContent.tsx` | Modified | `"use client"` kept, no logic changes  |

## Risks

| Risk                                           | Likelihood | Mitigation                                                                   |
| ---------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Missing auth guard in server shell             | Low        | Existing `getUser()` call kept in server shell                               |
| Client island loses org/branch context         | Low        | Pass branch ID as server prop                                                |
| Loader flash on lazy load                      | Med        | Use skeleton loading fallback matching component height                      |
| WorkOrderDetailContent has deeply nested hooks | Low-Med    | Client island boundary stays at content level — only page.tsx becomes server |

## Rollback Plan

Per-component rollback by reverting `page.tsx` to its original direct import (removing `dynamic()` + Suspense). The component file is untouched — no behavioral risk. If all 3 go wrong, full revert is restoring the 3 `page.tsx` files to their current state.

## Dependencies

- React Query hooks already in place for Analytics and Appointments (just completed)
- No external dependencies

## Success Criteria

- [ ] All 3 page.tsx files load the content component via `next/dynamic` with Suspense
- [ ] All 3 content components render identically to current behavior (no regression)
- [ ] Each page.tsx is a server component (no `"use client"`)
- [ ] All 3 changes pass `npm run build` without errors
- [ ] 3 chained PRs merged to main, each under 400 changed lines
