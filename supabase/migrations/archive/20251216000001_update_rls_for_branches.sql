-- Migration: 20251216000001_update_rls_for_branches.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update RLS Policies for Branch Filtering
-- This migration updates existing RLS policies to filter by branch_id

-- ===== DROP OLD POLICIES =====
-- We'll recreate them with branch filtering

-- ===== APPOINTMENTS RLS =====
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage appointments" ON public.appointments;

-- Admins can view appointments in their branches or all if super admin
CREATE POLICY "Admins can view appointments in their branches"
ON public.appointments
FOR SELECT
USING (
  -- Super admin sees all
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees only their branches
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
    )
  )
  OR
  -- Allow NULL branch_id for backward compatibility during migration
  branch_id IS NULL
);

-- Admins can manage appointments in their branches
CREATE POLICY "Admins can manage appointments in their branches"
ON public.appointments
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
);

-- ===== QUOTES RLS =====
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can manage quotes" ON public.quotes;

CREATE POLICY "Admins can view quotes in their branches"
ON public.quotes
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
    )
  )
  OR
  branch_id IS NULL
);

CREATE POLICY "Admins can manage quotes in their branches"
ON public.quotes
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
);

-- ===== LAB WORK ORDERS RLS =====
DROP POLICY IF EXISTS "Admins can view all work orders" ON public.lab_work_orders;
DROP POLICY IF EXISTS "Admins can manage work orders" ON public.lab_work_orders;

CREATE POLICY "Admins can view work orders in their branches"
ON public.lab_work_orders
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
    )
  )
  OR
  branch_id IS NULL
);

CREATE POLICY "Admins can manage work orders in their branches"
ON public.lab_work_orders
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
);

-- ===== ORDERS RLS =====
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;

CREATE POLICY "Admins can view orders in their branches"
ON public.orders
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
    )
  )
  OR
  branch_id IS NULL
);

CREATE POLICY "Admins can manage orders in their branches"
ON public.orders
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
);

-- ===== SCHEDULE SETTINGS RLS =====
DROP POLICY IF EXISTS "Admins can view schedule settings" ON public.schedule_settings;
DROP POLICY IF EXISTS "Admins can update schedule settings" ON public.schedule_settings;
DROP POLICY IF EXISTS "Admins can insert schedule settings" ON public.schedule_settings;

CREATE POLICY "Admins can view schedule settings in their branches"
ON public.schedule_settings
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
    )
  )
  OR
  branch_id IS NULL
);

CREATE POLICY "Admins can manage schedule settings in their branches"
ON public.schedule_settings
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
);

-- ===== QUOTE SETTINGS RLS =====
DROP POLICY IF EXISTS "Admins can view quote settings" ON public.quote_settings;
DROP POLICY IF EXISTS "Admins can manage quote settings" ON public.quote_settings;

CREATE POLICY "Admins can view quote settings in their branches"
ON public.quote_settings
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
    )
  )
  OR
  branch_id IS NULL
);

CREATE POLICY "Admins can manage quote settings in their branches"
ON public.quote_settings
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
  OR
  branch_id IS NULL
);

-- ===== ADMIN NOTIFICATIONS RLS =====
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.admin_notifications;

CREATE POLICY "Admins can view notifications in their branches"
ON public.admin_notifications
FOR SELECT
USING (
  -- Super admin sees all
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees their branches or global (NULL branch_id)
  (
    branch_id IS NULL
    OR
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage notifications in their branches"
ON public.admin_notifications
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IS NULL
    OR
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    branch_id IS NULL
    OR
    branch_id IN (
      SELECT branch_id FROM public.admin_branch_access
      WHERE admin_user_id = auth.uid()
      AND role IN ('manager', 'staff')
    )
  )
);

-- ===== COMMENTS =====
COMMENT ON POLICY "Admins can view appointments in their branches" ON public.appointments IS 'RLS policy for viewing appointments filtered by branch';
COMMENT ON POLICY "Admins can view quotes in their branches" ON public.quotes IS 'RLS policy for viewing quotes filtered by branch';
COMMENT ON POLICY "Admins can view work orders in their branches" ON public.lab_work_orders IS 'RLS policy for viewing work orders filtered by branch';
COMMENT ON POLICY "Admins can view orders in their branches" ON public.orders IS 'RLS policy for viewing orders filtered by branch';
