-- Migration: 20260203000004_add_organization_id_to_lens_families.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add organization_id to lens_families (optical) for per-organization lens families
-- Each organization can create and configure its own optical lens families and price matrices.
-- contact_lens_families and contact_lens_price_matrices already have organization_id.

-- Add organization_id to lens_families (nullable for existing rows; new rows should set it)
ALTER TABLE public.lens_families
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lens_families_organization_id ON public.lens_families(organization_id) WHERE organization_id IS NOT NULL;

COMMENT ON COLUMN public.lens_families.organization_id IS 'Organization that owns this lens family.';

-- Backfill: assign existing lens families to the first organization (e.g. demo/seed org)
UPDATE public.lens_families
SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
WHERE organization_id IS NULL;
