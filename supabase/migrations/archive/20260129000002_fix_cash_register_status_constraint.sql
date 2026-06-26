-- Migration: 20260129000002_fix_cash_register_status_constraint.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Force fix cash register closure status constraint to include 'closed'
-- This migration ensures the status constraint includes 'closed' status
-- It's idempotent and safe to run multiple times

DO $$
BEGIN
  -- Check if cash_register_closures table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cash_register_closures'
  ) THEN
    -- Drop the constraint if it exists (regardless of its current definition)
    ALTER TABLE public.cash_register_closures
      DROP CONSTRAINT IF EXISTS cash_register_closures_status_check;

    -- Recreate the constraint with 'closed' included
    ALTER TABLE public.cash_register_closures
      ADD CONSTRAINT cash_register_closures_status_check 
      CHECK (status IN ('draft', 'confirmed', 'reviewed', 'closed'));

    RAISE NOTICE 'Successfully updated cash_register_closures status constraint to include ''closed''';
  ELSE
    RAISE NOTICE 'Table cash_register_closures does not exist yet, skipping migration';
  END IF;
END $$;
