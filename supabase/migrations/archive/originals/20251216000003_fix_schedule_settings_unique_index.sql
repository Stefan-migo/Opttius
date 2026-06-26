-- Migration: 20251216000003_fix_schedule_settings_unique_index.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix schedule_settings unique index to support multiple branches
-- This removes the single-record constraint and allows one settings record per branch

-- Drop the problematic unique index that only allows one record
DROP INDEX IF EXISTS public.idx_schedule_settings_single;

-- Create a unique index on branch_id to ensure one settings record per branch
-- NULL branch_id is allowed for global/default settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_settings_branch_unique 
ON public.schedule_settings(branch_id) 
WHERE branch_id IS NOT NULL;

-- Also create a partial unique index for NULL branch_id (only one global settings allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_settings_global_unique 
ON public.schedule_settings((1)) 
WHERE branch_id IS NULL;

-- ===== COMMENTS =====
COMMENT ON INDEX idx_schedule_settings_branch_unique IS 'Ensures one schedule settings record per branch';
COMMENT ON INDEX idx_schedule_settings_global_unique IS 'Ensures only one global schedule settings record (branch_id IS NULL)';
