-- Consolidated Migration: lens_systems
-- Generated: Sun, Feb  8, 2026 12:53:57 AM
-- Original files: 2

-- === Source: 20260129000000_create_lens_families_and_matrices.sql ===
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

-- === End of 20260129000000_create_lens_families_and_matrices.sql ===

-- === Source: 20260131000005_create_contact_lenses_system.sql ===
-- ============================================================================
-- Migration: Create Contact Lenses System
-- Phase: Contact Lenses Integration
-- Description: Sistema completo para gestión de lentes de contacto
-- ============================================================================

-- ===== CREATE CONTACT_LENS_FAMILIES TABLE =====
CREATE TABLE IF NOT EXISTS public.contact_lens_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información comercial
  name TEXT NOT NULL,                     -- "Acuvue Oasys", "Air Optix Aqua"
  brand TEXT,                             -- "Johnson & Johnson", "Alcon", "Bausch + Lomb"
  description TEXT,                       -- Descripción opcional
  
  -- Características de Lentes de Contacto
  use_type TEXT NOT NULL CHECK (use_type IN (
    'daily',           -- Uso diario (desechable)
    'bi_weekly',       -- Quincenal
    'monthly',         -- Mensual
    'extended_wear'    -- Uso prolongado (menos común hoy)
  )),
  
  modality TEXT NOT NULL CHECK (modality IN (
    'spherical',       -- Esférico (monofocal)
    'toric',           -- Tórico (para astigmatismo)
    'multifocal',      -- Multifocal (para presbicia)
    'cosmetic'         -- Cosmético (color)
  )),
  
  material TEXT CHECK (material IN (
    'silicone_hydrogel',  -- Hidrogel de silicona (más transpirable)
    'hydrogel',           -- Hidrogel tradicional
    'rigid_gas_permeable' -- RGP (menos común)
  )),
  
  packaging TEXT NOT NULL CHECK (packaging IN (
    'box_30',          -- Caja de 30 lentes (común para diario)
    'box_6',           -- Caja de 6 lentes (común para quincenal/mensual)
    'box_3',           -- Caja de 3 lentes
    'bottle'           -- Envase de botella (para lentes de uso anual, menos común)
  )),
  
  -- Parámetros Fijos (si aplica, a menudo varían por matriz/modelo)
  base_curve DECIMAL(4,2),                 -- Curva Base (ej: 8.4, 8.6)
  diameter DECIMAL(4,2),                   -- Diámetro (ej: 14.0, 14.2)
  
  -- Multi-tenancy
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Control de estado
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE CONTACT_LENS_PRICE_MATRICES TABLE =====
CREATE TABLE IF NOT EXISTS public.contact_lens_price_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contact_lens_family_id UUID REFERENCES public.contact_lens_families(id) ON DELETE CASCADE NOT NULL,
  
  -- Rangos de parámetros de Lentes de Contacto
  sphere_min DECIMAL(5,2) NOT NULL,
  sphere_max DECIMAL(5,2) NOT NULL,
  
  cylinder_min DECIMAL(5,2) DEFAULT 0,  -- 0 para esféricos
  cylinder_max DECIMAL(5,2) DEFAULT 0,
  
  axis_min INTEGER DEFAULT 0,           -- Eje para lentes tóricos (0-180)
  axis_max INTEGER DEFAULT 180,
  
  addition_min DECIMAL(5,2) DEFAULT 0,  -- Adición para multifocales
  addition_max DECIMAL(5,2) DEFAULT 4.0,
  
  -- Precios y costos (por caja, no por lente individual)
  base_price DECIMAL(10,2) NOT NULL,      -- Precio de venta de la caja
  cost DECIMAL(10,2) NOT NULL,            -- Costo de la caja
  
  -- Multi-tenancy
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Control de estado
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints de validación
  CONSTRAINT valid_cl_sphere_range CHECK (sphere_min <= sphere_max),
  CONSTRAINT valid_cl_cylinder_range CHECK (cylinder_min <= cylinder_max),
  CONSTRAINT valid_cl_axis_range CHECK (axis_min >= 0 AND axis_max <= 180 AND axis_min <= axis_max),
  CONSTRAINT valid_cl_addition_range CHECK (addition_min <= addition_max)
);

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_contact_lens_families_org ON public.contact_lens_families(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_families_active ON public.contact_lens_families(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_lens_families_use_type ON public.contact_lens_families(use_type);
CREATE INDEX IF NOT EXISTS idx_contact_lens_families_modality ON public.contact_lens_families(modality);

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_family ON public.contact_lens_price_matrices(contact_lens_family_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_org ON public.contact_lens_price_matrices(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_active ON public.contact_lens_price_matrices(is_active);

-- Índices GIST para búsqueda rápida de rangos
CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_sphere_range ON public.contact_lens_price_matrices USING GIST (
  numrange(sphere_min::numeric, sphere_max::numeric, '[]')
);

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_cylinder_range ON public.contact_lens_price_matrices USING GIST (
  numrange(cylinder_min::numeric, cylinder_max::numeric, '[]')
);

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_addition_range ON public.contact_lens_price_matrices USING GIST (
  numrange(addition_min::numeric, addition_max::numeric, '[]')
);

-- ===== CREATE TRIGGERS FOR UPDATED_AT =====
CREATE TRIGGER update_contact_lens_families_updated_at
  BEFORE UPDATE ON public.contact_lens_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_lens_price_matrices_updated_at
  BEFORE UPDATE ON public.contact_lens_price_matrices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== CREATE FUNCTION TO CALCULATE CONTACT LENS PRICE =====
CREATE OR REPLACE FUNCTION public.calculate_contact_lens_price(
  p_contact_lens_family_id UUID,
  p_sphere DECIMAL,
  p_cylinder DECIMAL DEFAULT 0,
  p_axis INTEGER DEFAULT NULL,
  p_addition DECIMAL DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
) RETURNS TABLE (
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  base_curve DECIMAL(4,2),
  diameter DECIMAL(4,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    clpm.base_price AS price,
    clpm.cost,
    clf.base_curve,
    clf.diameter
  FROM public.contact_lens_price_matrices clpm
  JOIN public.contact_lens_families clf ON clf.id = clpm.contact_lens_family_id
  WHERE clpm.contact_lens_family_id = p_contact_lens_family_id
    AND (p_organization_id IS NULL OR clpm.organization_id = p_organization_id)
    AND p_sphere BETWEEN clpm.sphere_min AND clpm.sphere_max
    AND p_cylinder BETWEEN clpm.cylinder_min AND clpm.cylinder_max
    AND (p_axis IS NULL OR (p_axis BETWEEN clpm.axis_min AND clpm.axis_max))
    AND (p_addition IS NULL OR (p_addition BETWEEN clpm.addition_min AND clpm.addition_max))
    AND clpm.is_active = TRUE
    AND clf.is_active = TRUE
  ORDER BY
    clpm.base_price ASC -- O alguna otra lógica si hay solapamiento (ej. más específico gana)
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.calculate_contact_lens_price IS 'Calcula el precio de un lente de contacto basado en la familia y parámetros de la receta';

-- ===== ROW LEVEL SECURITY (RLS) =====
ALTER TABLE public.contact_lens_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lens_price_matrices ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo ven lentes de contacto de su organización
CREATE POLICY "Users can view contact lens families for their org"
ON public.contact_lens_families FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    AND (
      role = 'super_admin'
      OR organization_id = (
        SELECT organization_id FROM public.admin_users
        WHERE id = auth.uid() AND is_active = true
        LIMIT 1
      )
    )
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Admins can manage contact lens families for their org"
ON public.contact_lens_families FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    AND (
      role = 'super_admin'
      OR organization_id = (
        SELECT organization_id FROM public.admin_users
        WHERE id = auth.uid() AND is_active = true
        LIMIT 1
      )
    )
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    AND (
      role = 'super_admin'
      OR organization_id = (
        SELECT organization_id FROM public.admin_users
        WHERE id = auth.uid() AND is_active = true
        LIMIT 1
      )
    )
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Users can view contact lens price matrices for their org"
ON public.contact_lens_price_matrices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    AND (
      role = 'super_admin'
      OR organization_id = (
        SELECT organization_id FROM public.admin_users
        WHERE id = auth.uid() AND is_active = true
        LIMIT 1
      )
    )
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

CREATE POLICY "Admins can manage contact lens price matrices for their org"
ON public.contact_lens_price_matrices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    AND (
      role = 'super_admin'
      OR organization_id = (
        SELECT organization_id FROM public.admin_users
        WHERE id = auth.uid() AND is_active = true
        LIMIT 1
      )
    )
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    AND (
      role = 'super_admin'
      OR organization_id = (
        SELECT organization_id FROM public.admin_users
        WHERE id = auth.uid() AND is_active = true
        LIMIT 1
      )
    )
  )
  OR
  organization_id = public.get_user_organization_id()
  OR
  organization_id IS NULL
);

-- ===== COMMENTS =====
COMMENT ON TABLE public.contact_lens_families IS 'Familias de lentes de contacto con características genéticas';
COMMENT ON TABLE public.contact_lens_price_matrices IS 'Matrices de precios para lentes de contacto por rangos de parámetros';
COMMENT ON COLUMN public.contact_lens_families.use_type IS 'Frecuencia de reemplazo: diario, quincenal, mensual, uso prolongado';
COMMENT ON COLUMN public.contact_lens_families.modality IS 'Tipo de corrección: esférico, tórico (astigmatismo), multifocal (presbicia), cosmético';
COMMENT ON COLUMN public.contact_lens_families.packaging IS 'Formato de venta: caja de 30, 6, 3 lentes, o botella';
COMMENT ON COLUMN public.contact_lens_price_matrices.base_price IS 'Precio de venta por caja (no por lente individual)';
COMMENT ON COLUMN public.contact_lens_price_matrices.cost IS 'Costo de compra por caja';

-- === End of 20260131000005_create_contact_lenses_system.sql ===

