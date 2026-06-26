-- Migration: 20251220000002_add_branch_id_to_quote_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add branch_id to quote_settings
-- This allows each branch to have its own quote configuration

-- Add branch_id column to quote_settings table
ALTER TABLE public.quote_settings
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quote_settings_branch_id ON public.quote_settings(branch_id);

-- Drop the old unique index that only allowed one record
DROP INDEX IF EXISTS public.idx_quote_settings_single;

-- Create a unique index on branch_id to ensure one settings record per branch
-- NULL branch_id is allowed for global/default settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_settings_branch_unique 
ON public.quote_settings(branch_id) 
WHERE branch_id IS NOT NULL;

-- Also create a partial unique index for NULL branch_id (only one global settings allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_settings_global_unique 
ON public.quote_settings((1)) 
WHERE branch_id IS NULL;

-- Update RLS policies to filter by branch
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view quote settings" ON public.quote_settings;
DROP POLICY IF EXISTS "Admins can update quote settings" ON public.quote_settings;
DROP POLICY IF EXISTS "Admins can insert quote settings" ON public.quote_settings;

-- Create new RLS policies that consider branch_id
DROP POLICY IF EXISTS "Admins can view quote settings in their branches" ON public.quote_settings;
CREATE POLICY "Admins can view quote settings in their branches"
ON public.quote_settings
FOR SELECT
USING (
  -- Super admin sees all settings
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees settings in their accessible branches or global settings
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = quote_settings.branch_id
    )
  )
);

CREATE POLICY "Admins can update quote settings in their branches"
ON public.quote_settings
FOR UPDATE
USING (
  -- Super admin can update any settings
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can update settings in their accessible branches or global settings
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = quote_settings.branch_id
    )
  )
);

CREATE POLICY "Admins can insert quote settings in their branches"
ON public.quote_settings
FOR INSERT
WITH CHECK (
  -- Super admin can create settings for any branch
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can only create settings for their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = quote_settings.branch_id
    )
  )
);

-- Add comment
COMMENT ON COLUMN public.quote_settings.branch_id IS 'Sucursal a la que pertenece esta configuración. NULL para configuración global (por defecto).';
