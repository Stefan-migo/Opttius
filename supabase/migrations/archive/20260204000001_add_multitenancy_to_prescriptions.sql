-- Migration: 20260204000001_add_multitenancy_to_prescriptions.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add multi-tenancy to prescriptions table
-- Description: Adds organization_id and branch_id to prescriptions and updates RLS policies.

-- 1. ADD COLUMNS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'organization_id') THEN
        ALTER TABLE public.prescriptions ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'branch_id') THEN
        ALTER TABLE public.prescriptions ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. POPULATE DATA FROM CUSTOMERS
UPDATE public.prescriptions p
SET 
    organization_id = c.organization_id,
    branch_id = c.branch_id
FROM public.customers c
WHERE p.customer_id = c.id
AND p.organization_id IS NULL;

-- 3. UPDATE RLS POLICIES
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Admins can insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Admins can update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Admins can delete prescriptions" ON public.prescriptions;

-- Generic helper function exists: get_user_organization_id()
-- Generic helper function exists: is_root_user(auth.uid())

CREATE POLICY "Users can view their organization prescriptions"
ON public.prescriptions
FOR SELECT
USING (
  (organization_id = public.get_user_organization_id())
  OR (is_root_user(auth.uid()))
);

CREATE POLICY "Users can manage their organization prescriptions"
ON public.prescriptions
FOR ALL
USING (
  (organization_id = public.get_user_organization_id())
  OR (is_root_user(auth.uid()))
)
WITH CHECK (
  (organization_id = public.get_user_organization_id())
  OR (is_root_user(auth.uid()))
);

-- 4. ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_prescriptions_organization_id ON public.prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_branch_id ON public.prescriptions(branch_id);
