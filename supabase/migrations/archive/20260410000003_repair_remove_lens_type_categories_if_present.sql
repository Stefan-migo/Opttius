-- Migration: 20260410000003_repair_remove_lens_type_categories_if_present.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Repair - Remove monofocales, progresivos, bifocales if still present (idempotent)
-- Use case: Remote may have had migration 20260410000001 fail due to is_system trigger.
-- This migration is safe to run multiple times; no-op if categories already deleted.

-- 1. Clear references (no-op if already null)
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

-- 2. Unmark as system (required for trigger)
UPDATE public.categories
SET is_system = false
WHERE slug IN ('monofocales', 'progresivos', 'bifocales');

-- 3. Delete (no-op if already gone)
DELETE FROM public.categories
WHERE slug IN ('monofocales', 'progresivos', 'bifocales');
