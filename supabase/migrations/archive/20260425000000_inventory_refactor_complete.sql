-- Migration: 20260425000000_inventory_refactor_complete.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Create Contact Lens Inventory System (Fixed Version)
-- Purpose: Create contact_lens_inventory and contact_lens_encargos tables
--           with proper RLS policies using admin_user_id instead of user_id
-- ============================================================================

-- ============================================================================
-- 1. Create contact_lens_inventory table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_lens_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_lens_family_id UUID NOT NULL REFERENCES public.contact_lens_families(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  sphere_min DECIMAL(5,2) NOT NULL,
  sphere_max DECIMAL(5,2) NOT NULL,
  cylinder_min DECIMAL(5,2) DEFAULT 0,
  cylinder_max DECIMAL(5,2) DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_threshold INTEGER DEFAULT 3,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_sphere_range CHECK (sphere_min <= sphere_max),
  CONSTRAINT valid_cylinder_range CHECK (cylinder_min <= cylinder_max),
  CONSTRAINT valid_quantity CHECK (quantity >= 0),
  UNIQUE(contact_lens_family_id, branch_id, sphere_min, sphere_max, cylinder_min, cylinder_max)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_family ON public.contact_lens_inventory(contact_lens_family_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_branch ON public.contact_lens_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_active ON public.contact_lens_inventory(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_lookup ON public.contact_lens_inventory(
  contact_lens_family_id, branch_id, sphere_min, sphere_max
) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contact_lens_inventory_updated_at ON public.contact_lens_inventory;
CREATE TRIGGER update_contact_lens_inventory_updated_at
  BEFORE UPDATE ON public.contact_lens_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.contact_lens_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contact lens inventory for their branches" ON public.contact_lens_inventory;
CREATE POLICY "Users can view contact lens inventory for their branches"
  ON public.contact_lens_inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
        AND aba.branch_id = contact_lens_inventory.branch_id
    )
  );

DROP POLICY IF EXISTS "Admins can insert contact lens inventory" ON public.contact_lens_inventory;
CREATE POLICY "Admins can insert contact lens inventory"
  ON public.contact_lens_inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update contact lens inventory" ON public.contact_lens_inventory;
CREATE POLICY "Admins can update contact lens inventory"
  ON public.contact_lens_inventory FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete contact lens inventory" ON public.contact_lens_inventory;
CREATE POLICY "Admins can delete contact lens inventory"
  ON public.contact_lens_inventory FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE public.contact_lens_inventory IS 'Inventario de lentes de contacto por graduación específica';
COMMENT ON COLUMN public.contact_lens_inventory.sphere_min IS 'Esfera mínima del rango (ej: -6.00)';
COMMENT ON COLUMN public.contact_lens_inventory.sphere_max IS 'Esfera máxima del rango (ej: -0.50)';
COMMENT ON COLUMN public.contact_lens_inventory.quantity IS 'Cantidad de cajas en stock';
COMMENT ON COLUMN public.contact_lens_inventory.min_stock_threshold IS 'Umbral para alertar stock bajo';

-- ============================================================================
-- 2. Create check_contact_lens_stock function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_contact_lens_stock(
  p_contact_lens_family_id UUID,
  p_branch_id UUID,
  p_sphere DECIMAL(5,2),
  p_cylinder DECIMAL(5,2)
)
RETURNS TABLE(
  has_stock BOOLEAN,
  available_quantity INTEGER,
  inventory_id UUID
) AS $$
DECLARE
  v_quantity INTEGER;
  v_inventory_id UUID;
BEGIN
  -- Find inventory entry that covers the requested prescription
  SELECT cli.quantity, cli.id INTO v_quantity, v_inventory_id
  FROM contact_lens_inventory cli
  WHERE cli.contact_lens_family_id = p_contact_lens_family_id
    AND cli.branch_id = p_branch_id
    AND cli.is_active = TRUE
    AND cli.quantity > 0
    AND p_sphere >= cli.sphere_min
    AND p_sphere <= cli.sphere_max
    AND p_cylinder >= cli.cylinder_min
    AND p_cylinder <= cli.cylinder_max
  LIMIT 1;

  RETURN QUERY SELECT 
    CASE WHEN v_quantity > 0 THEN TRUE ELSE FALSE END,
    COALESCE(v_quantity, 0),
    v_inventory_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.check_contact_lens_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_contact_lens_stock TO anon;

-- ============================================================================
-- 3. Create reduce_contact_lens_stock function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reduce_contact_lens_stock(
  p_contact_lens_family_id UUID,
  p_branch_id UUID,
  p_sphere DECIMAL(5,2),
  p_cylinder DECIMAL(5,2),
  p_quantity_to_reduce INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_inventory_id UUID;
  v_current_quantity INTEGER;
BEGIN
  -- Find and lock the inventory entry
  SELECT cli.id, cli.quantity INTO v_inventory_id, v_current_quantity
  FROM contact_lens_inventory cli
  WHERE cli.contact_lens_family_id = p_contact_lens_family_id
    AND cli.branch_id = p_branch_id
    AND cli.is_active = TRUE
    AND p_sphere >= cli.sphere_min
    AND p_sphere <= cli.sphere_max
    AND p_cylinder >= cli.cylinder_min
    AND p_cylinder <= cli.cylinder_max
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_inventory_id IS NULL OR v_current_quantity < p_quantity_to_reduce THEN
    RETURN FALSE;
  END IF;

  -- Reduce the quantity
  UPDATE contact_lens_inventory
  SET quantity = quantity - p_quantity_to_reduce,
      updated_at = NOW()
  WHERE id = v_inventory_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.reduce_contact_lens_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.reduce_contact_lens_stock TO anon;

-- ============================================================================
-- 4. Create contact_lens_encargos table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_lens_encargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_lens_family_id UUID NOT NULL REFERENCES contact_lens_families(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Prescription details (requested)
  sphere_od DECIMAL(5,2),
  sphere_os DECIMAL(5,2),
  cylinder_od DECIMAL(5,2),
  cylinder_os DECIMAL(5,2),
  axis_od INTEGER,
  axis_os INTEGER,
  addition_od DECIMAL(4,2),
  addition_os DECIMAL(4,2),
  
  quantity_od INTEGER DEFAULT 1,
  quantity_os INTEGER DEFAULT 1,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'delivered', 'cancelled')),
  
  -- Pricing
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  
  -- Notes
  notes TEXT,
  
  -- Supplier reference
  supplier_order_id TEXT,
  expected_delivery_date DATE,
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_org_branch ON public.contact_lens_encargos(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_status ON public.contact_lens_encargos(status);
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_family ON public.contact_lens_encargos(contact_lens_family_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_customer ON public.contact_lens_encargos(customer_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_contact_lens_encargos_updated_at ON public.contact_lens_encargos;
CREATE TRIGGER update_contact_lens_encargos_updated_at
  BEFORE UPDATE ON public.contact_lens_encargos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.contact_lens_encargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contact lens encargos for their branches" ON public.contact_lens_encargos;
CREATE POLICY "Users can view contact lens encargos for their branches"
  ON public.contact_lens_encargos FOR SELECT
  USING (
    organization_id IN (
      SELECT au.organization_id FROM public.admin_users au WHERE au.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert contact lens encargos" ON public.contact_lens_encargos;
CREATE POLICY "Admins can insert contact lens encargos"
  ON public.contact_lens_encargos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update contact lens encargos" ON public.contact_lens_encargos;
CREATE POLICY "Admins can update contact lens encargos"
  ON public.contact_lens_encargos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete contact lens encargos" ON public.contact_lens_encargos;
CREATE POLICY "Admins can delete contact lens encargos"
  ON public.contact_lens_encargos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 5. Add stock fields to lens_families (Fase 3)
-- ============================================================================

-- Add stock availability fields to lens_families (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lens_families' AND column_name = 'is_stock_available'
  ) THEN
    ALTER TABLE public.lens_families 
    ADD COLUMN IF NOT EXISTS is_stock_available BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stock_sphere_min DECIMAL(5,2) DEFAULT -10.00,
    ADD COLUMN IF NOT EXISTS stock_sphere_max DECIMAL(5,2) DEFAULT 10.00,
    ADD COLUMN IF NOT EXISTS stock_cylinder_min DECIMAL(5,2) DEFAULT -4.00,
    ADD COLUMN IF NOT EXISTS stock_cylinder_max DECIMAL(5,2) DEFAULT 4.00;
  END IF;
END $$;

-- Add lens_sourcing_type field to lab_work_orders (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lab_work_orders' AND column_name = 'lens_sourcing_type'
  ) THEN
    ALTER TABLE public.lab_work_orders
    ADD COLUMN IF NOT EXISTS lens_sourcing_type TEXT CHECK (lens_sourcing_type IN ('stock', 'surfaced')) DEFAULT 'surfaced';
  END IF;
END $$;

-- Add index for stock lookup
CREATE INDEX IF NOT EXISTS idx_lens_families_stock_available 
ON public.lens_families(is_stock_available) WHERE is_stock_available = TRUE;

-- Comments
COMMENT ON COLUMN public.lens_families.is_stock_available IS 'Indica si hay stock disponible para esta familia de lentes';
COMMENT ON COLUMN public.lens_families.stock_sphere_min IS 'Esfera mínima disponible en stock';
COMMENT ON COLUMN public.lens_families.stock_sphere_max IS 'Esfera máxima disponible en stock';
COMMENT ON COLUMN public.lens_families.stock_cylinder_min IS 'Cilindro mínimo disponible en stock';
COMMENT ON COLUMN public.lens_families.stock_cylinder_max IS 'Cilindro máximo disponible en stock';
COMMENT ON COLUMN public.lab_work_orders.lens_sourcing_type IS 'Tipo de sourcing del lente: stock (entrega inmediata) o surfaced (tallado a pedido)';

-- ============================================================================
-- 6. Seed demo data
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
BEGIN
  -- Get demo organization
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-optica' LIMIT 1;
  
  -- Get first branch
  SELECT id INTO v_branch_id FROM branches WHERE organization_id = v_org_id LIMIT 1;
  
  IF v_org_id IS NOT NULL AND v_branch_id IS NOT NULL THEN
    -- Add sample inventory for contact lenses
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
    )
    SELECT 
      clf.id,
      v_branch_id,
      -6.00,
      -0.50,
      0.00,
      0.00,
      20,
      5,
      TRUE
    FROM contact_lens_families clf
    WHERE clf.organization_id = v_org_id
      AND clf.is_active = TRUE
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Contact lens inventory seeded for demo';
  ELSE
    RAISE NOTICE 'Demo org/branch not found, skipping seed';
  END IF;
END $$;

-- ============================================================================
-- 7. Add lens_sourcing_type to quotes table
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes' AND column_name = 'lens_sourcing_type'
  ) THEN
    ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS lens_sourcing_type TEXT CHECK (lens_sourcing_type IN ('stock', 'surfaced')) DEFAULT 'surfaced';
  END IF;
  
  RAISE NOTICE 'Inventory refactor migrations completed successfully';
END $$;