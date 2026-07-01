# Tasks: Dashboard & Analytics API Optimization

## Review Workload Forecast

| Field                   | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| Estimated changed lines | ~1,800 (additions + deletions across all PRs)                  |
| 400-line budget risk    | High                                                           |
| Chained PRs recommended | Yes                                                            |
| Suggested split         | PR 1 (migration) → PR 2 (dashboard API) → PR 3 (analytics API) |
| Delivery strategy       | auto-chain                                                     |
| Chain strategy          | stacked-to-main                                                |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                  | Likely PR | Notes                                    |
| ---- | ------------------------------------- | --------- | ---------------------------------------- |
| 1    | MV + refresh function + cron schedule | PR 1      | ~35 lines, base = main                   |
| 2    | Rewrite Dashboard API to query MV     | PR 2      | 756→~300 lines, base = main (after PR 1) |
| 3    | Rewrite Analytics API to query MV     | PR 3      | 996→~400 lines, base = main (after PR 2) |

## Phase 1: Migration (PR 1)

- [x] 1.1 Create `20260701000014_create_mv_daily_kpis.sql` — MV with CTEs for daily (org, branch, day) aggregation, unique index, `refresh_kpi_materialized_views()` function, `cron.schedule('refresh-kpis', '*/15 * * * *')`

## Phase 2: Dashboard API Rewrite (PR 2)

- [ ] 2.1 Rewrite `src/app/api/admin/dashboard/route.ts` — replace in-memory aggregation loops with MV queries. Keep direct LIMIT queries for today's appointments, low stock, top products, customer count. Keep auth, branch context, response shape.

## Phase 3: Analytics API Rewrite (PR 3)

- [ ] 3.1 Rewrite `src/app/api/admin/analytics/dashboard/route.ts` — replace daily trend loop and status aggregations with MV queries. Keep `unstable_cache`, payment methods, top products, support tickets, customer metrics. Keep response shape.

## Phase 4: Verification

- [ ] 4.1 Integration: seed source tables for one (org, branch, day), refresh MV, assert row matches expected values
- [ ] 4.2 API parity: call both APIs pre/post migration, assert response shapes deep-equal
