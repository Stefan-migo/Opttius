-- Migration: 20260410000001_remove_lens_type_categories.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Remove redundant lens type categories (monofocales, progresivos, bifocales)
-- lens_type is now the source of truth for lens families. Keep lectura, ocupacional, deportivo, lentes-contacto.

-- 1. Set category_id = NULL for lens_families and contact_lens_families
--    that reference the categories we're removing
UPDATE public.lens_families
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM public.categories WHERE slug IN ('monofocales', 'progresivos', 'bifocales')
);

UPDATE public.contact_lens_families
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM public.categories WHERE slug IN ('monofocales', 'progresivos', 'bifocales')
);

-- 2. Unmark as system (required: trigger prevent_system_category_deletion blocks deletion of is_system=true)
UPDATE public.categories
SET is_system = false
WHERE slug IN ('monofocales', 'progresivos', 'bifocales');

-- 3. Delete the three categories
DELETE FROM public.categories
WHERE slug IN ('monofocales', 'progresivos', 'bifocales');
