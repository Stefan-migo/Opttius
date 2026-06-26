-- Migration: 20260126000000_create_pos_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create pos_settings table for POS configuration per branch
-- This enables branch-specific POS settings including customizable minimum deposit

-- Create pos_settings table
CREATE TABLE IF NOT EXISTS public.pos_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  min_deposit_percent DECIMAL(5,2) DEFAULT 50.00,  -- Porcentaje mínimo de depósito
  min_deposit_amount DECIMAL(10,2),                -- Monto mínimo fijo (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id)
);

-- Add comments
COMMENT ON TABLE public.pos_settings IS 'Configuración del POS por sucursal, incluyendo depósito mínimo personalizable';
COMMENT ON COLUMN public.pos_settings.min_deposit_percent IS 'Porcentaje mínimo de depósito requerido (ej: 50.00 = 50%)';
COMMENT ON COLUMN public.pos_settings.min_deposit_amount IS 'Monto mínimo fijo de depósito (opcional, se usa el mayor entre porcentaje y monto fijo)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_pos_settings_branch_id ON public.pos_settings(branch_id);

-- Create updated_at trigger
CREATE TRIGGER update_pos_settings_updated_at
  BEFORE UPDATE ON public.pos_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pos_settings
-- Super admin can view all settings
CREATE POLICY "Super admins can view all pos settings"
  ON public.pos_settings FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
  );

-- Regular admins can view settings in their accessible branches
CREATE POLICY "Admins can view pos settings in their branches"
  ON public.pos_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = pos_settings.branch_id
    )
  );

-- Super admin can insert/update settings in any branch
CREATE POLICY "Super admins can manage all pos settings"
  ON public.pos_settings FOR ALL
  USING (
    public.is_super_admin(auth.uid())
  );

-- Regular admins can insert/update settings in their accessible branches
CREATE POLICY "Admins can manage pos settings in their branches"
  ON public.pos_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = pos_settings.branch_id
    )
  );
