# Design: Dashboard & Analytics API Optimization

## Technical Approach

Replace in-memory O(n²) aggregation loops with a single materialized view (`mv_daily_kpis`) that pre-computes daily KPIs per (org, branch). Both APIs query the view for trends and aggregates, keeping only LIMIT'd direct queries for recent items. Refresh via pg_cron every 15 min with CONCURRENTLY.

## Architecture Decisions

### Decision: Single MV over multiple per-domain views

| Option                                             | Tradeoff                                                                                    | Decision                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| One `mv_daily_kpis`                                | Simpler refresh (one CONCURRENTLY call), one unique index, covers ~60% of expensive queries | **Selected**                                 |
| Per-domain views (orders_mv, work_orders_mv, etc.) | Finer granularity, independent refresh, but more moving parts                               | Rejected — over-engineered for current scale |

### Decision: Revenue from orders + work orders, not closures

| Option                    | Tradeoff                                                                                             | Decision         |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------- |
| Orders + work orders only | Closures already store daily aggregates per branch; join on branch_id for org_id is a separate query | **Selected**     |
| Include closures          | Adds complexity, closures data is already pre-aggregated per branch                                  | Rejected — YAGNI |

### Decision: JSONB for status distributions

JSONB columns (`work_orders_by_status`, `appointments_by_status`) avoid schema changes when new statuses are added. PostgreSQL's `jsonb_object_agg()` builds them directly from source GROUP BYs.

### Decision: pg_cron every 15 min, CONCURRENTLY

15-min staleness is acceptable for dashboard data. CONCURRENTLY requires a unique index, enables zero-downtime refresh, and avoids table-level locks.

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Orders    │────▶│                  │     │  Dashboard API   │
│ Work Orders │────▶│  mv_daily_kpis   │────▶│  Analytics API   │
│ Appointments│────▶│  (pre-computed)  │     │                  │
│   Quotes    │────▶│                  │     └──────────────────┘
│ Order Items │────▶│                  │            │
└─────────────┘     └──────────────────┘            ▼
                                            ┌──────────────────┐
                                            │ Direct queries:  │
                                            │  - Today's appts │
                                            │  - Stock metrics │
                                            │  - Top products  │
                                            │  - Payments      │
                                            │  - Support       │
                                            └──────────────────┘
       ▲                                            │
       └──── pg_cron: REFRESH EVERY 15 MIN ─────────┘
```

## File Changes

| File                                                          | Action | Description                                                                    |
| ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `supabase/migrations/20260701000014_create_mv_daily_kpis.sql` | Create | MV definition, unique index, refresh function, pg_cron schedule                |
| `src/app/api/admin/dashboard/route.ts`                        | Modify | Replace in-memory aggregation with MV queries + direct LIMIT queries for lists |
| `src/app/api/admin/analytics/dashboard/route.ts`              | Modify | Replace daily trend loop + status aggregations with MV queries                 |

## Materialized View Schema

```sql
CREATE MATERIALIZED VIEW public.mv_daily_kpis AS
SELECT
  o.org_id,
  o.branch_id,
  o.day,
  COALESCE(o.revenue_orders, 0) + COALESCE(wo.revenue_work_orders, 0) AS revenue,
  COALESCE(o.orders_count, 0) AS orders_count,
  COALESCE(wo.work_orders_by_status, '{}'::jsonb) AS work_orders_by_status,
  COALESCE(a.appointments_by_status, '{}'::jsonb) AS appointments_by_status,
  COALESCE(ps.products_sold, 0) AS products_sold,
  COALESCE(q.quotes_count, 0) AS quotes_count
FROM orders_daily o
FULL OUTER JOIN work_orders_daily wo USING (org_id, branch_id, day)
FULL OUTER JOIN appointments_daily a USING (org_id, branch_id, day)
FULL OUTER JOIN products_sold_daily ps USING (org_id, branch_id, day)
FULL OUTER JOIN quotes_daily q USING (org_id, branch_id, day);
```

Each CTE aggregates one source table grouped by (org_id, branch_id, day). The FULL OUTER JOIN ensures days with data in only one source still produce a row.

### Index and Refresh

```sql
CREATE UNIQUE INDEX idx_mv_daily_kpis_key ON public.mv_daily_kpis (org_id, branch_id, day);

CREATE OR REPLACE FUNCTION public.refresh_kpi_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_kpis;
END;
$$;

SELECT cron.schedule('refresh-kpis', '*/15 * * * *', 'SELECT refresh_kpi_materialized_views()');
```

## API Rewrite Pattern

### Dashboard route.ts (756 → ~300 lines)

| Current                                         | Replaced by                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `SELECT * FROM orders` + in-memory filter/count | `SELECT SUM(revenue), SUM(orders_count), work_orders_by_status FROM mv_daily_kpis WHERE day BETWEEN X AND Y` |
| Revenue trend loop (30 iterations)              | `SELECT day, revenue FROM mv_daily_kpis ORDER BY day`                                                        |
| Customer count / new customers                  | `SELECT COUNT(*), COUNT(*) FILTER WHERE created_at >= ... FROM customers` (lightweight, stays)               |
| Today's appointments list                       | `SELECT ... FROM appointments WHERE date = today LIMIT 10` (stays)                                           |
| Low stock / top products                        | `SELECT ... FROM product_branch_stock` + order_items aggregation (stays)                                     |

### Analytics route.ts (996 → ~400 lines)

| Current                                         | Replaced by                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily trend loop (period iterations × 4 trends) | `SELECT day, revenue, orders_count, work_orders_by_status, appointments_by_status, quotes_count FROM mv_daily_kpis WHERE day BETWEEN X AND Y` |
| Work orders by status aggregation               | Direct JSONB extraction from `work_orders_by_status`                                                                                          |
| Appointments by status aggregation              | Direct JSONB extraction from `appointments_by_status`                                                                                         |
| Quotes count                                    | `SUM(quotes_count)` from MV                                                                                                                   |
| Revenue growth (prev period comparison)         | Same MV, shifted date range                                                                                                                   |
| Payment methods                                 | Direct closure/orders query (stays, ~30 lines)                                                                                                |
| Top products / category revenue                 | Direct order_items query (stays, ~40 lines)                                                                                                   |
| Support metrics                                 | Direct support_tickets query (stays, ~40 lines)                                                                                               |
| `unstable_cache`                                | Kept as-is for route-level caching                                                                                                            |

## Testing Strategy

| Layer       | What to Test                             | Approach                                                                                                      |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Integration | MV refresh produces correct aggregations | Seed orders/work_orders/appointments/quotes for one (org, branch, day), assert MV row matches expected values |
| Integration | API output parity                        | Hit both routes before/after migration, assert response shapes match (JSON deep-equal, allowing for rounding) |
| E2E         | Dashboard renders with MV-backed data    | Playwright: navigate `/admin`, assert KPIs render (same as today)                                             |

## Migration / Rollout

No migration required — the MV is a derived object with no data loss risk. Rollback:

- `DROP MATERIALIZED VIEW IF EXISTS public.mv_daily_kpis`
- `DROP FUNCTION IF EXISTS public.refresh_kpi_materialized_views`
- `SELECT cron.unschedule('refresh-kpis')`
- `git checkout src/app/api/admin/*/dashboard/route.ts`

## Open Questions

None.
