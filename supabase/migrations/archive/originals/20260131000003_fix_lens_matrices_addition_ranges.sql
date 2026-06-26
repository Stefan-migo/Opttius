-- Migration: 20260131000003_fix_lens_matrices_addition_ranges.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix Lens Matrices Addition Ranges
-- This migration ensures all lens_price_matrices have proper addition_min and addition_max values
-- based on their lens family type

-- ============================================================================
-- 1) Ensure addition columns exist (should already exist from previous migration)
-- ============================================================================

ALTER TABLE public.lens_price_matrices
  ADD COLUMN IF NOT EXISTS addition_min DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addition_max DECIMAL(5,2) DEFAULT 4.0;

-- ============================================================================
-- 2) Update addition ranges based on lens family type
-- ============================================================================

-- For single_vision families, addition should be 0
UPDATE public.lens_price_matrices lpm
SET
  addition_min = 0,
  addition_max = 0
FROM public.lens_families lf
WHERE lpm.lens_family_id = lf.id
  AND lf.lens_type = 'single_vision'
  AND (lpm.addition_min IS NULL OR lpm.addition_max IS NULL OR lpm.addition_max > 0);

-- For progressive/bifocal/trifocal families, allow full range (0-4.0) if not set
UPDATE public.lens_price_matrices lpm
SET
  addition_min = COALESCE(lpm.addition_min, 0),
  addition_max = COALESCE(lpm.addition_max, 4.0)
FROM public.lens_families lf
WHERE lpm.lens_family_id = lf.id
  AND lf.lens_type IN ('progressive', 'bifocal', 'trifocal')
  AND (lpm.addition_min IS NULL OR lpm.addition_max IS NULL);

-- For reading/computer/sports families, allow full range (0-4.0) if not set
UPDATE public.lens_price_matrices lpm
SET
  addition_min = COALESCE(lpm.addition_min, 0),
  addition_max = COALESCE(lpm.addition_max, 4.0)
FROM public.lens_families lf
WHERE lpm.lens_family_id = lf.id
  AND lf.lens_type IN ('reading', 'computer', 'sports')
  AND (lpm.addition_min IS NULL OR lpm.addition_max IS NULL);

-- ============================================================================
-- 3) Ensure all matrices have valid addition ranges
-- ============================================================================

-- Set defaults for any remaining NULL values
UPDATE public.lens_price_matrices
SET
  addition_min = COALESCE(addition_min, 0),
  addition_max = COALESCE(addition_max, 4.0)
WHERE addition_min IS NULL OR addition_max IS NULL;

-- ============================================================================
-- 4) Add constraint to ensure addition_min <= addition_max
-- ============================================================================

ALTER TABLE public.lens_price_matrices
  DROP CONSTRAINT IF EXISTS valid_addition_range;

ALTER TABLE public.lens_price_matrices
  ADD CONSTRAINT valid_addition_range CHECK (addition_min <= addition_max);
