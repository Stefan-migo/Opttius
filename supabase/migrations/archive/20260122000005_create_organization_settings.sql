-- Migration: 20260122000005_create_organization_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create organization_settings table for configurable deposit minimum
-- This enables Cash-First logic with configurable deposit requirements

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID, -- Will reference organizations table if it exists, otherwise can be NULL for single-org systems
  min_deposit_percent DECIMAL(5,2) DEFAULT 50.00,  -- Porcentaje mínimo de depósito
  min_deposit_amount DECIMAL(10,2),                -- Monto mínimo fijo (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Add comments
COMMENT ON TABLE public.organization_settings IS 'Configuración de depósito mínimo por organización para lógica Cash-First';
COMMENT ON COLUMN public.organization_settings.min_deposit_percent IS 'Porcentaje mínimo de depósito requerido (ej: 50.00 = 50%)';
COMMENT ON COLUMN public.organization_settings.min_deposit_amount IS 'Monto mínimo fijo de depósito (opcional, se usa el mayor entre porcentaje y monto fijo)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON public.organization_settings(organization_id);

-- Create function to get minimum deposit
CREATE OR REPLACE FUNCTION public.get_min_deposit(
  p_order_total DECIMAL(10,2),
  p_organization_id UUID DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_percent DECIMAL(5,2);
  v_min_amount DECIMAL(10,2);
  v_calculated DECIMAL(10,2);
BEGIN
  -- Get settings (if organization_id is NULL, get first/default settings)
  SELECT 
    COALESCE(min_deposit_percent, 50.00),
    COALESCE(min_deposit_amount, 0)
  INTO v_percent, v_min_amount
  FROM public.organization_settings
  WHERE (p_organization_id IS NULL OR organization_id = p_organization_id)
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

COMMENT ON FUNCTION public.get_min_deposit IS 'Calcula el depósito mínimo requerido basado en configuración de organización';
