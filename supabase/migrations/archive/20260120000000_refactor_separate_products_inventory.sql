-- Migration: 20260120000000_refactor_separate_products_inventory.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Refactor - Separate Products and Inventory (Phase 1.1)
-- This migration implements the separation of product catalog from inventory
-- Following Plan V5.0: OPTTIUS - Phase 1.1
-- Date: 2026-01-20

-- ===== STEP 1: IMPROVE PRODUCT_BRANCH_STOCK TABLE =====
-- Add missing columns to match the new inventory structure

-- Add available_quantity as generated column (calculated from quantity - reserved_quantity)
ALTER TABLE public.product_branch_stock
  ADD COLUMN IF NOT EXISTS available_quantity INTEGER GENERATED ALWAYS AS (
    GREATEST(0, quantity - COALESCE(reserved_quantity, 0))
  ) STORED;

-- Add reorder_point column
ALTER TABLE public.product_branch_stock
  ADD COLUMN IF NOT EXISTS reorder_point INTEGER;

-- Add last_stock_movement timestamp
ALTER TABLE public.product_branch_stock
  ADD COLUMN IF NOT EXISTS last_stock_movement TIMESTAMPTZ;

-- Ensure quantity has NOT NULL constraint
ALTER TABLE public.product_branch_stock
  ALTER COLUMN quantity SET DEFAULT 0,
  ALTER COLUMN quantity SET NOT NULL;

-- Ensure reserved_quantity has NOT NULL constraint
ALTER TABLE public.product_branch_stock
  ALTER COLUMN reserved_quantity SET DEFAULT 0,
  ALTER COLUMN reserved_quantity SET NOT NULL;

-- ===== STEP 2: MIGRATE EXISTING DATA =====
-- Update last_stock_movement for existing records
UPDATE public.product_branch_stock
SET last_stock_movement = updated_at
WHERE last_stock_movement IS NULL;

-- ===== STEP 3: CREATE HELPER FUNCTION =====
-- Function to get product stock for a specific branch
CREATE OR REPLACE FUNCTION get_product_stock(
  p_product_id UUID,
  p_branch_id UUID
) RETURNS TABLE (
  quantity INTEGER,
  reserved_quantity INTEGER,
  available_quantity INTEGER,
  low_stock_threshold INTEGER,
  reorder_point INTEGER,
  is_low_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pbs.quantity,
    pbs.reserved_quantity,
    pbs.available_quantity,
    pbs.low_stock_threshold,
    pbs.reorder_point,
    (pbs.available_quantity <= pbs.low_stock_threshold) as is_low_stock
  FROM public.product_branch_stock pbs
  WHERE pbs.product_id = p_product_id
    AND pbs.branch_id = p_branch_id;
  
  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 5, NULL, false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ===== STEP 4: CREATE FUNCTION TO UPDATE STOCK =====
-- Function to update inventory when order is confirmed
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity_change INTEGER, -- Negative for decrease, positive for increase
  p_reserve BOOLEAN DEFAULT FALSE -- If true, updates reserved_quantity instead
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
  v_current_reserved INTEGER;
BEGIN
  -- Get current values
  SELECT quantity, reserved_quantity
  INTO v_current_quantity, v_current_reserved
  FROM public.product_branch_stock
  WHERE product_id = p_product_id
    AND branch_id = p_branch_id;
  
  -- If record doesn't exist, create it
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
    
    RETURN TRUE;
  END IF;
  
  -- Update stock
  IF p_reserve THEN
    -- Update reserved quantity
    UPDATE public.product_branch_stock
    SET 
      reserved_quantity = GREATEST(0, v_current_reserved + p_quantity_change),
      last_stock_movement = NOW(),
      updated_at = NOW()
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id;
  ELSE
    -- Update actual quantity
    UPDATE public.product_branch_stock
    SET 
      quantity = GREATEST(0, v_current_quantity + p_quantity_change),
      last_stock_movement = NOW(),
      updated_at = NOW()
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===== STEP 5: CREATE TRIGGER TO UPDATE last_stock_movement =====
-- Trigger function to automatically update last_stock_movement
CREATE OR REPLACE FUNCTION update_stock_movement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if quantity or reserved_quantity actually changed
  IF (OLD.quantity IS DISTINCT FROM NEW.quantity) OR 
     (OLD.reserved_quantity IS DISTINCT FROM NEW.reserved_quantity) THEN
    NEW.last_stock_movement = NOW();
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_stock_movement ON public.product_branch_stock;
CREATE TRIGGER trigger_update_stock_movement
  BEFORE UPDATE ON public.product_branch_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_movement_timestamp();

-- ===== STEP 6: CREATE INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_product_branch_stock_available 
  ON public.product_branch_stock(available_quantity);
CREATE INDEX IF NOT EXISTS idx_product_branch_stock_low_stock 
  ON public.product_branch_stock(branch_id, available_quantity) 
  WHERE available_quantity <= low_stock_threshold;

-- ===== STEP 7: PREPARE FOR REMOVAL OF INVENTORY COLUMNS FROM PRODUCTS =====
-- Note: We will NOT drop columns yet to avoid breaking existing code
-- Instead, we'll mark them as deprecated and update code first
-- The actual DROP will be done in a later migration after code is updated

-- Add comment to mark columns as deprecated
COMMENT ON COLUMN public.products.inventory_quantity IS 
  'DEPRECATED: Use product_branch_stock table instead. Will be removed in future migration.';
COMMENT ON COLUMN public.products.track_inventory IS 
  'DEPRECATED: Use product_branch_stock table instead. Will be removed in future migration.';
COMMENT ON COLUMN public.products.low_stock_threshold IS 
  'DEPRECATED: Use product_branch_stock table instead. Will be removed in future migration.';

-- ===== STEP 8: CREATE VIEW FOR BACKWARD COMPATIBILITY (TEMPORARY) =====
-- This view helps with migration by providing a compatibility layer
-- It will be removed once all code is updated
CREATE OR REPLACE VIEW products_with_stock AS
SELECT 
  p.*,
  COALESCE(
    (SELECT SUM(pbs.quantity) 
     FROM public.product_branch_stock pbs 
     WHERE pbs.product_id = p.id),
    0
  ) as total_inventory_quantity,
  COALESCE(
    (SELECT SUM(pbs.available_quantity) 
     FROM public.product_branch_stock pbs 
     WHERE pbs.product_id = p.id),
    0
  ) as total_available_quantity
FROM public.products p;

-- Grant access to the view
GRANT SELECT ON products_with_stock TO authenticated;
GRANT SELECT ON products_with_stock TO anon;

-- ===== STEP 9: ADD COMMENTS FOR DOCUMENTATION =====
COMMENT ON TABLE public.product_branch_stock IS 
  'Inventory table: Stock quantities per product and branch. This is the source of truth for inventory.';
COMMENT ON COLUMN public.product_branch_stock.quantity IS 
  'Total physical stock available at this branch';
COMMENT ON COLUMN public.product_branch_stock.reserved_quantity IS 
  'Stock reserved for pending orders/carts. Available = quantity - reserved_quantity';
COMMENT ON COLUMN public.product_branch_stock.available_quantity IS 
  'Calculated: quantity - reserved_quantity. Stock actually available for sale';
COMMENT ON COLUMN public.product_branch_stock.low_stock_threshold IS 
  'Alert threshold: when available_quantity <= this value, stock is considered low';
COMMENT ON COLUMN public.product_branch_stock.reorder_point IS 
  'Reorder point: when stock reaches this level, reorder should be triggered';
COMMENT ON COLUMN public.product_branch_stock.last_stock_movement IS 
  'Timestamp of last stock movement (increase or decrease)';

COMMENT ON FUNCTION get_product_stock(UUID, UUID) IS 
  'Get product stock information for a specific branch. Returns zeros if no record exists.';
COMMENT ON FUNCTION update_product_stock(UUID, UUID, INTEGER, BOOLEAN) IS 
  'Update product stock. Use negative quantity_change to decrease stock. Set reserve=true to update reserved_quantity instead.';
