-- Migration: 20260125000000_add_addition_support_to_lens_matrices.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add Addition Support to Lens Price Matrices
-- Goal: Support presbyopia by adding addition ranges to price matrices
-- This allows pricing progressive, bifocal, and trifocal lenses correctly

-- ============================================================================
-- 1) Add addition range columns to lens_price_matrices
-- ============================================================================

ALTER TABLE public.lens_price_matrices
  ADD COLUMN IF NOT EXISTS addition_min DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addition_max DECIMAL(5,2) DEFAULT 4.0;

-- Backfill: For single_vision lenses, addition should be 0
-- For progressive/bifocal/trifocal, allow full range (0-4.0)
UPDATE public.lens_price_matrices lpm
SET
  addition_min = 0,
  addition_max = 4.0
WHERE addition_min IS NULL OR addition_max IS NULL;

-- For single_vision families, restrict addition to 0
UPDATE public.lens_price_matrices lpm
SET
  addition_min = 0,
  addition_max = 0
FROM public.lens_families lf
WHERE lpm.lens_family_id = lf.id
  AND lf.lens_type = 'single_vision'
  AND (lpm.addition_min IS NULL OR lpm.addition_max IS NULL OR lpm.addition_max > 0);

-- ============================================================================
-- 2) Update calculate_lens_price function to accept addition parameter
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_lens_price(UUID, DECIMAL, DECIMAL, TEXT);

CREATE OR REPLACE FUNCTION public.calculate_lens_price(
  p_lens_family_id UUID,
  p_sphere DECIMAL,
  p_cylinder DECIMAL DEFAULT 0,
  p_addition DECIMAL DEFAULT NULL,
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
    AND (
      p_addition IS NULL 
      OR (p_addition BETWEEN lpm.addition_min AND lpm.addition_max)
    )
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
  'V3: Calcula el precio/costo de un lente según familia + rango de esfera/cilindro/adición. Tipo/material son genéticos de la familia.';

-- ============================================================================
-- 3) Add indexes for better query performance with addition
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lens_matrices_addition_range 
ON public.lens_price_matrices USING GIST (
  numrange(addition_min::numeric, addition_max::numeric, '[]')
);

-- ============================================================================
-- 4) Add presbyopia solution fields to quotes
-- ============================================================================

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS presbyopia_solution TEXT CHECK (presbyopia_solution IN (
    'none', 'two_separate', 'bifocal', 'trifocal', 'progressive'
  )) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS far_lens_family_id UUID REFERENCES public.lens_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS near_lens_family_id UUID REFERENCES public.lens_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS far_lens_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS near_lens_cost DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_quotes_presbyopia_solution ON public.quotes(presbyopia_solution);
CREATE INDEX IF NOT EXISTS idx_quotes_far_lens_family_id ON public.quotes(far_lens_family_id);
CREATE INDEX IF NOT EXISTS idx_quotes_near_lens_family_id ON public.quotes(near_lens_family_id);

COMMENT ON COLUMN public.quotes.presbyopia_solution IS 'Solución para presbicia: none, two_separate, bifocal, trifocal, progressive';
COMMENT ON COLUMN public.quotes.far_lens_family_id IS 'Familia de lentes para visión lejana (cuando presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.quotes.near_lens_family_id IS 'Familia de lentes para visión cercana (cuando presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.quotes.far_lens_cost IS 'Costo del lente de lejos (cuando presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.quotes.near_lens_cost IS 'Costo del lente de cerca (cuando presbyopia_solution = two_separate)';

-- ============================================================================
-- 5) Add presbyopia solution fields to lab_work_orders
-- ============================================================================

ALTER TABLE public.lab_work_orders
  ADD COLUMN IF NOT EXISTS presbyopia_solution TEXT CHECK (presbyopia_solution IN (
    'none', 'two_separate', 'bifocal', 'trifocal', 'progressive'
  )) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS far_lens_family_id UUID REFERENCES public.lens_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS near_lens_family_id UUID REFERENCES public.lens_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS far_lens_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS near_lens_cost DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_presbyopia_solution ON public.lab_work_orders(presbyopia_solution);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_far_lens_family_id ON public.lab_work_orders(far_lens_family_id);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_near_lens_family_id ON public.lab_work_orders(near_lens_family_id);

COMMENT ON COLUMN public.lab_work_orders.presbyopia_solution IS 'Solución para presbicia: none, two_separate, bifocal, trifocal, progressive';
COMMENT ON COLUMN public.lab_work_orders.far_lens_family_id IS 'Familia de lentes para visión lejana (cuando presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.lab_work_orders.near_lens_family_id IS 'Familia de lentes para visión cercana (cuando presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.lab_work_orders.far_lens_cost IS 'Costo del lente de lejos (cuando presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.lab_work_orders.near_lens_cost IS 'Costo del lente de cerca (cuando presbyopia_solution = two_separate)';
