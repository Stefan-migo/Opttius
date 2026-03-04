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
