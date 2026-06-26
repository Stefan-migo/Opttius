-- Migration: 20260126000001_update_get_min_deposit_for_branch.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update get_min_deposit function to use pos_settings with branch_id
-- This replaces organization_id with branch_id for branch-specific deposit configuration

-- Drop old function
DROP FUNCTION IF EXISTS public.get_min_deposit(DECIMAL, UUID);

-- Create updated function to use branch_id
CREATE OR REPLACE FUNCTION public.get_min_deposit(
  p_order_total DECIMAL(10,2),
  p_branch_id UUID DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_percent DECIMAL(5,2);
  v_min_amount DECIMAL(10,2);
  v_calculated DECIMAL(10,2);
BEGIN
  -- Get settings from pos_settings (if branch_id is NULL, use first/default settings)
  SELECT 
    COALESCE(min_deposit_percent, 50.00),
    COALESCE(min_deposit_amount, 0)
  INTO v_percent, v_min_amount
  FROM public.pos_settings
  WHERE (p_branch_id IS NULL OR branch_id = p_branch_id)
  LIMIT 1;
  
  -- If no settings found, use defaults
  IF v_percent IS NULL THEN
    v_percent := 50.00;
    v_min_amount := 0;
  END IF;
  
  -- Calcular depósito por porcentaje
  v_calculated := p_order_total * (v_percent / 100);
  
  -- Retornar el mayor entre porcentaje y monto fijo
  RETURN GREATEST(v_calculated, v_min_amount);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_min_deposit IS 'Calcula el depósito mínimo requerido basado en configuración de POS por sucursal';
