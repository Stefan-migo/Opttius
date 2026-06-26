-- Migration: 20260702000003_fix_inventory_generated_consumers
-- Fix consumers of products.inventory_quantity after GENERATED migration.
--
-- Problem:
--   Phase 3 (20260704000002) converted products.inventory_quantity to
--   GENERATED ALWAYS AS (get_product_total_stock(id)) STORED. Two consumers
--   broke:
--     1. decrement_inventory() wrote directly to products.inventory_quantity
--     2. notify_admin_low_stock trigger fired on products.inventory_quantity_legacy
--        but the old body still referenced inventory_quantity (now GENERATED)
--        without actually reacting to product_branch_stock changes.
--
-- Fixes:
--   Fix 1: decrement_inventory() now updates product_branch_stock directly
--   Fix 2: notify_admin_low_stock trigger moved to product_branch_stock
--          with rewritten function body using per-branch logic.
--
-- Rollback:
--   Re-create original decrement_inventory with UPDATE products SET inventory_quantity_legacy = ...
--   DROP trigger trigger_notify_low_stock ON product_branch_stock
--   Re-create trigger_notify_admin_low_stock ON products(inventory_quantity_legacy)
--   Re-create notify_admin_low_stock() with original body

BEGIN;

-- ============================================================================
-- Fix 1: decrement_inventory(pid, qty) → update product_branch_stock
-- ============================================================================

-- Drop first: signature changed internally (column-name conflict workaround)
DROP FUNCTION IF EXISTS public.decrement_inventory(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.decrement_inventory(p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- ponytail: no branch_id param — decrement from branch with most stock.
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_available
  FROM public.product_branch_stock
  WHERE product_id = p_product_id;

  IF v_available < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE public.product_branch_stock
  SET quantity = quantity - p_quantity
  WHERE id = (
    SELECT id FROM public.product_branch_stock
    WHERE product_id = p_product_id AND quantity >= p_quantity
    ORDER BY quantity DESC
    LIMIT 1
  );

  RETURN FOUND;
END;
$$;

-- ============================================================================
-- Fix 2: notify_admin_low_stock → move trigger to product_branch_stock
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_notify_admin_low_stock ON public.products;

CREATE OR REPLACE FUNCTION public.notify_admin_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_threshold INTEGER;
  v_product_name TEXT;
  v_product_slug TEXT;
  v_total_stock INTEGER;
BEGIN
  -- Skip if quantity didn't decrease
  IF NEW.quantity >= OLD.quantity THEN
    RETURN NEW;
  END IF;

  -- Get product info
  SELECT p.name, p.slug INTO v_product_name, v_product_slug
  FROM public.products p
  WHERE p.id = NEW.product_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Use row-level threshold or default to product low_stock_threshold / 5
  v_threshold := COALESCE(NEW.low_stock_threshold,
    (SELECT low_stock_threshold FROM public.products WHERE id = NEW.product_id),
    5);

  -- Trigger when stock drops below threshold or hits zero
  IF (OLD.quantity > v_threshold AND NEW.quantity <= v_threshold)
     OR (OLD.quantity > 0 AND NEW.quantity = 0) THEN

    SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_total_stock
    FROM public.product_branch_stock
    WHERE product_id = NEW.product_id;

    INSERT INTO public.admin_notifications (
      type, priority, title, message,
      related_entity_type, related_entity_id,
      action_url, action_label, metadata, created_by_system
    ) VALUES (
      CASE WHEN NEW.quantity = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
      CASE WHEN NEW.quantity = 0 THEN 'urgent' ELSE 'high' END,
      CASE WHEN NEW.quantity = 0 THEN 'Producto Agotado' ELSE 'Stock Bajo' END,
      v_product_name || CASE WHEN NEW.quantity = 0 THEN ' — Sin Stock en sucursal'
                             ELSE ' — ' || NEW.quantity::TEXT || ' unidades restantes en sucursal' END,
      'product', NEW.product_id,
      '/admin/products', 'Ver Producto',
      jsonb_build_object(
        'product_name', v_product_name,
        'current_stock', NEW.quantity,
        'total_stock', v_total_stock,
        'product_slug', v_product_slug
      ),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_low_stock
  AFTER UPDATE OF quantity ON public.product_branch_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_low_stock();

COMMIT;
