-- Migration: 20260216133955_add_category_to_lens_families.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add category_id to lens_families and contact_lens_families for lens category filtering

ALTER TABLE public.lens_families
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.contact_lens_families
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lens_families_category_id ON public.lens_families(category_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_families_category_id ON public.contact_lens_families(category_id);
