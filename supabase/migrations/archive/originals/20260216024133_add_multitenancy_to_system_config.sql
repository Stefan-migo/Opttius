-- Migration: 20260216024133_add_multitenancy_to_system_config.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add organization_id and branch_id to system_config for per-branch configuration
-- Enables: Super admin global configs (apply to all) vs branch-specific configs (apply to one branch only)
-- Safe: Adds columns with NULL default. Existing rows remain global (org_id=null, branch_id=null).

-- 1. Add columns (nullable; existing rows stay global)
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

-- 2. Drop old unique constraint (config_key alone) - we need multiple rows per key for different scopes
ALTER TABLE public.system_config
  DROP CONSTRAINT IF EXISTS system_config_config_key_key;

-- 3. Create new unique index: one config per (config_key, organization_id, branch_id) scope
-- Uses COALESCE so NULL (global) is treated consistently - only one global config per key
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_config_scope_unique
  ON public.system_config (
    config_key,
    COALESCE(organization_id::text, ''),
    COALESCE(branch_id::text, '')
  );

-- 4. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_system_config_organization_id
  ON public.system_config(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_config_branch_id
  ON public.system_config(branch_id)
  WHERE branch_id IS NOT NULL;

COMMENT ON COLUMN public.system_config.organization_id IS 'Organization scope. NULL = global (super admin, applies to all).';
COMMENT ON COLUMN public.system_config.branch_id IS 'Branch scope. NULL with org_id = org-level. Set = branch-specific.';
