-- Migration: 20250128000000_create_quote_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Quote Settings System
-- This migration creates a configuration system for customizing quote pricing and settings

-- ===== CREATE QUOTE SETTINGS TABLE =====
CREATE TABLE IF NOT EXISTS public.quote_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Treatment prices (in CLP)
  treatment_prices JSONB DEFAULT '{
    "anti_reflective": 15000,
    "blue_light_filter": 20000,
    "uv_protection": 10000,
    "scratch_resistant": 12000,
    "anti_fog": 8000,
    "photochromic": 35000,
    "polarized": 25000,
    "tint": 15000
  }'::jsonb,
  
  -- Base lens costs by type (in CLP)
  lens_type_base_costs JSONB DEFAULT '{
    "single_vision": 30000,
    "bifocal": 45000,
    "trifocal": 55000,
    "progressive": 60000,
    "reading": 25000,
    "computer": 35000,
    "sports": 40000
  }'::jsonb,
  
  -- Material multipliers (multiplies base cost)
  lens_material_multipliers JSONB DEFAULT '{
    "cr39": 1.0,
    "polycarbonate": 1.2,
    "high_index_1_67": 1.5,
    "high_index_1_74": 2.0,
    "trivex": 1.3,
    "glass": 0.9
  }'::jsonb,
  
  -- Default costs and margins
  default_labor_cost DECIMAL(10,2) DEFAULT 15000, -- Default mounting labor cost
  default_tax_percentage DECIMAL(5,2) DEFAULT 19.0, -- Default tax percentage (Chile IVA)
  default_expiration_days INTEGER DEFAULT 30, -- Default quote validity period
  default_margin_percentage DECIMAL(5,2) DEFAULT 0, -- Default profit margin percentage
  
  -- Volume discounts (optional)
  volume_discounts JSONB DEFAULT '[]'::jsonb, -- [{min_amount: 100000, discount_percentage: 5}, ...]
  
  -- Additional settings
  currency TEXT DEFAULT 'CLP',
  terms_and_conditions TEXT, -- Default terms and conditions for quotes
  notes_template TEXT, -- Default notes template
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create unique constraint to ensure only one settings record
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_settings_single ON public.quote_settings((1));

-- ===== CREATE TRIGGER TO UPDATE UPDATED_AT =====
CREATE TRIGGER update_quote_settings_updated_at
  BEFORE UPDATE ON public.quote_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quote_settings
CREATE POLICY "Admins can view quote settings" ON public.quote_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update quote settings" ON public.quote_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert quote settings" ON public.quote_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- ===== INSERT DEFAULT QUOTE SETTINGS =====
INSERT INTO public.quote_settings (
  treatment_prices,
  lens_type_base_costs,
  lens_material_multipliers,
  default_labor_cost,
  default_tax_percentage,
  default_expiration_days,
  default_margin_percentage,
  currency
) VALUES (
  '{
    "anti_reflective": 15000,
    "blue_light_filter": 20000,
    "uv_protection": 10000,
    "scratch_resistant": 12000,
    "anti_fog": 8000,
    "photochromic": 35000,
    "polarized": 25000,
    "tint": 15000
  }'::jsonb,
  '{
    "single_vision": 30000,
    "bifocal": 45000,
    "trifocal": 55000,
    "progressive": 60000,
    "reading": 25000,
    "computer": 35000,
    "sports": 40000
  }'::jsonb,
  '{
    "cr39": 1.0,
    "polycarbonate": 1.2,
    "high_index_1_67": 1.5,
    "high_index_1_74": 2.0,
    "trivex": 1.3,
    "glass": 0.9
  }'::jsonb,
  15000,
  19.0,
  30,
  0,
  'CLP'
) ON CONFLICT DO NOTHING;

-- ===== COMMENTS =====
COMMENT ON TABLE public.quote_settings IS 'Configuración de precios y parámetros para el sistema de presupuestos';
COMMENT ON COLUMN public.quote_settings.treatment_prices IS 'Precios de tratamientos y recubrimientos para lentes (en CLP)';
COMMENT ON COLUMN public.quote_settings.lens_type_base_costs IS 'Costos base de tipos de lentes (en CLP)';
COMMENT ON COLUMN public.quote_settings.lens_material_multipliers IS 'Multiplicadores de costo según material de lente';
COMMENT ON COLUMN public.quote_settings.default_labor_cost IS 'Costo de mano de obra por defecto para montaje';
COMMENT ON COLUMN public.quote_settings.default_tax_percentage IS 'Porcentaje de impuesto por defecto (IVA Chile)';
COMMENT ON COLUMN public.quote_settings.default_expiration_days IS 'Días de validez por defecto para presupuestos';
COMMENT ON COLUMN public.quote_settings.volume_discounts IS 'Descuentos por volumen: [{min_amount: 100000, discount_percentage: 5}]';

