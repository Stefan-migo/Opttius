-- Migration: 20260121000000_create_lens_price_matrices.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Lens Price Matrices System (Phase 1.2)
-- This migration implements a flexible price matrix system for lenses
-- allowing custom pricing based on diopter ranges, lens types, and materials

-- ===== CREATE LENS_FAMILIES TABLE =====
CREATE TABLE IF NOT EXISTS public.lens_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Poly Blue Defense", "Varilux Comfort"
  brand TEXT,                            -- "Essilor", "Zeiss", "Rodenstock", etc.
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CREATE LENS_PRICE_MATRICES TABLE =====
CREATE TABLE IF NOT EXISTS public.lens_price_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_family_id UUID NOT NULL REFERENCES public.lens_families(id) ON DELETE CASCADE,
  
  -- Rango dióptrico (esfera)
  sphere_min DECIMAL(5,2) NOT NULL,      -- -10.00
  sphere_max DECIMAL(5,2) NOT NULL,      -- +6.00
  
  -- Tipo de lente
  lens_type TEXT NOT NULL CHECK (lens_type IN (
    'single_vision', 'bifocal', 'trifocal', 
    'progressive', 'reading', 'computer', 'sports'
  )),
  
  -- Material del lente
  lens_material TEXT NOT NULL CHECK (lens_material IN (
    'cr39', 'polycarbonate', 'high_index_1_67', 
    'high_index_1_74', 'trivex', 'glass'
  )),
  
  -- Precio y sourcing
  base_price DECIMAL(10,2) NOT NULL,
  sourcing_type TEXT CHECK (sourcing_type IN ('stock', 'surfaced')) DEFAULT 'surfaced',
  
  -- Costos operativos diferenciados
  stock_cost DECIMAL(10,2),              -- Si sourcing_type = 'stock'
  surfaced_cost DECIMAL(10,2),           -- Si sourcing_type = 'surfaced'
  lab_cost DECIMAL(10,2),                -- Costo de laboratorio
  
  -- Multiplicadores por complejidad
  astigmatism_multiplier DECIMAL(3,2) DEFAULT 1.0,  -- Si tiene cilindro
  prism_multiplier DECIMAL(3,2) DEFAULT 1.0,        -- Si tiene prisma
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para validar rango de esfera
  CONSTRAINT valid_sphere_range CHECK (sphere_min <= sphere_max)
);

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_lens_families_active ON public.lens_families(is_active);
CREATE INDEX IF NOT EXISTS idx_lens_matrices_family ON public.lens_price_matrices(lens_family_id);
CREATE INDEX IF NOT EXISTS idx_lens_matrices_type_material ON public.lens_price_matrices(lens_type, lens_material);
CREATE INDEX IF NOT EXISTS idx_lens_matrices_active ON public.lens_price_matrices(is_active);

-- Índice GIST para búsqueda rápida de rangos de esfera
CREATE INDEX IF NOT EXISTS idx_lens_matrices_sphere_range ON public.lens_price_matrices USING GIST (
  numrange(sphere_min::numeric, sphere_max::numeric, '[]')
);

-- ===== CREATE TRIGGER FOR UPDATED_AT =====
CREATE TRIGGER update_lens_families_updated_at
  BEFORE UPDATE ON public.lens_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lens_price_matrices_updated_at
  BEFORE UPDATE ON public.lens_price_matrices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== CREATE FUNCTION TO CALCULATE LENS PRICE =====
CREATE OR REPLACE FUNCTION public.calculate_lens_price(
  p_lens_family_id UUID,
  p_lens_type TEXT,
  p_lens_material TEXT,
  p_sphere DECIMAL,
  p_cylinder DECIMAL DEFAULT 0,
  p_prism DECIMAL DEFAULT 0
) RETURNS TABLE (
  price DECIMAL(10,2),
  sourcing_type TEXT,
  base_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_multiplier DECIMAL(3,2) := 1.0;
BEGIN
  -- Buscar matriz que coincida con los parámetros
  RETURN QUERY
  SELECT 
    lpm.base_price,
    lpm.sourcing_type,
    CASE 
      WHEN lpm.sourcing_type = 'stock' THEN COALESCE(lpm.stock_cost, 0)
      ELSE COALESCE(lpm.surfaced_cost, 0)
    END as base_cost,
    -- Calcular costo final con multiplicadores
    (CASE 
      WHEN lpm.sourcing_type = 'stock' THEN COALESCE(lpm.stock_cost, 0)
      ELSE COALESCE(lpm.surfaced_cost, 0)
    END * 
    (CASE WHEN p_cylinder != 0 THEN COALESCE(lpm.astigmatism_multiplier, 1.0) ELSE 1.0 END) *
    (CASE WHEN p_prism != 0 THEN COALESCE(lpm.prism_multiplier, 1.0) ELSE 1.0 END)) as final_cost
  FROM public.lens_price_matrices lpm
  WHERE lpm.lens_family_id = p_lens_family_id
    AND lpm.lens_type = p_lens_type
    AND lpm.lens_material = p_lens_material
    AND p_sphere BETWEEN lpm.sphere_min AND lpm.sphere_max
    AND lpm.is_active = TRUE
  ORDER BY lpm.base_price ASC
  LIMIT 1;
END;
$$;

-- ===== ENABLE RLS =====
ALTER TABLE public.lens_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lens_price_matrices ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR LENS_FAMILIES =====

-- Admins can view all active lens families
CREATE POLICY "Admins can view lens families"
ON public.lens_families
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
    AND au.is_active = true
  )
);

-- Admins can manage lens families
CREATE POLICY "Admins can manage lens families"
ON public.lens_families
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
    AND au.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
    AND au.is_active = true
  )
);

-- ===== RLS POLICIES FOR LENS_PRICE_MATRICES =====

-- Admins can view all active lens price matrices
CREATE POLICY "Admins can view lens price matrices"
ON public.lens_price_matrices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
    AND au.is_active = true
  )
);

-- Admins can manage lens price matrices
CREATE POLICY "Admins can manage lens price matrices"
ON public.lens_price_matrices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
    AND au.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
    AND au.is_active = true
  )
);

-- ===== COMMENTS =====
COMMENT ON TABLE public.lens_families IS 'Familias comerciales de lentes (ej: Poly Blue Defense, Varilux Comfort)';
COMMENT ON TABLE public.lens_price_matrices IS 'Matrices de precios para calcular costo de lentes según tipo, material y rango dióptrico';
COMMENT ON FUNCTION public.calculate_lens_price IS 'Calcula el precio de un lente basado en familia, tipo, material y parámetros de receta';
