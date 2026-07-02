# Proposal: Dashboard & Analytics API Optimization

## Intent

Dashboard and Analytics APIs fetch ALL raw data from 5+ tables then aggregate in-memory — O(n²) loops for daily trends, no pagination, 756 and 996 lines respectively. This doesn't scale beyond a few hundred records/day. Materialized views shift aggregation to the DB: faster, less code, cache-friendly.

## Scope

### In Scope

- Materialized view(s) for daily KPI aggregates (revenue, orders, work orders, appointments)
- Rewrite dashboard API → query views + paginate remaining lists
- Rewrite analytics API → query views + paginate remaining lists
- Refresh strategy via `REFRESH MATERIALIZED VIEW CONCURRENTLY`

### Out of Scope

- React Query migration on the frontend (separate change: `react-query-migration`)
- Splitting monolithic content components (separate change)
- UI changes to dashboard or analytics pages
- New KPIs that don't exist today

## Capabilities

### New Capabilities

- `dashboard-kpis`: Daily KPI aggregates API — revenue, order stats, work order status, appointment metrics, inventory alerts. Serves the executive dashboard view.
- `analytics-kpis`: Time-series KPI analytics API — daily trends, growth calculations, payment method breakdowns, category revenue. Serves the analytics page.

### Modified Capabilities

None — no existing specs exist for these endpoints.

## Approach

1. **Migration**: Create one or more materialized views — `mv_daily_kpis` with columns per day: org_id, branch_id, revenue, orders_count, work_orders_by_status, appointments_by_status. One row per day per branch. Also create a refresh function (`refresh_kpi_materialized_views`) that runs `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
2. **Dashboard API rewrite**: Replace in-memory aggregation loops with queries against the materialized view. Only raw data needed for lists (recent appointments, low stock products) remains as direct table queries with `.limit()`.
3. **Analytics API rewrite**: Same pattern — daily trends, growth, payment methods, support metrics all from the materialized view. Keep `unstable_cache` for route-level caching but now the expensive computation is pre-resolved.
4. **Refresh strategy**: Schedule via Supabase cron (pg_cron or db cron wrapper) every 5-15 min. Acceptable staleness: analytics data is inherently time-bucketed.

## Affected Areas

| Area                                             | Impact   | Description                                          |
| ------------------------------------------------ | -------- | ---------------------------------------------------- |
| `supabase/migrations/`                           | New      | Migration with materialized views + refresh function |
| `src/app/api/admin/dashboard/route.ts`           | Modified | Rewrite to query materialized views                  |
| `src/app/api/admin/analytics/dashboard/route.ts` | Modified | Rewrite to query materialized views                  |
| `src/lib/analytics/analytics-service.ts`         | Modified | May extract reusable view query helpers              |

## Risks

| Risk                           | Likelihood | Mitigation                                                        |
| ------------------------------ | ---------- | ----------------------------------------------------------------- |
| Stale dashboard data           | Medium     | Acceptable staleness (5-15 min) — dashboard data is not real-time |
| Materialized view design wrong | Low        | Start simple (one view), extend if perf needs it                  |
| Refresh locks blocking reads   | Low        | Use `CONCURRENTLY` (requires unique index)                        |

## Rollback Plan

- Remove migration: `supabase migration down` or run `DROP MATERIALIZED VIEW IF EXISTS mv_daily_kpis`
- Revert API files: `git checkout` on both `route.ts` files
- No data loss — materialized views are derived, source tables untouched

## Dependencies

- `pg_cron` must be available on the Supabase project (enabled by default on Supabase)
- Unique index required on the materialized view for `CONCURRENTLY` refresh

## Success Criteria

- [ ] Dashboard API responses under 200ms for orgs with 365+ days of data
- [ ] Analytics API `unstable_cache` hit ratio maintained or improved
- [ ] All existing KPIs match pre-change values (tested against current output)
- [ ] Materialized view refresh completes within 30s for largest orgs
