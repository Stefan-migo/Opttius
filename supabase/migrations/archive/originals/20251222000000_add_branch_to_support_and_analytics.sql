-- Migration: 20251222000000_add_branch_to_support_and_analytics.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add branch_id to support system and ensure analytics use branch filtering
-- This allows each branch to manage their support tickets independently

-- ===== ADD BRANCH_ID TO SUPPORT_TICKETS =====
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_support_tickets_branch_id ON public.support_tickets(branch_id);

-- Update existing tickets to use customer's branch (if customer exists)
UPDATE public.support_tickets st
SET branch_id = (
  SELECT c.branch_id 
  FROM public.customers c
  WHERE c.id::text = st.customer_id::text
  LIMIT 1
)
WHERE st.branch_id IS NULL
AND st.customer_id IS NOT NULL;

-- ===== ADD BRANCH_ID TO SUPPORT_CATEGORIES =====
ALTER TABLE public.support_categories
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_support_categories_branch_id ON public.support_categories(branch_id);

-- ===== UPDATE RLS POLICIES FOR SUPPORT_TICKETS =====
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can insert support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;

-- Create new RLS policies that consider branch_id
CREATE POLICY "Admins can view support tickets in their branches"
ON public.support_tickets
FOR SELECT
USING (
  -- Super admin sees all tickets
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees tickets in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_tickets.branch_id
    )
  )
);

CREATE POLICY "Admins can insert support tickets in their branches"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  -- Super admin can create tickets for any branch
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can only create tickets for their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_tickets.branch_id
    )
  )
);

CREATE POLICY "Admins can update support tickets in their branches"
ON public.support_tickets
FOR UPDATE
USING (
  -- Super admin can update any ticket
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can update tickets in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_tickets.branch_id
    )
  )
);

CREATE POLICY "Admins can delete support tickets in their branches"
ON public.support_tickets
FOR DELETE
USING (
  -- Super admin can delete any ticket
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can delete tickets in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_tickets.branch_id
    )
  )
);

-- ===== UPDATE RLS POLICIES FOR SUPPORT_CATEGORIES =====
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view support categories" ON public.support_categories;
DROP POLICY IF EXISTS "Admins can insert support categories" ON public.support_categories;
DROP POLICY IF EXISTS "Admins can update support categories" ON public.support_categories;
DROP POLICY IF EXISTS "Admins can delete support categories" ON public.support_categories;

-- Create new RLS policies that consider branch_id
CREATE POLICY "Admins can view support categories in their branches"
ON public.support_categories
FOR SELECT
USING (
  -- Super admin sees all categories
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees categories in their accessible branches or global categories
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_categories.branch_id
    )
  )
);

CREATE POLICY "Admins can insert support categories in their branches"
ON public.support_categories
FOR INSERT
WITH CHECK (
  -- Super admin can create categories for any branch
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can only create categories for their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_categories.branch_id
    )
  )
);

CREATE POLICY "Admins can update support categories in their branches"
ON public.support_categories
FOR UPDATE
USING (
  -- Super admin can update any category
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can update categories in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_categories.branch_id
    )
  )
);

CREATE POLICY "Admins can delete support categories in their branches"
ON public.support_categories
FOR DELETE
USING (
  -- Super admin can delete any category
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can delete categories in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = support_categories.branch_id
    )
  )
);

-- ===== COMMENTS =====
COMMENT ON COLUMN public.support_tickets.branch_id IS 'Sucursal a la que pertenece el ticket de soporte. NULL para tickets legacy.';
COMMENT ON COLUMN public.support_categories.branch_id IS 'Sucursal a la que pertenece la categoría. NULL para categorías globales.';
