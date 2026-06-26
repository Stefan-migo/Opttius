-- Migration: 20260129000000_create_lens_families_and_matrices.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Lens Families and Price Matrices Tables
-- This migration creates the tables for managing lens families and their price matrices
-- Based on the schema defined in docs/PlanDeRefraccionSecciones.md

-- ===== CREATE LENS_FAMILIES TABLE =====
CREATE TABLE IF NOT EXISTS public.lens_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  lens_type TEXT NOT NULL CHECK (lens_type IN (
    'single_vision','bifocal','trifocal','progressive','reading','computer','sports'
  )),
  lens_material TEXT NOT NULL CHECK (lens_material IN (
    'cr39','polycarbonate','high_index_1_67','high_index_1_74','trivex','glass'
  )),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CREATE LENS_PRICE_MATRICES TABLE =====
CREATE TABLE IF NOT EXISTS public.lens_price_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_family_id UUID REFERENCES public.lens_families(id) ON DELETE CASCADE NOT NULL,
  sphere_min DECIMAL(5,2) NOT NULL,
  sphere_max DECIMAL(5,2) NOT NULL,
  cylinder_min DECIMAL(5,2) NOT NULL,
  cylinder_max DECIMAL(5,2) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  sourcing_type TEXT CHECK (sourcing_type IN ('stock','surfaced')) DEFAULT 'surfaced',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_sphere_range CHECK (sphere_min <= sphere_max),
  CONSTRAINT valid_cylinder_range CHECK (cylinder_min <= cylinder_max)
);

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_lens_matrices_family ON public.lens_price_matrices(lens_family_id);
CREATE INDEX IF NOT EXISTS idx_lens_matrices_sphere_range ON public.lens_price_matrices USING GIST (
  numrange(sphere_min::numeric, sphere_max::numeric, '[]')
);
CREATE INDEX IF NOT EXISTS idx_lens_matrices_cylinder_range ON public.lens_price_matrices USING GIST (
  numrange(cylinder_min::numeric, cylinder_max::numeric, '[]')
);
CREATE INDEX IF NOT EXISTS idx_lens_families_active ON public.lens_families(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_lens_families_type_material ON public.lens_families(lens_type, lens_material);

-- ===== CREATE FUNCTION TO CALCULATE LENS PRICE =====
CREATE OR REPLACE FUNCTION public.calculate_lens_price(
  p_lens_family_id UUID,
  p_sphere DECIMAL,
  p_cylinder DECIMAL DEFAULT 0,
  p_sourcing_type TEXT DEFAULT NULL
) RETURNS TABLE (
  price DECIMAL(10,2),
  sourcing_type TEXT,
  cost DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lpm.base_price,
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
$$ LANGUAGE plpgsql;

-- ===== CREATE TRIGGER FOR UPDATED_AT =====
-- Function should already exist, but we'll create it if it doesn't
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lens_families_updated_at ON public.lens_families;
CREATE TRIGGER update_lens_families_updated_at
  BEFORE UPDATE ON public.lens_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lens_price_matrices_updated_at ON public.lens_price_matrices;
CREATE TRIGGER update_lens_price_matrices_updated_at
  BEFORE UPDATE ON public.lens_price_matrices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE RLS =====
ALTER TABLE public.lens_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lens_price_matrices ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR LENS_FAMILIES =====
-- Admins can view all lens families
DROP POLICY IF EXISTS "Admins can view lens families" ON public.lens_families;
CREATE POLICY "Admins can view lens families"
ON public.lens_families
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- Admins can insert lens families
DROP POLICY IF EXISTS "Admins can insert lens families" ON public.lens_families;
CREATE POLICY "Admins can insert lens families"
ON public.lens_families
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- Admins can update lens families
DROP POLICY IF EXISTS "Admins can update lens families" ON public.lens_families;
CREATE POLICY "Admins can update lens families"
ON public.lens_families
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- Admins can delete lens families (soft delete via is_active)
DROP POLICY IF EXISTS "Admins can delete lens families" ON public.lens_families;
CREATE POLICY "Admins can delete lens families"
ON public.lens_families
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- ===== RLS POLICIES FOR LENS_PRICE_MATRICES =====
-- Admins can view all price matrices
DROP POLICY IF EXISTS "Admins can view lens price matrices" ON public.lens_price_matrices;
CREATE POLICY "Admins can view lens price matrices"
ON public.lens_price_matrices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- Admins can insert price matrices
DROP POLICY IF EXISTS "Admins can insert lens price matrices" ON public.lens_price_matrices;
CREATE POLICY "Admins can insert lens price matrices"
ON public.lens_price_matrices
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- Admins can update price matrices
DROP POLICY IF EXISTS "Admins can update lens price matrices" ON public.lens_price_matrices;
CREATE POLICY "Admins can update lens price matrices"
ON public.lens_price_matrices
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- Admins can delete price matrices
DROP POLICY IF EXISTS "Admins can delete lens price matrices" ON public.lens_price_matrices;
CREATE POLICY "Admins can delete lens price matrices"
ON public.lens_price_matrices
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = TRUE
  )
);

-- ===== COMMENTS =====
COMMENT ON TABLE public.lens_families IS 'Familias de lentes ópticos definidas por tipo y material';
COMMENT ON TABLE public.lens_price_matrices IS 'Matrices de precios para familias de lentes según rangos de esfera y cilindro';
-- Comment removed - function signature varies across migrations, comment is set in earlier migration
COMMENT ON COLUMN public.lens_families.lens_type IS 'Tipo de lente: single_vision, bifocal, trifocal, progressive, reading, computer, sports';
COMMENT ON COLUMN public.lens_families.lens_material IS 'Material del lente: cr39, polycarbonate, high_index_1_67, high_index_1_74, trivex, glass';
COMMENT ON COLUMN public.lens_price_matrices.sourcing_type IS 'Tipo de sourcing: stock (en inventario) o surfaced (surfaced a pedido)';
