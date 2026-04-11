-- Migration: Fix schedule_settings unique index for proper upsert support
-- This adds proper unique constraints to support the upsert in the API

-- 1. Drop existing partial indexes
DROP INDEX IF EXISTS public.idx_schedule_settings_branch_unique;
DROP INDEX IF EXISTS public.idx_schedule_settings_global_unique;

-- 2. Create proper unique index on (organization_id, branch_id) 
-- This allows one settings record per branch per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_settings_org_branch 
ON public.schedule_settings(organization_id, branch_id);

-- 3. Add comment
COMMENT ON INDEX idx_schedule_settings_org_branch IS 'Ensures one schedule settings record per branch per organization';
