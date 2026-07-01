# Tasks: Split Monolithic Content Components

## Review Workload Forecast

| Field                   | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Estimated changed lines | ~100-135 (3 PRs × ~35-45 lines each)                               |
| 400-line budget risk    | Low                                                                |
| Chained PRs recommended | Yes                                                                |
| Suggested split         | PR 1 (Analytics) → PR 2 (Appointments) → PR 3 (Work Orders Detail) |
| Delivery strategy       | auto-chain                                                         |
| Chain strategy          | stacked-to-main                                                    |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                  | Likely PR | Notes                                              |
| ---- | ------------------------------------- | --------- | -------------------------------------------------- |
| 1    | Split AnalyticsContent page.tsx       | PR 1      | base=main; ~25 lines changed in 1 file             |
| 2    | Split AppointmentsContent page.tsx    | PR 2      | base=main (after PR 1 merged); ~25 lines in 1 file |
| 3    | Split WorkOrderDetailContent page.tsx | PR 3      | base=main (after PR 2 merged); ~25 lines in 1 file |

## Phase 1: PR 1 — Analytics

- [x] 1.1 Modify `src/app/admin/analytics/page.tsx`: replace direct `import AnalyticsContent` with `dynamic(() => import("./_components/AnalyticsContent"), { ssr: false })`; wrap in `<Suspense>` boundary with skeleton fallback matching the existing loading state
- [x] 1.2 Run `npm run test:run` — 94 test files, 1463 tests passed, all green

## Phase 2: PR 2 — Appointments

- [ ] 2.1 Modify `src/app/admin/appointments/page.tsx`: same server-shell pattern — `dynamic()` + `ssr: false` + Suspense fallback
- [ ] 2.2 Run `npm run build` — verify no errors

## Phase 3: PR 3 — Work Orders Detail

- [ ] 3.1 Modify `src/app/admin/work-orders/[id]/page.tsx`: same server-shell pattern — `dynamic()` + `ssr: false` + Suspense fallback
- [ ] 3.2 Run `npm run build` — verify no errors

## Notes

- **No component modifications**: `AnalyticsContent.tsx`, `AppointmentsContent.tsx`, `WorkOrderDetailContent.tsx` stay untouched. Only page.tsx wrappers change.
- **Already "use client"**: All three content components already have `"use client"` directive — confirmed in current source.
- **Already async server pages**: All three page.tsx files are already async server components doing auth check — confirmed.
- **Auth guard preserved**: `createClient()` + `getUser()` stays in the server page before the dynamic import.
- **`force-dynamic` preserved**: All three pages keep `export const dynamic = "force-dynamic"`.
- Each PR is autonomous: if one breaks, revert just that page.tsx. No cross-PR coupling.
- Preview URL: `/admin/analytics`, `/admin/appointments`, `/admin/work-orders/{id}` — visually identical after each PR.
