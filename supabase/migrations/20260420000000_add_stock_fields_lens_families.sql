-- ============================================================================
-- Migration: Add stock fields to lens_families for Stock vs Tallado feature
-- Purpose: Allow specifying which lens families have stock available vs require surfacing
-- ============================================================================

-- Add stock availability fields to lens_families
ALTER TABLE public.lens_families 
ADD COLUMN IF NOT EXISTS is_stock_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stock_sphere_min DECIMAL(5,2) DEFAULT -10.00,
ADD COLUMN IF NOT EXISTS stock_sphere_max DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS stock_cylinder_min DECIMAL(5,2) DEFAULT -4.00,
ADD COLUMN IF NOT EXISTS stock_cylinder_max DECIMAL(5,2) DEFAULT 4.00;

-- Add sourcing_type field to lab_work_orders
ALTER TABLE public.lab_work_orders
ADD COLUMN IF NOT EXISTS lens_sourcing_type TEXT CHECK (lens_sourcing_type IN ('stock', 'surfaced')) DEFAULT 'surfaced';

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
-- Seeder: Update demo lens families to include stock availability
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get demo organization
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-optica' LIMIT 1;
  
  IF v_org_id IS NOT NULL THEN
    -- Update some families to have stock available (for demo)
    UPDATE public.lens_families 
    SET 
      is_stock_available = TRUE,
      stock_sphere_min = -6.00,
      stock_sphere_max = 2.00,
      stock_cylinder_min = 0,
      stock_cylinder_max = -2.00
    WHERE name ILIKE '%cr39%single%vision%'
      AND organization_id = v_org_id;
    
    -- Update stock matrices to be marked as stock
    UPDATE public.lens_price_matrices
    SET sourcing_type = 'stock'
    WHERE lens_family_id IN (
      SELECT id FROM public.lens_families 
      WHERE organization_id = v_org_id 
        AND is_stock_available = TRUE
    );
    
    RAISE NOTICE 'Stock availability updated for demo lens families';
  ELSE
    RAISE NOTICE 'Demo organization not found, skipping stock seed';
  END IF;
END $$;
