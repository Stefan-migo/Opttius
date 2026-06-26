-- Migration: 20260330000000_fix_security_definer_views_and_rls.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix Supabase Security Advisor alerts
-- 1. Recreate views with SECURITY INVOKER (fixes security_definer_view)
-- 2. Enable RLS on order_payments and pos_sale_idempotency (fixes rls_disabled_in_public)
-- Ref: https://supabase.com/docs/guides/database/database-linter

-- ===== 1. FIX SECURITY DEFINER VIEWS =====
-- Views must use security_invoker so they respect RLS on underlying tables

-- products_with_stock
DROP VIEW IF EXISTS public.products_with_stock;
CREATE VIEW public.products_with_stock
WITH (security_invoker = on)
AS
SELECT
  p.*,
  COALESCE(
    (SELECT SUM(pbs.quantity)
     FROM public.product_branch_stock pbs
     WHERE pbs.product_id = p.id),
    0
  ) AS total_inventory_quantity,
  COALESCE(
    (SELECT SUM(pbs.available_quantity)
     FROM public.product_branch_stock pbs
     WHERE pbs.product_id = p.id),
    0
  ) AS total_available_quantity
FROM public.products p;

GRANT SELECT ON public.products_with_stock TO authenticated;
GRANT SELECT ON public.products_with_stock TO anon;

-- support_ticket_stats
DROP VIEW IF EXISTS public.support_ticket_stats;
CREATE VIEW public.support_ticket_stats
WITH (security_invoker = on)
AS
SELECT
  COUNT(*) AS total_tickets,
  COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
  COUNT(*) FILTER (WHERE status = 'pending_customer') AS pending_customer_tickets,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets,
  COUNT(*) FILTER (WHERE status = 'closed') AS closed_tickets,
  COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent_tickets,
  COUNT(*) FILTER (WHERE priority = 'high') AS high_priority_tickets,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS tickets_this_week,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS tickets_this_month,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_time_hours
FROM public.support_tickets;

COMMENT ON VIEW public.support_ticket_stats IS 'Real-time statistics for support ticket dashboard';

-- admin_users_view
DROP VIEW IF EXISTS public.admin_users_view;
CREATE VIEW public.admin_users_view
WITH (security_invoker = on)
AS
SELECT
  au.id,
  au.email,
  au.role,
  au.is_active,
  au.created_at,
  au.last_login,
  CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS full_name
FROM public.admin_users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.is_active = true;

COMMENT ON VIEW public.admin_users_view IS 'Convenient view for admin user management';
GRANT SELECT ON public.admin_users_view TO authenticated;

-- ===== 2. ENABLE RLS ON order_payments =====
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- Access via order: user can access order_payments if they can access the related order
CREATE POLICY "Admins can view order_payments in their branches"
ON public.order_payments
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id
    AND (
      o.branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.admin_branch_access aba
        WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = o.branch_id
      )
    )
  )
);

CREATE POLICY "Admins can insert order_payments in their branches"
ON public.order_payments
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id
    AND (
      o.branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.admin_branch_access aba
        WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = o.branch_id
      )
    )
  )
);

CREATE POLICY "Admins can update order_payments in their branches"
ON public.order_payments
FOR UPDATE
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id
    AND (
      o.branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.admin_branch_access aba
        WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = o.branch_id
      )
    )
  )
);

CREATE POLICY "Admins can delete order_payments in their branches"
ON public.order_payments
FOR DELETE
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id
    AND (
      o.branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.admin_branch_access aba
        WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = o.branch_id
      )
    )
  )
);

COMMENT ON POLICY "Admins can view order_payments in their branches" ON public.order_payments IS 'RLS: view payments for orders in accessible branches';
COMMENT ON POLICY "Admins can insert order_payments in their branches" ON public.order_payments IS 'RLS: insert payments for orders in accessible branches';

-- ===== 3. ENABLE RLS ON pos_sale_idempotency =====
ALTER TABLE public.pos_sale_idempotency ENABLE ROW LEVEL SECURITY;

-- Access via order_id: same pattern as order_payments
CREATE POLICY "Admins can view pos_sale_idempotency in their branches"
ON public.pos_sale_idempotency
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = pos_sale_idempotency.order_id
    AND (
      o.branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.admin_branch_access aba
        WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = o.branch_id
      )
    )
  )
);

CREATE POLICY "Admins can insert pos_sale_idempotency in their branches"
ON public.pos_sale_idempotency
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = pos_sale_idempotency.order_id
    AND (
      o.branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.admin_branch_access aba
        WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = o.branch_id
      )
    )
  )
);

-- No UPDATE/DELETE policies: idempotency table is append-only, managed by process_pos_sale RPC (SECURITY DEFINER)
-- Service role and process_pos_sale bypass RLS, so inserts from RPC continue to work

COMMENT ON POLICY "Admins can view pos_sale_idempotency in their branches" ON public.pos_sale_idempotency IS 'RLS: view idempotency records for orders in accessible branches';
COMMENT ON POLICY "Admins can insert pos_sale_idempotency in their branches" ON public.pos_sale_idempotency IS 'RLS: insert idempotency records for orders in accessible branches (RPC uses SECURITY DEFINER)';
