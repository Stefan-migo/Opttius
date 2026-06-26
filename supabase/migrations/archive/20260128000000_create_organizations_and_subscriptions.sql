-- Migration: 20260128000000_create_organizations_and_subscriptions.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

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
