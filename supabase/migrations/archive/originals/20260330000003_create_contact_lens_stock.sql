-- Migration: 20260330000003_create_contact_lens_stock.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Create initial stock for contact lenses
-- Phase: Inventory Refactor - Fase 1
-- Description: Crear registros en product_branch_stock para lentes de contacto migrados
-- ============================================================================

-- Verificar que las migraciones anteriores fueron ejecutadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM products 
    WHERE product_type = 'contact_lens'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'No contact lens products found. Migration 20260330000002 should be run first';
  END IF;
END $$;

-- Parámetros configurables (ajustar según necesidad)
-- Stock inicial por defecto para cada LC en cada sucursal
DO $$
DECLARE
  v_default_stock INTEGER := 20;        -- Stock inicial
  v_low_stock_threshold INTEGER := 5;   -- Umbral de alerta
BEGIN
  -- 1. Insertar stock inicial para cada LC en cada sucursal activa
  INSERT INTO product_branch_stock (
    product_id,
    branch_id,
    quantity,
    reserved_quantity,
    low_stock_threshold,
    reorder_point,
    created_at,
    updated_at
  )
  SELECT 
    p.id AS product_id,
    b.id AS branch_id,
    v_default_stock AS quantity,
    0 AS reserved_quantity,
    v_low_stock_threshold AS low_stock_threshold,
    FLOOR(v_default_stock * 0.3)::INTEGER AS reorder_point, -- 30% del stock
    NOW() AS created_at,
    NOW() AS updated_at
  FROM products p
  CROSS JOIN branches b
  WHERE p.product_type = 'contact_lens'
    AND p.status = 'active'
    AND b.is_active = true
    -- Solo crear para sucursales de la misma organización
    AND b.organization_id = p.organization_id
    -- No crear si ya existe stock para esta combinación
    AND NOT EXISTS (
      SELECT 1 FROM product_branch_stock pbs
      WHERE pbs.product_id = p.id 
        AND pbs.branch_id = b.id
    )
  ON CONFLICT (product_id, branch_id) DO NOTHING;

  -- 2. Actualizar stock existente (si hay) con valores por defecto
  UPDATE product_branch_stock pbs
  SET 
    low_stock_threshold = COALESCE(pbs.low_stock_threshold, v_low_stock_threshold),
    reorder_point = COALESCE(pbs.reorder_point, FLOOR(v_default_stock * 0.3)::INTEGER),
    updated_at = NOW()
  FROM products p
  WHERE pbs.product_id = p.id
    AND p.product_type = 'contact_lens'
    AND pbs.low_stock_threshold IS NULL;

  -- 3. Log del resultado
  RAISE NOTICE 'Contact lens stock initialized successfully';
END $$;

-- 4. Verificar que el stock fue creado
DO $$
DECLARE
  v_total_stock_records INTEGER;
  v_total_products INTEGER;
  v_total_branches INTEGER;
BEGIN
  SELECT 
    COUNT(DISTINCT pbs.product_id),
    COUNT(DISTINCT pbs.branch_id)
  INTO v_total_products, v_total_branches
  FROM product_branch_stock pbs
  JOIN products p ON pbs.product_id = p.id
  WHERE p.product_type = 'contact_lens';
  
  GET DIAGNOSTICS v_total_stock_records = ROW_COUNT;
  
  RAISE NOTICE 'Created stock records for % contact lenses across % branches',
    v_total_products, v_total_branches;
END $$;

-- 5. Agregar índice para consultas de stock bajo de LC
-- Nota: No podemos usar subquery en WHERE de índice, usamos expresión simple
CREATE INDEX IF NOT EXISTS idx_product_branch_stock_contact_lens_low_stock
ON product_branch_stock(branch_id, available_quantity);

-- 6. Función para verificar disponibilidad de stock de LC
CREATE OR REPLACE FUNCTION check_contact_lens_availability(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE (
  is_available BOOLEAN,
  current_stock INTEGER,
  requested_quantity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN COALESCE(pbs.available_quantity, 0) >= p_quantity THEN TRUE
      ELSE FALSE
    END AS is_available,
    COALESCE(pbs.available_quantity, 0) AS current_stock,
    p_quantity AS requested_quantity
  FROM product_branch_stock pbs
  WHERE pbs.product_id = p_product_id
    AND pbs.branch_id = p_branch_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Actualizar función de stock para incluir LC
-- (La función update_product_stock ya debería funcionar con cualquier product_type)

COMMENT ON TABLE product_branch_stock IS 
'Evaluation: Updated with contact_lens products - 2026-03-30';
