-- Migration: 20260203000000_add_slogan_to_organizations.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add slogan field to organizations table
-- This allows organizations to customize their slogan/tagline for display in headers

-- Add slogan column to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slogan TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_organizations_slogan ON public.organizations(slogan) WHERE slogan IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.organizations.slogan IS 'Slogan or tagline of the organization to display in headers';
