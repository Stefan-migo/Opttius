-- Migration: 20260203000001_add_logo_url_to_organizations.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add logo_url field to organizations table
-- This allows organizations to customize their logo for display in headers

-- Add logo_url column to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_organizations_logo_url ON public.organizations(logo_url) WHERE logo_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.organizations.logo_url IS 'URL of the organization logo to display in headers';
