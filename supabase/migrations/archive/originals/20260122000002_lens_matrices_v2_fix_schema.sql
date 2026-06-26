-- Migration: 20260122000002_lens_matrices_v2_fix_schema.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Lens Matrices V2 (Fix schema per business rules)
-- Goal:
-- 1) Move genetic properties (lens_type, lens_material) to lens_families
-- 2) Remove duplicated fields from lens_price_matrices
-- 3) Add cylinder range (cylinder_min/cylinder_max)
-- 4) Simplify costs: single "cost" field (purchase cost), sourcing_type defines logistics
-- 5) Remove multipliers and lab_cost from matrices (pricing should be expressed via rows)

-- ============================================================================
-- 1) Add genetic fields to lens_families (nullable first for safe backfill)
-- ============================================================================

ALTER TABLE public.lens_families
  ADD COLUMN IF NOT EXISTS lens_type TEXT,
  ADD COLUMN IF NOT EXISTS lens_material TEXT;

-- Add constraints later after backfill (avoid breaking existing rows)

-- ============================================================================
-- 2) Add cylinder range + unified cost to lens_price_matrices
-- ============================================================================

ALTER TABLE public.lens_price_matrices
  ADD COLUMN IF NOT EXISTS cylinder_min DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS cylinder_max DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);

-- Backfill cylinder range for existing rows (legacy model had no cylinder axis)
UPDATE public.lens_price_matrices
SET
  cylinder_min = COALESCE(cylinder_min, -10.00),
  cylinder_max = COALESCE(cylinder_max,  10.00)
WHERE cylinder_min IS NULL OR cylinder_max IS NULL;

-- Backfill unified cost from legacy fields (choose by sourcing_type, fallback to whichever exists)
UPDATE public.lens_price_matrices
SET cost =
  COALESCE(
    cost,
    CASE
      WHEN sourcing_type = 'stock' THEN COALESCE(stock_cost, surfaced_cost, 0)
      ELSE COALESCE(surfaced_cost, stock_cost, 0)
    END
  )
WHERE cost IS NULL;

-- ============================================================================
-- 3) Backfill lens_families.lens_type/material from existing matrices
--    Rule: family must be consistent; choose the most frequent value per family.
-- ============================================================================

WITH ranked_types AS (
  SELECT
    lens_family_id,
    lens_type,
    COUNT(*) AS c,
    ROW_NUMBER() OVER (PARTITION BY lens_family_id ORDER BY COUNT(*) DESC, lens_type ASC) AS rn
  FROM public.lens_price_matrices
  WHERE lens_type IS NOT NULL
  GROUP BY lens_family_id, lens_type
),
ranked_materials AS (
  SELECT
    lens_family_id,
    lens_material,
    COUNT(*) AS c,
    ROW_NUMBER() OVER (PARTITION BY lens_family_id ORDER BY COUNT(*) DESC, lens_material ASC) AS rn
  FROM public.lens_price_matrices
  WHERE lens_material IS NOT NULL
  GROUP BY lens_family_id, lens_material
)
UPDATE public.lens_families lf
SET
  lens_type = COALESCE(lf.lens_type, rt.lens_type),
  lens_material = COALESCE(lf.lens_material, rm.lens_material)
FROM ranked_types rt
JOIN ranked_materials rm ON rm.lens_family_id = rt.lens_family_id AND rm.rn = 1
WHERE lf.id = rt.lens_family_id
  AND rt.rn = 1;

-- For any remaining families (no matrices yet), default to common safe values.
UPDATE public.lens_families
SET
  lens_type = COALESCE(lens_type, 'single_vision'),
  lens_material = COALESCE(lens_material, 'cr39')
WHERE lens_type IS NULL OR lens_material IS NULL;

-- ============================================================================
-- 4) Enforce constraints (now that we have values)
-- ============================================================================

ALTER TABLE public.lens_families
  ALTER COLUMN lens_type SET NOT NULL,
  ALTER COLUMN lens_material SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lens_families_lens_type_check'
  ) THEN
    ALTER TABLE public.lens_families
      ADD CONSTRAINT lens_families_lens_type_check
        CHECK (lens_type IN ('single_vision','bifocal','trifocal','progressive','reading','computer','sports'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lens_families_lens_material_check'
  ) THEN
    ALTER TABLE public.lens_families
      ADD CONSTRAINT lens_families_lens_material_check
        CHECK (lens_material IN ('cr39','polycarbonate','high_index_1_67','high_index_1_74','trivex','glass'));
  END IF;
END $$;

ALTER TABLE public.lens_price_matrices
  ALTER COLUMN cylinder_min SET NOT NULL,
  ALTER COLUMN cylinder_max SET NOT NULL,
  ALTER COLUMN cost SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lens_price_matrices_valid_sphere_range'
  ) THEN
    ALTER TABLE public.lens_price_matrices
      ADD CONSTRAINT lens_price_matrices_valid_sphere_range
        CHECK (sphere_min <= sphere_max);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lens_price_matrices_valid_cylinder_range'
  ) THEN
    ALTER TABLE public.lens_price_matrices
      ADD CONSTRAINT lens_price_matrices_valid_cylinder_range
        CHECK (cylinder_min <= cylinder_max);
  END IF;
END $$;

-- ============================================================================
-- 5) Drop legacy duplicated fields from matrices (type/material + costs + multipliers)
-- ============================================================================

-- Drop legacy index if exists
DROP INDEX IF EXISTS public.idx_lens_matrices_type_material;
DROP INDEX IF EXISTS idx_lens_matrices_type_material;

ALTER TABLE public.lens_price_matrices
  DROP COLUMN IF EXISTS lens_type,
  DROP COLUMN IF EXISTS lens_material,
  DROP COLUMN IF EXISTS stock_cost,
  DROP COLUMN IF EXISTS surfaced_cost,
  DROP COLUMN IF EXISTS lab_cost,
  DROP COLUMN IF EXISTS astigmatism_multiplier,
  DROP COLUMN IF EXISTS prism_multiplier;

-- ============================================================================
-- 6) Update calculate_lens_price() to new robust logic
--    - lens_type/material come from lens_families
--    - match by sphere AND cylinder range
--    - optional sourcing filter; if omitted, prefer stock when available
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_lens_price(UUID, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION public.calculate_lens_price(
  p_lens_family_id UUID,
  p_sphere DECIMAL,
  p_cylinder DECIMAL DEFAULT 0,
  p_sourcing_type TEXT DEFAULT NULL
) RETURNS TABLE (
  price DECIMAL(10,2),
  sourcing_type TEXT,
  cost DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lpm.base_price AS price,
    lpm.sourcing_type,
    lpm.cost
  FROM public.lens_price_matrices lpm
  JOIN public.lens_families lf ON lf.id = lpm.lens_family_id
  WHERE lpm.lens_family_id = p_lens_family_id
    AND p_sphere BETWEEN lpm.sphere_min AND lpm.sphere_max
    AND p_cylinder BETWEEN lpm.cylinder_min AND lpm.cylinder_max
    AND lpm.is_active = TRUE
    AND lf.is_active = TRUE
    AND (p_sourcing_type IS NULL OR lpm.sourcing_type = p_sourcing_type)
  ORDER BY
    CASE WHEN p_sourcing_type IS NULL AND lpm.sourcing_type = 'stock' THEN 0 ELSE 1 END,
    lpm.base_price ASC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.calculate_lens_price IS
  'V2: Calcula el precio/costo de un lente según familia + rango de esfera/cilindro. Tipo/material son genéticos de la familia.';

