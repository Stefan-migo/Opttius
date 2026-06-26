BEGIN;

-- ============================================================================
-- T-101: Función get_product_total_stock
-- Suma el stock total de un producto desde product_branch_stock
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_product_total_stock(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO v_total
  FROM public.product_branch_stock
  WHERE product_id = p_product_id;
  RETURN v_total;
END;
$$;

-- ============================================================================
-- T-102: Función get_product_variant_total_stock
-- Suma el stock total de una variante desde product_branch_stock
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_product_variant_total_stock(p_variant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO v_total
  FROM public.product_branch_stock
  WHERE variant_id = p_variant_id;
  RETURN v_total;
END;
$$;

COMMIT;
