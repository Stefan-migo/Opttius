-- Migration: 20260401000002_add_fallback_matrices.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add fallback matrix to each lens family and contact lens family
-- Fallback ensures every prescription gets a price (avoids 404)
-- Ranges: Optical Esf -20 to +20, Cil -8 to 0 | Contact Esf -20 to +20, Cil -6 to 0

-- ============================================================================
-- 1) Optical lens families: add fallback to each family with matrices
-- ============================================================================

INSERT INTO public.lens_price_matrices (
  lens_family_id,
  name,
  sphere_min,
  sphere_max,
  cylinder_min,
  cylinder_max,
  addition_min,
  addition_max,
  base_price,
  cost,
  sourcing_type,
  is_active
)
SELECT
  lf.id,
  'Fallback',
  -20.00,
  20.00,
  -8.00,
  0.00,
  0.00,
  4.00,
  GREATEST(COALESCE(m.max_price, 0) * 1.5, 99999),
  GREATEST(COALESCE(m.max_cost, 0) * 1.5, 49999),
  'surfaced',
  true
FROM public.lens_families lf
JOIN (
  SELECT
    lens_family_id,
    MAX(base_price) AS max_price,
    MAX(cost) AS max_cost
  FROM public.lens_price_matrices
  GROUP BY lens_family_id
) m ON m.lens_family_id = lf.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.lens_price_matrices lpm
  WHERE lpm.lens_family_id = lf.id
    AND lpm.sphere_min <= -20
    AND lpm.sphere_max >= 20
    AND lpm.cylinder_min <= -8
    AND lpm.cylinder_max >= 0
);

-- ============================================================================
-- 2) Contact lens families: add fallback to each family with matrices
-- ============================================================================

INSERT INTO public.contact_lens_price_matrices (
  contact_lens_family_id,
  organization_id,
  name,
  sphere_min,
  sphere_max,
  cylinder_min,
  cylinder_max,
  axis_min,
  axis_max,
  addition_min,
  addition_max,
  base_price,
  cost,
  is_active
)
SELECT
  clf.id,
  clf.organization_id,
  'Fallback',
  -20.00,
  20.00,
  -6.00,
  0.00,
  0,
  180,
  0.00,
  4.00,
  GREATEST(COALESCE(m.max_price, 0) * 1.5, 99999),
  GREATEST(COALESCE(m.max_cost, 0) * 1.5, 49999),
  true
FROM public.contact_lens_families clf
JOIN (
  SELECT
    contact_lens_family_id,
    MAX(base_price) AS max_price,
    MAX(cost) AS max_cost
  FROM public.contact_lens_price_matrices
  GROUP BY contact_lens_family_id
) m ON m.contact_lens_family_id = clf.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_lens_price_matrices clpm
  WHERE clpm.contact_lens_family_id = clf.id
    AND clpm.sphere_min <= -20
    AND clpm.sphere_max >= 20
    AND clpm.cylinder_min <= -6
    AND clpm.cylinder_max >= 0
);
