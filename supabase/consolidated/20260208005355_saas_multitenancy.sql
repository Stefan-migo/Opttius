-- Consolidated Migration: saas_multitenancy
-- Generated: Sun, Feb  8, 2026 12:53:56 AM
-- Original files: 2

-- === Source: 20260128000000_create_organizations_and_subscriptions.sql ===
-- Migration: Create Organizations and Subscriptions for Multi-Tenancy
-- Phase SaaS 0.1: Create schema for multi-tenant architecture
-- This migration implements the foundation for SaaS multi-tenancy

-- ===== CREATE ORGANIZATIONS TABLE (Tenants) =====
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "mioptica")
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro', 'premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE SUBSCRIPTIONS TABLE =====
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  current_period_start DATE,
  current_period_end DATE,
  cancel_at DATE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE SUBSCRIPTION_TIERS TABLE =====
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('basic', 'pro', 'premium')),
  price_monthly DECIMAL(10, 2) NOT NULL,
  max_branches INTEGER,
  max_users INTEGER,
  max_customers INTEGER, -- NULL means unlimited
  max_products INTEGER, -- NULL means unlimited
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== ADD ORGANIZATION_ID TO BRANCHES =====
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ===== ADD ORGANIZATION_ID TO ADMIN_USERS =====
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ===== CREATE INDEXES =====

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON public.organizations(subscription_tier);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Branches indexes
CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches(organization_id) WHERE organization_id IS NOT NULL;

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_org ON public.admin_users(organization_id) WHERE organization_id IS NOT NULL;

-- ===== CREATE TRIGGERS =====

-- Trigger to update updated_at for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE RLS =====
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR ORGANIZATIONS =====

-- Users can view their own organization
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (
  id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Super admins can manage all organizations
CREATE POLICY "Super admins can manage organizations"
ON public.organizations
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

-- ===== RLS POLICIES FOR SUBSCRIPTIONS =====

-- Users can view subscriptions for their organization
CREATE POLICY "Users can view their organization subscriptions"
ON public.subscriptions
FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Super admins can manage all subscriptions
CREATE POLICY "Super admins can manage subscriptions"
ON public.subscriptions
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

-- ===== RLS POLICIES FOR SUBSCRIPTION_TIERS =====

-- All authenticated users can view subscription tiers (public pricing)
CREATE POLICY "Authenticated users can view subscription tiers"
ON public.subscription_tiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = true
  )
);

-- Only super admins can manage tiers
CREATE POLICY "Super admins can manage subscription tiers"
ON public.subscription_tiers
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

-- ===== INSERT INITIAL SUBSCRIPTION TIERS =====

INSERT INTO public.subscription_tiers (name, price_monthly, max_branches, max_users, max_customers, max_products, features)
VALUES
  (
    'basic',
    49.00,
    1,
    2,
    500,
    100,
    '{
      "pos": true,
      "appointments": true,
      "quotes": true,
      "work_orders": true,
      "chat_ia": false,
      "advanced_analytics": false,
      "api_access": false,
      "custom_branding": false
    }'::jsonb
  ),
  (
    'pro',
    99.00,
    3,
    5,
    2000,
    500,
    '{
      "pos": true,
      "appointments": true,
      "quotes": true,
      "work_orders": true,
      "chat_ia": true,
      "advanced_analytics": true,
      "api_access": false,
      "custom_branding": false
    }'::jsonb
  ),
  (
    'premium',
    299.00,
    20,
    50,
    NULL, -- unlimited
    NULL, -- unlimited
    '{
      "pos": true,
      "appointments": true,
      "quotes": true,
      "work_orders": true,
      "chat_ia": true,
      "advanced_analytics": true,
      "api_access": true,
      "custom_branding": true
    }'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  max_branches = EXCLUDED.max_branches,
  max_users = EXCLUDED.max_users,
  max_customers = EXCLUDED.max_customers,
  max_products = EXCLUDED.max_products,
  features = EXCLUDED.features;

-- ===== COMMENTS =====

COMMENT ON TABLE public.organizations IS 'Multi-tenant organizations (ópticas) that use the platform';
COMMENT ON TABLE public.subscriptions IS 'Stripe subscriptions associated with organizations';
COMMENT ON TABLE public.subscription_tiers IS 'Subscription tier definitions (Basic, Pro, Premium)';
COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly identifier for multi-tenant routing (e.g., "mioptica")';
COMMENT ON COLUMN public.organizations.subscription_tier IS 'Current subscription tier: basic, pro, or premium';
COMMENT ON COLUMN public.organizations.status IS 'Organization status: active, suspended, or cancelled';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID for webhook processing';
COMMENT ON COLUMN public.subscription_tiers.max_customers IS 'Maximum customers allowed (NULL = unlimited)';
COMMENT ON COLUMN public.subscription_tiers.max_products IS 'Maximum products allowed (NULL = unlimited)';

-- === End of 20260128000000_create_organizations_and_subscriptions.sql ===

-- === Source: 20260128000001_extend_rls_for_multitenancy.sql ===
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

-- === End of 20260128000001_extend_rls_for_multitenancy.sql ===

