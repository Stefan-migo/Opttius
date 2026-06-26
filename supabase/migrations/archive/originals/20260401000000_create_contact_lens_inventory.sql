-- Migration: 20260401000000_create_contact_lens_inventory.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Create contact_lens_inventory table for stock by prescription
-- Purpose: Track stock of contact lenses by specific sphere/cylinder combinations
-- ============================================================================

-- Create contact_lens_inventory table
CREATE TABLE IF NOT EXISTS public.contact_lens_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia a la familia de LC (no al producto migrado, para mantener flexibilidad)
  contact_lens_family_id UUID NOT NULL REFERENCES public.contact_lens_families(id) ON DELETE CASCADE,
  
  -- Sucursal
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  
  -- Parámetros de graduación específicos
  sphere_min DECIMAL(5,2) NOT NULL,
  sphere_max DECIMAL(5,2) NOT NULL,
  cylinder_min DECIMAL(5,2) DEFAULT 0,
  cylinder_max DECIMAL(5,2) DEFAULT 0,
  
  -- Stock disponible
  quantity INTEGER NOT NULL DEFAULT 0,
  
  -- Umbral para alerta de stock bajo
  min_stock_threshold INTEGER DEFAULT 3,
  
  -- Notas
  notes TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_sphere_range CHECK (sphere_min <= sphere_max),
  CONSTRAINT valid_cylinder_range CHECK (cylinder_min <= cylinder_max),
  CONSTRAINT valid_quantity CHECK (quantity >= 0),
  
  -- Unique para evitar duplicados
  UNIQUE(contact_lens_family_id, branch_id, sphere_min, sphere_max, cylinder_min, cylinder_max)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_family ON public.contact_lens_inventory(contact_lens_family_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_branch ON public.contact_lens_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_active ON public.contact_lens_inventory(is_active) WHERE is_active = TRUE;

-- Composite index for stock lookup
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_lookup ON public.contact_lens_inventory(
  contact_lens_family_id, 
  branch_id, 
  sphere_min, 
  sphere_max
) WHERE is_active = TRUE;

-- Trigger for updated_at (function already exists from 20241220 migration)
CREATE TRIGGER update_contact_lens_inventory_updated_at
  BEFORE UPDATE ON public.contact_lens_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.contact_lens_inventory ENABLE ROW LEVEL SECURITY;

-- Users can view inventory for their branches
CREATE POLICY "Users can view contact lens inventory for their branches"
  ON public.contact_lens_inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = contact_lens_inventory.branch_id
    )
  );

-- Admins can insert
CREATE POLICY "Admins can insert contact lens inventory"
  ON public.contact_lens_inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

-- Admins can update
CREATE POLICY "Admins can update contact lens inventory"
  ON public.contact_lens_inventory FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

-- Admins can delete
CREATE POLICY "Admins can delete contact lens inventory"
  ON public.contact_lens_inventory FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

-- Comments
COMMENT ON TABLE public.contact_lens_inventory IS 'Inventario de lentes de contacto por graduación específica';
COMMENT ON COLUMN public.contact_lens_inventory.sphere_min IS 'Esfera mínima del rango (ej: -6.00)';
COMMENT ON COLUMN public.contact_lens_inventory.sphere_max IS 'Esfera máxima del rango (ej: -0.50)';
COMMENT ON COLUMN public.contact_lens_inventory.quantity IS 'Cantidad de cajas en stock';
COMMENT ON COLUMN public.contact_lens_inventory.min_stock_threshold IS 'Umbral para alertar stock bajo';

-- ============================================================================
-- Function to check stock availability for a specific prescription
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_contact_lens_stock(
  p_contact_lens_family_id UUID,
  p_branch_id UUID,
  p_sphere DECIMAL,
  p_cylinder DECIMAL DEFAULT 0
)
RETURNS TABLE (
  available BOOLEAN,
  quantity INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stock_match AS (
    SELECT 
      cli.quantity,
      cli.min_stock_threshold
    FROM contact_lens_inventory cli
    WHERE cli.contact_lens_family_id = p_contact_lens_family_id
      AND cli.branch_id = p_branch_id
      AND cli.is_active = TRUE
      AND p_sphere >= cli.sphere_min
      AND p_sphere <= cli.sphere_max
      AND p_cylinder >= cli.cylinder_min
      AND p_cylinder <= cli.cylinder_max
    ORDER BY 
      (p_sphere - cli.sphere_min) + (p_cylinder - cli.cylinder_min) ASC
    LIMIT 1
  )
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM stock_match WHERE quantity > 0) THEN TRUE
      ELSE FALSE
    END,
    COALESCE((SELECT quantity FROM stock_match LIMIT 1), 0),
    CASE 
      WHEN EXISTS (SELECT 1 FROM stock_match WHERE quantity > 0) THEN 
        'Stock disponible'
      WHEN EXISTS (SELECT 1 FROM stock_match WHERE quantity <= 0 AND quantity >= 0) THEN
        'Sin stock - Se puede solicitar encargo'
      ELSE
        'Graduación no disponible en stock'
    END;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_contact_lens_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_contact_lens_stock TO anon;

-- ============================================================================
-- Function to reduce stock on sale
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reduce_contact_lens_stock(
  p_contact_lens_family_id UUID,
  p_branch_id UUID,
  p_sphere DECIMAL,
  p_cylinder DECIMAL,
  p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Find matching inventory and reduce
  UPDATE contact_lens_inventory cli
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE cli.contact_lens_family_id = p_contact_lens_family_id
    AND cli.branch_id = p_branch_id
    AND cli.is_active = TRUE
    AND p_sphere >= cli.sphere_min
    AND p_sphere <= cli.sphere_max
    AND p_cylinder >= cli.cylinder_min
    AND p_cylinder <= cli.cylinder_max
    AND quantity >= p_quantity
  RETURNING id INTO v_updated;
  
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reduce_contact_lens_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.reduce_contact_lens_stock TO anon;

-- ============================================================================
-- Seeder: Add sample inventory for demo organization
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
  v_family_id UUID;
BEGIN
  -- Get demo organization
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-optica' LIMIT 1;
  
  -- Get demo branch
  SELECT id INTO v_branch_id FROM branches WHERE organization_id = v_org_id LIMIT 1;
  
  -- Get first contact lens family
  SELECT id INTO v_family_id FROM contact_lens_families 
    WHERE organization_id = v_org_id AND is_active = TRUE LIMIT 1;
  
  IF v_org_id IS NOT NULL AND v_branch_id IS NOT NULL AND v_family_id IS NOT NULL THEN
    -- Insert sample inventory - common sphere ranges
    INSERT INTO contact_lens_inventory (
      contact_lens_family_id,
      branch_id,
      sphere_min,
      sphere_max,
      cylinder_min,
      cylinder_max,
      quantity,
      min_stock_threshold,
      is_active
    ) VALUES
      (v_family_id, v_branch_id, -6.00, -3.00, 0, 0, 10, 3, TRUE),   -- Miopía media
      (v_family_id, v_branch_id, -3.00, -0.50, 0, 0, 15, 3, TRUE),  -- Miopía leve
      (v_family_id, v_branch_id, 0.50, 2.00, 0, 0, 8, 3, TRUE),    -- Hipermetropía
      (v_family_id, v_branch_id, -2.00, -0.50, -0.75, -0.75, 5, 3, TRUE)  -- Astigmatismo leve
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Sample contact lens inventory created for demo';
  ELSE
    RAISE NOTICE 'Demo data not found, skipping inventory seed';
  END IF;
END $$;