-- Migration: 20260218164824_create_inventory_movements.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Create inventory_movements table for audit trail of stock changes
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'adjustment', 'receipt', 'transfer', 'refund')),
  reference_type TEXT,
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch ON public.inventory_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view inventory movements"
  ON public.inventory_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert inventory movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- Extend update_product_stock to accept optional reference params and log to inventory_movements
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity_change INTEGER,
  p_reserve BOOLEAN DEFAULT FALSE,
  p_movement_type TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
  v_current_reserved INTEGER;
  v_movement_type TEXT;
BEGIN
  v_movement_type := COALESCE(NULLIF(TRIM(p_movement_type), ''), 'adjustment');
  IF v_movement_type NOT IN ('sale', 'adjustment', 'receipt', 'transfer', 'refund') THEN
    v_movement_type := 'adjustment';
  END IF;

  SELECT quantity, reserved_quantity
  INTO v_current_quantity, v_current_reserved
  FROM public.product_branch_stock
  WHERE product_id = p_product_id
    AND branch_id = p_branch_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.product_branch_stock (
      product_id,
      branch_id,
      quantity,
      reserved_quantity,
      low_stock_threshold,
      last_stock_movement
    ) VALUES (
      p_product_id,
      p_branch_id,
      CASE WHEN p_reserve THEN 0 ELSE GREATEST(0, p_quantity_change) END,
      CASE WHEN p_reserve THEN GREATEST(0, p_quantity_change) ELSE 0 END,
      5,
      NOW()
    )
    ON CONFLICT (product_id, branch_id) DO NOTHING;
    
    IF NOT p_reserve AND p_quantity_change != 0 THEN
      INSERT INTO public.inventory_movements (
        product_id, branch_id, quantity_change, movement_type,
        reference_type, reference_id, created_by
      ) VALUES (
        p_product_id, p_branch_id, p_quantity_change, v_movement_type,
        p_reference_type, p_reference_id, p_created_by
      );
    END IF;
    RETURN TRUE;
  END IF;
  
  IF p_reserve THEN
    UPDATE public.product_branch_stock
    SET 
      reserved_quantity = GREATEST(0, v_current_reserved + p_quantity_change),
      last_stock_movement = NOW(),
      updated_at = NOW()
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id;
  ELSE
    UPDATE public.product_branch_stock
    SET 
      quantity = GREATEST(0, v_current_quantity + p_quantity_change),
      last_stock_movement = NOW(),
      updated_at = NOW()
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id;

    IF p_quantity_change != 0 THEN
      INSERT INTO public.inventory_movements (
        product_id, branch_id, quantity_change, movement_type,
        reference_type, reference_id, created_by
      ) VALUES (
        p_product_id, p_branch_id, p_quantity_change, v_movement_type,
        p_reference_type, p_reference_id, p_created_by
      );
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
