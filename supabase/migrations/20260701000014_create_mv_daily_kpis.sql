-- Migration: create_mv_daily_kpis
-- Description: Materialized view for daily KPI aggregates per (org, branch, day)
-- Replaces in-memory O(n²) aggregation loops in Dashboard + Analytics APIs
-- Refreshed via pg_cron every 15 min (CONCURRENTLY = zero-downtime)
--
-- Design: CTEs per source table + FULL OUTER JOIN ensures days with data in
-- only one source still produce a row (no silent drop).
--
-- Rollback:
--   DROP MATERIALIZED VIEW IF EXISTS public.mv_daily_kpis;
--   DROP FUNCTION IF EXISTS public.refresh_kpi_materialized_views;
--   SELECT cron.unschedule('refresh-kpis');

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_kpis AS
WITH orders_daily AS (
  SELECT
    organization_id,
    branch_id,
    DATE(created_at) AS day,
    COUNT(*) AS orders_count,
    SUM(total_amount) AS order_revenue
  FROM public.orders
  GROUP BY organization_id, branch_id, DATE(created_at)
),
work_orders_daily AS (
  SELECT
    organization_id,
    branch_id,
    DATE(created_at) AS day,
    jsonb_object_agg(status, cnt) AS work_orders_by_status,
    SUM(status_total) AS work_order_revenue
  FROM (
    SELECT
      organization_id,
      branch_id,
      DATE(created_at) AS day,
      status,
      COUNT(*) AS cnt,
      SUM(total_amount) AS status_total
    FROM public.lab_work_orders
    GROUP BY organization_id, branch_id, DATE(created_at), status
  ) sub
  GROUP BY organization_id, branch_id, day
),
appointments_daily AS (
  SELECT
    organization_id,
    branch_id,
    DATE(created_at) AS day,
    jsonb_object_agg(status, cnt) AS appointments_by_status
  FROM (
    SELECT
      organization_id,
      branch_id,
      DATE(created_at) AS day,
      status,
      COUNT(*) AS cnt
    FROM public.appointments
    GROUP BY organization_id, branch_id, DATE(created_at), status
  ) sub
  GROUP BY organization_id, branch_id, day
),
products_sold_daily AS (
  SELECT
    o.organization_id,
    o.branch_id,
    DATE(o.created_at) AS day,
    COUNT(DISTINCT oi.id) AS products_sold
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  GROUP BY o.organization_id, o.branch_id, DATE(o.created_at)
),
quotes_daily AS (
  SELECT
    organization_id,
    branch_id,
    DATE(created_at) AS day,
    COUNT(*) AS quotes_count
  FROM public.quotes
  GROUP BY organization_id, branch_id, DATE(created_at)
)
SELECT
  COALESCE(o.organization_id, wo.organization_id, a.organization_id, ps.organization_id, q.organization_id) AS organization_id,
  COALESCE(o.branch_id, wo.branch_id, a.branch_id, ps.branch_id, q.branch_id) AS branch_id,
  COALESCE(o.day, wo.day, a.day, ps.day, q.day) AS day,
  COALESCE(o.orders_count, 0) AS orders_count,
  COALESCE(o.order_revenue, 0) + COALESCE(wo.work_order_revenue, 0) AS revenue,
  COALESCE(wo.work_orders_by_status, '{}'::jsonb) AS work_orders_by_status,
  COALESCE(a.appointments_by_status, '{}'::jsonb) AS appointments_by_status,
  COALESCE(ps.products_sold, 0) AS products_sold,
  COALESCE(q.quotes_count, 0) AS quotes_count
FROM orders_daily o
FULL OUTER JOIN work_orders_daily wo USING (organization_id, branch_id, day)
FULL OUTER JOIN appointments_daily a USING (organization_id, branch_id, day)
FULL OUTER JOIN products_sold_daily ps USING (organization_id, branch_id, day)
FULL OUTER JOIN quotes_daily q USING (organization_id, branch_id, day);

-- Unique index for CONCURRENTLY refresh (required — pg docs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_kpis_org_branch_day
  ON public.mv_daily_kpis (organization_id, branch_id, day);

-- Refresh function
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

-- Schedule via pg_cron (commented — enable on production after verifying cron_role)
-- SELECT cron.schedule('refresh-kpis', '*/15 * * * *', 'SELECT refresh_kpi_materialized_views()');
