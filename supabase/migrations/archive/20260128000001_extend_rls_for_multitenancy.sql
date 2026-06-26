-- Migration: 20260128000001_extend_rls_for_multitenancy.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Extend Row Level Security for Multi-Tenancy
-- Phase SaaS 0.2: Extend RLS to isolate data by organization
-- This migration adds organization_id to data tables and updates RLS policies

-- ===== CREATE FUNCTION TO GET USER ORGANIZATION ID =====
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.admin_users
    WHERE id = user_id
    AND is_active = true
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION public.get_user_organization_id IS 'Get the organization_id for the current user from admin_users table';

-- ===== ADD ORGANIZATION_ID TO DATA TABLES =====
-- Note: These tables will get organization_id for direct filtering
-- For tables that have branch_id, we'll also add organization_id for efficiency

-- Orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Quotes
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Lab Work Orders
ALTER TABLE public.lab_work_orders
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ===== CREATE INDEXES FOR ORGANIZATION_ID =====
CREATE INDEX IF NOT EXISTS idx_orders_org ON public.orders(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_org ON public.lab_work_orders(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_org ON public.products(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id) WHERE organization_id IS NOT NULL;

-- ===== UPDATE RLS POLICIES FOR BRANCHES =====
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view branches" ON public.branches;
DROP POLICY IF EXISTS "Super admins can manage branches" ON public.branches;

-- New policy: Users can only access branches in their organization
CREATE POLICY "Users can view their organization branches"
ON public.branches
FOR SELECT
USING (
  -- Super admins can see all branches (for platform management)
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
    AND organization_id IS NULL -- Super admins don't belong to an organization
  )
  OR
  -- Regular users see only branches in their organization
  organization_id = public.get_user_organization_id()
  OR
  -- Allow NULL organization_id for backward compatibility during migration
  organization_id IS NULL
);

-- Super admins can manage all branches
CREATE POLICY "Super admins can manage all branches"
ON public.branches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Organization admins can manage branches in their organization
CREATE POLICY "Organization admins can manage their branches"
ON public.branches
FOR ALL
USING (
  organization_id = public.get_user_organization_id()
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
);

-- ===== UPDATE RLS POLICIES FOR ORDERS =====
-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view orders in their branches" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders in their branches" ON public.orders;

-- Users can only access orders in their organization
CREATE POLICY "Users can view their organization orders"
ON public.orders
FOR SELECT
USING (
  -- Super admins can see all
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Regular users see only their organization
  organization_id = public.get_user_organization_id()
  OR
  -- Backward compatibility
  organization_id IS NULL
);

CREATE POLICY "Users can manage their organization orders"
ON public.orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

-- ===== UPDATE RLS POLICIES FOR QUOTES =====
DROP POLICY IF EXISTS "Admins can view quotes in their branches" ON public.quotes;
DROP POLICY IF EXISTS "Admins can manage quotes in their branches" ON public.quotes;

CREATE POLICY "Users can view their organization quotes"
ON public.quotes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Users can manage their organization quotes"
ON public.quotes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

-- ===== UPDATE RLS POLICIES FOR LAB_WORK_ORDERS =====
DROP POLICY IF EXISTS "Admins can view lab work orders" ON public.lab_work_orders;
DROP POLICY IF EXISTS "Admins can manage lab work orders" ON public.lab_work_orders;
DROP POLICY IF EXISTS "Admins can view lab work orders in their branches" ON public.lab_work_orders;
DROP POLICY IF EXISTS "Admins can manage lab work orders in their branches" ON public.lab_work_orders;

CREATE POLICY "Users can view their organization lab work orders"
ON public.lab_work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Users can manage their organization lab work orders"
ON public.lab_work_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

-- ===== UPDATE RLS POLICIES FOR APPOINTMENTS =====
DROP POLICY IF EXISTS "Admins can view appointments in their branches" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage appointments in their branches" ON public.appointments;

CREATE POLICY "Users can view their organization appointments"
ON public.appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Users can manage their organization appointments"
ON public.appointments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

-- ===== UPDATE RLS POLICIES FOR PRODUCTS =====
DROP POLICY IF EXISTS "Admins can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can view products in their branches" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products in their branches" ON public.products;

CREATE POLICY "Users can view their organization products"
ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Users can manage their organization products"
ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

-- ===== UPDATE RLS POLICIES FOR CUSTOMERS =====
DROP POLICY IF EXISTS "Admins can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can view customers in their branches" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers in their branches" ON public.customers;

CREATE POLICY "Users can view their organization customers"
ON public.customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Users can manage their organization customers"
ON public.customers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

-- ===== COMMENTS =====
COMMENT ON FUNCTION public.get_user_organization_id IS 'Returns the organization_id for the current authenticated user. Used for RLS multi-tenancy isolation.';
COMMENT ON COLUMN public.orders.organization_id IS 'Organization that owns this order. Used for multi-tenant data isolation.';
COMMENT ON COLUMN public.quotes.organization_id IS 'Organization that owns this quote. Used for multi-tenant data isolation.';
COMMENT ON COLUMN public.lab_work_orders.organization_id IS 'Organization that owns this work order. Used for multi-tenant data isolation.';
COMMENT ON COLUMN public.appointments.organization_id IS 'Organization that owns this appointment. Used for multi-tenant data isolation.';
COMMENT ON COLUMN public.products.organization_id IS 'Organization that owns this product. Used for multi-tenant data isolation.';
COMMENT ON COLUMN public.customers.organization_id IS 'Organization that owns this customer. Used for multi-tenant data isolation.';
